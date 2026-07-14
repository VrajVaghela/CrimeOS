import logging
import uuid
import re
from datetime import datetime
from typing import Any

from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.models import Case, Complaint, ExtractedEntity, LegalRequest, ProviderResponse
from app.models.case_entity import CaseEntity, EntityRelationship
from app.models.enums import ProviderType

logger = logging.getLogger("crime_os.entity_service")


def clean_entity_value(entity_type: str, value: str) -> str:
    """Normalize and canonicalize an entity value for cross-matching."""
    val = value.strip()
    if not val:
        return ""

    if entity_type == "phone":
        # Remove all non-digits, and drop +91 or 91 country codes for standard 10-digit matching
        digits = re.sub(r"\D", "", val)
        if len(digits) > 10 and (digits.startswith("91") or digits.startswith("0")):
            # strip country prefix
            if digits.startswith("91"):
                digits = digits[2:]
            elif digits.startswith("0"):
                digits = digits[1:]
        return digits

    if entity_type == "bank_account":
        # Strip dashes, spaces, make uppercase
        return re.sub(r"[\s\-]", "", val).upper()

    if entity_type == "email":
        return val.lower()

    if entity_type == "ip":
        return val.strip()

    if entity_type == "person":
        # Standardize spaces and casing
        val = re.sub(r"\s+", " ", val)
        return val.title()

    return val


def sync_case_entities(db: Session, case_id: uuid.UUID) -> list[CaseEntity]:
    """Gather all raw mentions from complaints and provider responses,

    normalize them, write to case_entities, and infer relationships.
    """
    logger.info("Starting sync_case_entities for case_id=%s", case_id)

    # 1. Gather all ExtractedEntity records from case complaints
    complaints = db.scalars(
        select(Complaint).where(Complaint.case_id == case_id)
    ).all()
    complaint_ids = [c.id for c in complaints]

    raw_mentions: list[dict[str, Any]] = []

    if complaint_ids:
        raw_entities = db.scalars(
            select(ExtractedEntity).where(ExtractedEntity.complaint_id.in_(complaint_ids))
        ).all()
        for re_ent in raw_entities:
            raw_mentions.append({
                "type": re_ent.entity_type,
                "raw_value": re_ent.value,
                "confidence": re_ent.confidence,
                "source_type": "complaint",
                "source_id": re_ent.complaint_id,
            })

    # 2. Gather entities from parsed provider responses
    requests = db.scalars(
        select(LegalRequest).where(LegalRequest.case_id == case_id)
    ).all()
    request_ids = [r.id for r in requests]

    responses: list[ProviderResponse] = []
    if request_ids:
        responses = list(db.scalars(
            select(ProviderResponse).where(ProviderResponse.legal_request_id.in_(request_ids))
        ).all())

    for resp in responses:
        records = resp.parsed_data.get("records", [])
        req = db.get(LegalRequest, resp.legal_request_id)
        if not req:
            continue

        for rec in records:
            if req.provider_type == ProviderType.TELECOM:
                # Phone numbers or IMEIs
                for key in ["calling_number", "called_number"]:
                    if val := rec.get(key):
                        raw_mentions.append({
                            "type": "phone",
                            "raw_value": str(val),
                            "confidence": 1.0,
                            "source_type": "provider_response",
                            "source_id": resp.id,
                        })
                if imei := rec.get("imei"):
                    raw_mentions.append({
                        "type": "imei",
                        "raw_value": str(imei),
                        "confidence": 1.0,
                        "source_type": "provider_response",
                        "source_id": resp.id,
                    })

            elif req.provider_type == ProviderType.BANK:
                # Bank account numbers or IP addresses
                for key in ["source_account", "destination_account"]:
                    if val := rec.get(key):
                        raw_mentions.append({
                            "type": "bank_account",
                            "raw_value": str(val),
                            "confidence": 1.0,
                            "source_type": "provider_response",
                            "source_id": resp.id,
                        })
                if ip := rec.get("ip_address"):
                    raw_mentions.append({
                        "type": "ip",
                        "raw_value": str(ip),
                        "confidence": 1.0,
                        "source_type": "provider_response",
                        "source_id": resp.id,
                    })

            elif req.provider_type == ProviderType.PLATFORM:
                # Usernames, emails, IPs
                if username := rec.get("username"):
                    raw_mentions.append({
                        "type": "person",  # Map username/handle to person or keep standard
                        "raw_value": str(username),
                        "confidence": 1.0,
                        "source_type": "provider_response",
                        "source_id": resp.id,
                    })
                if email := rec.get("email"):
                    raw_mentions.append({
                        "type": "email",
                        "raw_value": str(email),
                        "confidence": 1.0,
                        "source_type": "provider_response",
                        "source_id": resp.id,
                    })
                if ip := rec.get("ip_address"):
                    raw_mentions.append({
                        "type": "ip",
                        "raw_value": str(ip),
                        "confidence": 1.0,
                        "source_type": "provider_response",
                        "source_id": resp.id,
                    })

    # 3. Normalize values and group
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for mention in raw_mentions:
        ent_type = mention["type"]
        canonical = clean_entity_value(ent_type, mention["raw_value"])
        if not canonical:
            continue
        key = (ent_type, canonical)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(mention)

    # 4. Update / Insert Case Entities
    existing_entities = db.scalars(
        select(CaseEntity).where(CaseEntity.case_id == case_id)
    ).all()
    existing_map = {(e.entity_type, e.canonical_value): e for e in existing_entities}

    active_ids = set()
    synced_entities = []

    for (ent_type, canonical), mentions in grouped.items():
        # Find display value (prefer the one with the highest confidence or first complaint)
        mentions.sort(key=lambda m: (m["source_type"] == "complaint", m["confidence"]), reverse=True)
        display = mentions[0]["raw_value"]

        # confidence is average confidence
        avg_conf = sum(m["confidence"] for m in mentions) / len(mentions)

        if (ent_type, canonical) in existing_map:
            ent = existing_map[(ent_type, canonical)]
            ent.display_value = display
            ent.confidence = avg_conf
            ent.last_seen_at = datetime.utcnow()
        else:
            ent = CaseEntity(
                case_id=case_id,
                entity_type=ent_type,
                canonical_value=canonical,
                display_value=display,
                confidence=avg_conf,
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow(),
            )
            db.add(ent)
            db.flush()

        active_ids.add(ent.id)
        synced_entities.append(ent)

    # Delete case entities that are no longer referenced (optional, but keep for consistency)
    for key, ent in existing_map.items():
        if ent.id not in active_ids:
            # First delete relationships pointing to it
            db.execute(
                delete(EntityRelationship).where(
                    (EntityRelationship.source_entity_id == ent.id) |
                    (EntityRelationship.target_entity_id == ent.id)
                )
            )
            db.delete(ent)

    db.flush()

    # 5. Build relationships automatically
    # Delete old relationships to re-build cleanly
    db.execute(delete(EntityRelationship).where(EntityRelationship.case_id == case_id))

    # Map for easy lookup by canonical key
    entity_id_map = {(e.entity_type, e.canonical_value): e.id for e in synced_entities}

    # Relationship A: Co-occurrence in complaint
    if complaint_ids:
        for comp in complaints:
            comp_entities = db.scalars(
                select(ExtractedEntity).where(ExtractedEntity.complaint_id == comp.id)
            ).all()
            # Link all pairs in the same complaint
            for i, ent_a in enumerate(comp_entities):
                key_a = (ent_a.entity_type, clean_entity_value(ent_a.entity_type, ent_a.value))
                id_a = entity_id_map.get(key_a)
                if not id_a:
                    continue
                for ent_b in comp_entities[i+1:]:
                    key_b = (ent_b.entity_type, clean_entity_value(ent_b.entity_type, ent_b.value))
                    id_b = entity_id_map.get(key_b)
                    if not id_b or id_a == id_b:
                        continue

                    # Create bidirectional or singular link
                    rel = EntityRelationship(
                        case_id=case_id,
                        source_entity_id=id_a,
                        target_entity_id=id_b,
                        relationship_type="co_occurrence",
                        confidence=min(ent_a.confidence, ent_b.confidence),
                        evidence_ref={"source_type": "complaint", "source_id": str(comp.id)},
                    )
                    db.add(rel)

    # Relationship B: Bank transactions
    for resp in responses:
        records = resp.parsed_data.get("records", [])
        req = db.get(LegalRequest, resp.legal_request_id)
        if not req or req.provider_type != ProviderType.BANK:
            continue

        for rec in records:
            src_acc = rec.get("source_account")
            dest_acc = rec.get("destination_account")
            txn_id = rec.get("transaction_id", "N/A")
            amount = rec.get("amount", "0")

            if src_acc and dest_acc:
                key_src = ("bank_account", clean_entity_value("bank_account", src_acc))
                key_dest = ("bank_account", clean_entity_value("bank_account", dest_acc))
                id_src = entity_id_map.get(key_src)
                id_dest = entity_id_map.get(key_dest)

                if id_src and id_dest and id_src != id_dest:
                    rel = EntityRelationship(
                        case_id=case_id,
                        source_entity_id=id_src,
                        target_entity_id=id_dest,
                        relationship_type="transaction",
                        confidence=1.0,
                        evidence_ref={
                            "source_type": "provider_response",
                            "source_id": str(resp.id),
                            "transaction_id": txn_id,
                            "amount": amount,
                        },
                    )
                    db.add(rel)

    # Relationship C: Telecom calls
    for resp in responses:
        records = resp.parsed_data.get("records", [])
        req = db.get(LegalRequest, resp.legal_request_id)
        if not req or req.provider_type != ProviderType.TELECOM:
            continue

        for rec in records:
            calling = rec.get("calling_number")
            called = rec.get("called_number")
            duration = rec.get("duration_sec", "0")
            ts = rec.get("timestamp", "")

            if calling and called:
                key_calling = ("phone", clean_entity_value("phone", calling))
                key_called = ("phone", clean_entity_value("phone", called))
                id_calling = entity_id_map.get(key_calling)
                id_called = entity_id_map.get(key_called)

                if id_calling and id_called and id_calling != id_called:
                    rel = EntityRelationship(
                        case_id=case_id,
                        source_entity_id=id_calling,
                        target_entity_id=id_called,
                        relationship_type="call",
                        confidence=1.0,
                        evidence_ref={
                            "source_type": "provider_response",
                            "source_id": str(resp.id),
                            "duration_sec": duration,
                            "timestamp": ts,
                        },
                    )
                    db.add(rel)

    db.flush()
    logger.info("Completed sync_case_entities for case_id=%s, entities_synced=%d", case_id, len(synced_entities))
    return synced_entities


def find_related_cases(db: Session, case_id: uuid.UUID) -> list[dict[str, Any]]:
    """Search other cases for matches on verified case_entities,

    returning the case and the matching entities/sources.
    """
    case_entities = db.scalars(
        select(CaseEntity).where(CaseEntity.case_id == case_id)
    ).all()

    related_cases_dict = {}

    for ent in case_entities:
        # Search other cases for matching canonical entity values
        matches = db.scalars(
            select(CaseEntity).where(
                (CaseEntity.case_id != case_id) &
                (CaseEntity.entity_type == ent.entity_type) &
                (CaseEntity.canonical_value == ent.canonical_value)
            )
        ).all()

        for m in matches:
            other_case = db.get(Case, m.case_id)
            if not other_case:
                continue

            if other_case.id not in related_cases_dict:
                related_cases_dict[other_case.id] = {
                    "case_id": str(other_case.id),
                    "case_number": other_case.case_number,
                    "title": other_case.title,
                    "status": other_case.status,
                    "matches": []
                }
            related_cases_dict[other_case.id]["matches"].append({
                "entity_type": ent.entity_type,
                "value": ent.display_value,
                "confidence": min(ent.confidence, m.confidence),
            })

    return list(related_cases_dict.values())
