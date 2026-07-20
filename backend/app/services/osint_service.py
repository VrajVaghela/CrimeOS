import hashlib
import logging
import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select, desc, delete
from sqlalchemy.orm import Session

from app.models import AuditEvent, CaseEntity, AiCitation
from app.models.osint import OsintScan, SocialProfile, DataBreach, OsintSnapshot
from app.services import audit_service

logger = logging.getLogger("crime_os.osint_service")

# Regex patterns for bio-parsing/footprint extraction
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_PATTERN = re.compile(r"\+?[0-9][0-9\s\-\.\(\)]{5,20}[0-9]")
ALIAS_PATTERN = re.compile(r"@([a-zA-Z0-9._-]{3,})")
LOCATION_PATTERN = re.compile(
    r"(?i)\b(India|Bangalore|Bengaluru|Mumbai|Delhi|New\s+York|NYC|London|UK|United\s+Kingdom|United\s+States|USA|US|Germany|Berlin|Australia|Sydney|Melbourne|Toronto|Canada)\b"
)
TIMEZONE_PATTERN = re.compile(
    r"(?i)\b(UTC[+-]\d{1,2}(?::\d{2})?|GMT[+-]\d{1,2}|EST|EDT|PST|PDT|CET|IST)\b"
)

TARGET_PLATFORMS = [
    {"name": "Instagram", "url_fmt": "https://www.instagram.com/{}"},
    {"name": "X/Twitter", "url_fmt": "https://x.com/{}"},
    {"name": "GitHub", "url_fmt": "https://github.com/{}"},
    {"name": "Reddit", "url_fmt": "https://www.reddit.com/user/{}"},
    {"name": "TikTok", "url_fmt": "https://www.tiktok.com/@{}"},
    {"name": "Facebook", "url_fmt": "https://www.facebook.com/{}"},
    {"name": "LinkedIn", "url_fmt": "https://www.linkedin.com/in/{}"},
    {"name": "Telegram", "url_fmt": "https://t.me/{}"},
    {"name": "YouTube", "url_fmt": "https://www.youtube.com/@{}"},
    {"name": "Pinterest", "url_fmt": "https://www.pinterest.com/{}"},
    {"name": "Snapchat", "url_fmt": "https://www.snapchat.com/add/{}"},
    {"name": "Discord", "url_fmt": "https://discord.com/users/{}"},
]

EMAIL_SERVICES = [
    "Spotify", "Netflix", "Amazon", "Dropbox", "Adobe",
    "Airbnb", "Pinterest", "Tumblr", "WordPress", "Gravatar",
    "Flickr", "Duolingo"
]

SEED_BREACHES = [
    {
        "name": "DataVault Leak 2021",
        "domain": "datavault.example.com",
        "leak_date": "2021-03-15",
        "exposed_data_classes": ["Emails", "Passwords", "Financial Credentials"],
        "record_count": 4200000,
        "source_note": "Credential dump found on paste site"
    },
    {
        "name": "ShopSphere Exposure 2020",
        "domain": "shopsphere.example.com",
        "leak_date": "2020-11-02",
        "exposed_data_classes": ["Emails", "Passwords", "Physical Address"],
        "record_count": 12500000,
        "source_note": "E-commerce platform database breach"
    },
    {
        "name": "HealthNet Breach 2022",
        "domain": "healthnet.example.org",
        "leak_date": "2022-06-18",
        "exposed_data_classes": ["Emails", "Phone Numbers", "Government ID", "Passwords"],
        "record_count": 890000,
        "source_note": "Healthcare records exposed via misconfigured API"
    },
    {
        "name": "SocialLink Dump 2019",
        "domain": "sociallink.example.net",
        "leak_date": "2019-08-22",
        "exposed_data_classes": ["Emails", "Dates of Birth", "IP Addresses"],
        "record_count": 35000000,
        "source_note": "Social networking site scraped data"
    },
    {
        "name": "PayStream Incident 2023",
        "domain": "paystream.example.com",
        "leak_date": "2023-01-09",
        "exposed_data_classes": ["Emails", "Financial Credentials", "Phone Numbers"],
        "record_count": 2100000,
        "source_note": "Payment processor insider breach"
    },
    {
        "name": "EduPortal Leak 2020",
        "domain": "eduportal.example.edu",
        "leak_date": "2020-04-30",
        "exposed_data_classes": ["Emails", "Passwords"],
        "record_count": 5600000,
        "source_note": "University portal credential leak"
    },
    {
        "name": "GameZone Hack 2021",
        "domain": "gamezone.example.com",
        "leak_date": "2021-12-01",
        "exposed_data_classes": ["Emails", "Passwords", "IP Addresses"],
        "record_count": 18000000,
        "source_note": "Gaming platform database compromise"
    },
    {
        "name": "TravelBuddy Breach 2022",
        "domain": "travelbuddy.example.com",
        "leak_date": "2022-09-14",
        "exposed_data_classes": ["Emails", "Phone Numbers", "Physical Address"],
        "record_count": 3400000,
        "source_note": "Travel booking platform data leak"
    },
    {
        "name": "CloudDrive Exposure 2023",
        "domain": "clouddrive.example.io",
        "leak_date": "2023-07-20",
        "exposed_data_classes": ["Emails", "IP Addresses"],
        "record_count": 7800000,
        "source_note": "Cloud storage metadata exposure"
    },
    {
        "name": "ForumTalk Dump 2018",
        "domain": "forumtalk.example.com",
        "leak_date": "2018-05-11",
        "exposed_data_classes": ["Emails", "Passwords"],
        "record_count": 1200000,
        "source_note": "Forum database dump posted online"
    },
    {
        "name": "MedSupply Leak 2021",
        "domain": "medsupply.example.com",
        "leak_date": "2021-10-05",
        "exposed_data_classes": ["Emails", "Physical Address", "Government ID"],
        "record_count": 450000,
        "source_note": "Medical supply vendor data leak"
    },
    {
        "name": "FinTrack Breach 2022",
        "domain": "fintrack.example.com",
        "leak_date": "2022-03-28",
        "exposed_data_classes": ["Emails", "Financial Credentials", "Passwords"],
        "record_count": 890000,
        "source_note": "Financial tracking app API breach"
    },
    {
        "name": "ChatWave Hack 2020",
        "domain": "chatwave.example.com",
        "leak_date": "2020-07-19",
        "exposed_data_classes": ["Emails", "Phone Numbers"],
        "record_count": 22000000,
        "source_note": "Messaging platform server compromise"
    },
    {
        "name": "JobHunt Exposure 2023",
        "domain": "jobhunt.example.com",
        "leak_date": "2023-11-03",
        "exposed_data_classes": ["Emails", "Dates of Birth"],
        "record_count": 6700000,
        "source_note": "Job portal candidate data exposure"
    }
]

BIOS = [
    "Digital explorer | Tech enthusiast",
    "Just a regular person on the internet",
    "Coffee addict & code writer",
    "Photography | Travel | Life",
    "Making the world a better place",
    "Student of life",
    "Professional overthinker",
    "Building things that matter"
]


def hash_deterministic(val: str, salt: str = "") -> int:
    """Helper to hash a string deterministically to a 64-bit integer."""
    h = hashlib.sha256(f"{val}:{salt}".encode("utf-8"))
    return int(h.hexdigest()[:16], 16)


def classify_breach_severity(data_classes: list[str]) -> str:
    """Classify breach severity based on exposed data classes."""
    has_passwords = "Passwords" in data_classes
    has_financial = "Financial Credentials" in data_classes
    has_gov_id = "Government ID" in data_classes
    has_phone = "Phone Numbers" in data_classes
    has_address = "Physical Address" in data_classes

    if has_passwords and (has_financial or has_gov_id):
        return "CRITICAL"
    if has_passwords:
        return "HIGH"
    if has_phone or has_address:
        return "MEDIUM"
    return "LOW"


def run_deterministic_sherlock(username: str) -> list[dict[str, Any]]:
    """Simulate Sherlock-style username scanner using deterministic hashing."""
    profiles = []
    for platform in TARGET_PLATFORMS:
        h_val = hash_deterministic(username, platform["name"])
        # ~60% match rate
        if h_val % 10 >= 6:
            continue

        profile_url = platform["url_fmt"].format(username)
        bio = BIOS[h_val % len(BIOS)]
        follower_count = int(h_val % 5000) + 10
        if h_val % 100 < 5:
            follower_count = int(h_val % 500000) + 50000  # outlier
        
        is_verified = (h_val % 100 < 3)
        confidence = "LIKELY"
        mod = h_val % 10
        if mod < 3:
            confidence = "CONFIRMED"
        elif mod >= 8:
            confidence = "UNCERTAIN"

        # Geo-hints
        location_hint = None
        timezone_hint = None
        if h_val % 5 == 0:
            location_hint = "India"
            timezone_hint = "IST"
        elif h_val % 5 == 1:
            location_hint = "New York"
            timezone_hint = "EST"

        pic_url = f"https://api.dicebear.com/7.x/initials/svg?seed={username}"

        profiles.append({
            "platform": platform["name"],
            "username": username,
            "profile_url": profile_url,
            "profile_picture_url": pic_url,
            "bio": bio,
            "location_hint": location_hint,
            "timezone_hint": timezone_hint,
            "follower_count": follower_count,
            "is_verified": is_verified,
            "exists_confidence": confidence
        })
    return profiles


def run_deterministic_holehe(email: str) -> list[dict[str, Any]]:
    """Simulate Holehe-style email registration check."""
    profiles = []
    for service in EMAIL_SERVICES:
        h_val = hash_deterministic(email, f"holehe:{service}")
        # ~50% match rate
        if h_val % 10 >= 5:
            continue

        confidence = "LIKELY"
        if h_val % 5 == 0:
            confidence = "UNCERTAIN"

        profiles.append({
            "platform": service,
            "username": email,
            "profile_url": "",  # Empty for email checks
            "profile_picture_url": None,
            "bio": None,
            "location_hint": None,
            "timezone_hint": None,
            "follower_count": None,
            "is_verified": False,
            "exists_confidence": confidence
        })
    return profiles


def run_deterministic_breach_lookup(identifier: str, ident_type: str) -> list[dict[str, Any]]:
    """Simulate HaveIBeenPwned-style breach database lookups."""
    breaches = []
    for seed in SEED_BREACHES:
        h_val = hash_deterministic(identifier, f"breach:{seed['name']}")
        # ~40% exposure rate
        if h_val % 10 >= 4:
            continue

        breaches.append({
            "breach_name": seed["name"],
            "breach_domain": seed["domain"],
            "leak_date": seed["leak_date"],
            "exposed_data_classes": seed["exposed_data_classes"],
            "record_count": seed["record_count"],
            "severity": classify_breach_severity(seed["exposed_data_classes"]),
            "source_note": seed["source_note"]
        })
    return breaches


def extract_bio_footprints(bio: str | None) -> list[dict[str, Any]]:
    """Parse bio text to identify pivot candidates."""
    if not bio:
        return []

    results = []
    seen = set()

    # Emails
    for email in EMAIL_PATTERN.findall(bio):
        normal = email.strip().lower()
        key = f"email:{normal}"
        if key not in seen:
            seen.add(key)
            results.append({
                "entity_type": "email",
                "raw_value": email,
                "normalized_value": normal,
                "confidence": 0.95,
                "source_field": "bio"
            })

    # Aliases
    for handle in ALIAS_PATTERN.findall(bio):
        normal = handle.strip().lower()
        key = f"person:{normal}"
        if key not in seen and len(normal) >= 3:
            seen.add(key)
            results.append({
                "entity_type": "person",
                "raw_value": f"@{handle}",
                "normalized_value": normal,
                "confidence": 0.80,
                "source_field": "bio"
            })

    # Phone numbers
    for phone in PHONE_PATTERN.findall(bio):
        # clean non-digits except +
        clean = "".join(c for c in phone if c.isdigit() or c == "+")
        if len(clean) >= 7:
            key = f"phone:{clean}"
            if key not in seen:
                seen.add(key)
                results.append({
                    "entity_type": "phone",
                    "raw_value": phone,
                    "normalized_value": clean,
                    "confidence": 0.85,
                    "source_field": "bio"
                })

    return results


def run_osint_scan_task(db: Session, scan_id: uuid.UUID) -> None:
    """Background task function to process an enqueued OSINT scan deterministically."""
    logger.info("Executing background OSINT scan task for scan_id=%s", scan_id)
    scan = db.get(OsintScan, scan_id)
    if not scan:
        logger.error("Scan ID %s not found in database", scan_id)
        return

    scan.status = "RUNNING"
    scan.started_at = datetime.utcnow()
    db.commit()

    try:
        profiles_to_insert = []
        breaches_to_insert = []

        val = scan.entity_value
        t = scan.entity_type.upper()

        if t in ("USERNAME", "SOCIAL_HANDLE", "PERSON"):
            mock_profiles = run_deterministic_sherlock(val)
            for mp in mock_profiles:
                p = SocialProfile(
                    scan_id=scan.id,
                    platform=mp["platform"],
                    username=mp["username"],
                    profile_url=mp["profile_url"],
                    profile_picture_url=mp["profile_picture_url"],
                    bio=mp["bio"],
                    location_hint=mp["location_hint"],
                    timezone_hint=mp["timezone_hint"],
                    follower_count=mp["follower_count"],
                    is_verified=mp["is_verified"],
                    exists_confidence=mp["exists_confidence"]
                )
                profiles_to_insert.append(p)

        elif t == "EMAIL":
            # Run Holehe
            mock_profiles = run_deterministic_holehe(val)
            for mp in mock_profiles:
                p = SocialProfile(
                    scan_id=scan.id,
                    platform=mp["platform"],
                    username=mp["username"],
                    profile_url=mp["profile_url"],
                    profile_picture_url=mp["profile_picture_url"],
                    bio=mp["bio"],
                    location_hint=mp["location_hint"],
                    timezone_hint=mp["timezone_hint"],
                    follower_count=mp["follower_count"],
                    is_verified=mp["is_verified"],
                    exists_confidence=mp["exists_confidence"]
                )
                profiles_to_insert.append(p)

            # Run breaches
            mock_breaches = run_deterministic_breach_lookup(val, "EMAIL")
            for mb in mock_breaches:
                b = DataBreach(
                    scan_id=scan.id,
                    breach_name=mb["breach_name"],
                    breach_domain=mb["breach_domain"],
                    leak_date=mb["leak_date"],
                    exposed_data_classes=mb["exposed_data_classes"],
                    record_count=mb["record_count"],
                    severity=mb["severity"],
                    source_note=mb["source_note"]
                )
                breaches_to_insert.append(b)

        elif t == "PHONE":
            # Run breaches
            mock_breaches = run_deterministic_breach_lookup(val, "PHONE")
            for mb in mock_breaches:
                b = DataBreach(
                    scan_id=scan.id,
                    breach_name=mb["breach_name"],
                    breach_domain=mb["breach_domain"],
                    leak_date=mb["leak_date"],
                    exposed_data_classes=mb["exposed_data_classes"],
                    record_count=mb["record_count"],
                    severity=mb["severity"],
                    source_note=mb["source_note"]
                )
                breaches_to_insert.append(b)

        # Save scan outcomes
        for p in profiles_to_insert:
            db.add(p)
        for b in breaches_to_insert:
            db.add(b)
        db.flush()

        # Compute Risk Summary
        total_breaches = len(breaches_to_insert)
        critical_breaches = sum(1 for b in breaches_to_insert if b.severity == "CRITICAL")
        has_critical = critical_breaches > 0
        has_high = any(b.severity == "HIGH" for b in breaches_to_insert)
        has_medium = any(b.severity == "MEDIUM" for b in breaches_to_insert)

        overall_risk = "LOW"
        if has_critical:
            overall_risk = "CRITICAL"
        elif has_high:
            overall_risk = "HIGH"
        elif has_medium or len(profiles_to_insert) >= 3:
            overall_risk = "MEDIUM"

        risk_summary = {
            "total_breaches": total_breaches,
            "critical_breaches": critical_breaches,
            "platforms_found": len(profiles_to_insert),
            "overall_risk_level": overall_risk
        }

        # Delta Tracking
        # Fetch previous snapshot profiles
        prev_profiles = []
        prev_snapshot = db.scalars(
            select(OsintSnapshot)
            .where((OsintSnapshot.entity_id == scan.entity_id) & (OsintSnapshot.created_at < scan.created_at))
            .order_by(desc(OsintSnapshot.created_at))
            .limit(1)
        ).first()

        if prev_snapshot:
            prev_profiles = prev_snapshot.snapshot_data.get("social_profiles", [])

        if prev_profiles:
            prev_by_key = {f"{p['platform']}:{p['username']}": p for p in prev_profiles}
            for p in profiles_to_insert:
                key = f"{p.platform}:{p.username}"
                if key in prev_by_key:
                    prior = prev_by_key[key]
                    if p.follower_count is not None and prior.get("follower_count") is not None:
                        p.follower_count_delta = p.follower_count - prior["follower_count"]
                    if p.bio != prior.get("bio"):
                        p.bio_changed = True
                    if p.location_hint != prior.get("location_hint"):
                        p.location_changed = True

        db.flush()

        # Save snapshot
        snapshot_data = {
            "scan": {
                "id": str(scan.id),
                "case_id": str(scan.case_id),
                "entity_id": str(scan.entity_id),
                "entity_type": scan.entity_type,
                "entity_value": scan.entity_value,
                "status": "COMPLETED",
                "started_at": scan.started_at.isoformat() if scan.started_at else None,
                "completed_at": datetime.utcnow().isoformat(),
            },
            "social_profiles": [
                {
                    "platform": p.platform,
                    "username": p.username,
                    "profile_url": p.profile_url,
                    "profile_picture_url": p.profile_picture_url,
                    "bio": p.bio,
                    "location_hint": p.location_hint,
                    "timezone_hint": p.timezone_hint,
                    "follower_count": p.follower_count,
                    "follower_count_delta": p.follower_count_delta,
                    "bio_changed": p.bio_changed,
                    "location_changed": p.location_changed,
                    "is_verified": p.is_verified,
                    "exists_confidence": p.exists_confidence,
                }
                for p in profiles_to_insert
            ],
            "breaches": [
                {
                    "breach_name": b.breach_name,
                    "breach_domain": b.breach_domain,
                    "leak_date": b.leak_date,
                    "exposed_data_classes": b.exposed_data_classes,
                    "record_count": b.record_count,
                    "severity": b.severity,
                    "source_note": b.source_note,
                }
                for b in breaches_to_insert
            ],
            "risk_summary": risk_summary
        }

        snapshot = OsintSnapshot(
            scan_id=scan.id,
            case_id=scan.case_id,
            entity_id=scan.entity_id,
            snapshot_data=snapshot_data
        )
        db.add(snapshot)

        # Extract Discovered Footprints (Pivots)
        pivots_found = 0
        for p in profiles_to_insert:
            candidates = extract_bio_footprints(p.bio)
            for cand in candidates:
                cand_type = cand["entity_type"]
                cand_val = cand["raw_value"]
                cand_norm = cand["normalized_value"]

                # Check if entity already exists in this case
                existing_entity = db.scalars(
                    select(CaseEntity).where(
                        (CaseEntity.case_id == scan.case_id) &
                        (CaseEntity.entity_type == cand_type) &
                        (CaseEntity.canonical_value == cand_norm)
                    )
                ).first()

                if not existing_entity:
                    # Insert unconfirmed entity
                    pivot_ent = CaseEntity(
                        case_id=scan.case_id,
                        entity_type=cand_type,
                        canonical_value=cand_norm,
                        display_value=cand_val,
                        confidence=cand["confidence"],
                        status="unconfirmed",
                    )
                    db.add(pivot_ent)
                    db.flush()

                    # Save AiCitation
                    citation = AiCitation(
                        case_id=scan.case_id,
                        output_type="case_entity",
                        output_id=pivot_ent.id,
                        source_type="osint_scan",
                        source_id=str(scan.id),
                        excerpt=f"Extracted from {p.platform} bio: \"{p.bio}\"",
                        locator=f"{p.platform}:bio",
                        confidence=cand["confidence"]
                    )
                    db.add(citation)
                    pivots_found += 1

        # Mark completed
        scan.status = "COMPLETED"
        scan.completed_at = datetime.utcnow()
        db.commit()

        # Audit
        audit_service.record(
            db,
            case_id=scan.case_id,
            user_id=None,  # run by background task
            action="osint_scan_completed",
            detail={
                "scan_id": str(scan.id),
                "entity_id": str(scan.entity_id),
                "entity_type": scan.entity_type,
                "entity_value": scan.entity_value,
                "profiles_found": len(profiles_to_insert),
                "breaches_found": len(breaches_to_insert),
                "pivots_found": pivots_found,
                "overall_risk_level": overall_risk
            }
        )

        logger.info("Successfully completed OSINT scan task for scan_id=%s", scan_id)

    except Exception as exc:
        db.rollback()
        logger.error("OSINT scan failed for scan_id=%s: %s", scan_id, exc, exc_info=True)
        scan = db.get(OsintScan, scan_id)
        if scan:
            scan.status = "FAILED"
            scan.completed_at = datetime.utcnow()
            scan.error_message = str(exc)
            db.commit()

            audit_service.record(
                db,
                case_id=scan.case_id,
                user_id=None,
                action="osint_scan_failed",
                detail={
                    "scan_id": str(scan.id),
                    "entity_id": str(scan.entity_id),
                    "error": str(exc)
                }
            )


def enqueue_osint_scan(db: Session, case_id: uuid.UUID, entity_id: uuid.UUID, entity_type: str, entity_value: str) -> OsintScan:
    """Enqueue a new scan row in PENDING state."""
    # Delete old scan rows if they exist to start fresh
    db.execute(delete(SocialProfile).where(SocialProfile.scan_id.in_(
        select(OsintScan.id).where(OsintScan.entity_id == entity_id)
    )))
    db.execute(delete(DataBreach).where(DataBreach.scan_id.in_(
        select(OsintScan.id).where(OsintScan.entity_id == entity_id)
    )))
    db.execute(delete(OsintSnapshot).where(OsintSnapshot.entity_id == entity_id))
    db.execute(delete(OsintScan).where(OsintScan.entity_id == entity_id))

    scan = OsintScan(
        case_id=case_id,
        entity_id=entity_id,
        entity_type=entity_type,
        entity_value=entity_value,
        status="PENDING"
    )
    db.add(scan)
    db.commit()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=None,
        action="osint_scan_enqueued",
        detail={
            "scan_id": str(scan.id),
            "entity_id": str(entity_id),
            "entity_type": entity_type,
            "entity_value": entity_value
        }
    )
    return scan


def get_full_osint_result(db: Session, entity_id: uuid.UUID) -> dict[str, Any] | None:
    """Fetch the latest scan results for an entity including profiles, breaches, risk summary, and unconfirmed pivots."""
    scan = db.scalars(
        select(OsintScan).where(OsintScan.entity_id == entity_id).order_by(desc(OsintScan.created_at)).limit(1)
    ).first()

    if not scan:
        return None

    # Fetch profiles
    profiles = db.scalars(
        select(SocialProfile).where(SocialProfile.scan_id == scan.id).order_by(SocialProfile.platform)
    ).all()

    # Fetch breaches
    breaches = db.scalars(
        select(DataBreach).where(DataBreach.scan_id == scan.id).order_by(desc(DataBreach.severity))
    ).all()

    # Fetch unconfirmed pivots (we can find these via AiCitations generated by this scan)
    pivot_citations = db.scalars(
        select(AiCitation).where(
            (AiCitation.source_type == "osint_scan") &
            (AiCitation.source_id == str(scan.id)) &
            (AiCitation.output_type == "case_entity")
        )
    ).all()

    pivots = []
    for cit in pivot_citations:
        ent = db.get(CaseEntity, cit.output_id)
        if ent and ent.status == "unconfirmed":
            pivots.append({
                "entity_id": str(ent.id),
                "entity_type": ent.entity_type,
                "display_value": ent.display_value,
                "confidence": ent.confidence,
                "source_field": cit.locator.split(":")[1] if cit.locator and ":" in cit.locator else "bio",
                "source_snippet": cit.excerpt
            })

    # Compute risk summary
    total_breaches = len(breaches)
    critical_breaches = sum(1 for b in breaches if b.severity == "CRITICAL")
    has_critical = critical_breaches > 0
    has_high = any(b.severity == "HIGH" for b in breaches)
    has_medium = any(b.severity == "MEDIUM" for b in breaches)

    overall_risk = "LOW"
    if has_critical:
        overall_risk = "CRITICAL"
    elif has_high:
        overall_risk = "HIGH"
    elif has_medium or len(profiles) >= 3:
        overall_risk = "MEDIUM"

    risk_summary = {
        "total_breaches": total_breaches,
        "critical_breaches": critical_breaches,
        "platforms_found": len(profiles),
        "overall_risk_level": overall_risk
    }

    return {
        "scan": {
            "id": str(scan.id),
            "case_id": str(scan.case_id),
            "entity_id": str(scan.entity_id),
            "entity_type": scan.entity_type,
            "entity_value": scan.entity_value,
            "status": scan.status,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "error_message": scan.error_message,
            "created_at": scan.created_at.isoformat(),
            "updated_at": scan.updated_at.isoformat(),
        },
        "social_profiles": [
            {
                "platform": p.platform,
                "username": p.username,
                "profile_url": p.profile_url,
                "profile_picture_url": p.profile_picture_url,
                "bio": p.bio,
                "location_hint": p.location_hint,
                "timezone_hint": p.timezone_hint,
                "follower_count": p.follower_count,
                "follower_count_delta": p.follower_count_delta,
                "bio_changed": p.bio_changed,
                "location_changed": p.location_changed,
                "is_verified": p.is_verified,
                "exists_confidence": p.exists_confidence,
            }
            for p in profiles
        ],
        "breaches": [
            {
                "breach_name": b.breach_name,
                "breach_domain": b.breach_domain,
                "leak_date": b.leak_date,
                "exposed_data_classes": b.exposed_data_classes,
                "record_count": b.record_count,
                "severity": b.severity,
                "source_note": b.source_note,
            }
            for b in breaches
        ],
        "risk_summary": risk_summary,
        "discovered_footprints": pivots
    }


def generate_dossier_report(result: dict[str, Any]) -> str:
    """Generate a text report for the dossier."""
    scan = result["scan"]
    summary = result["risk_summary"]
    profiles = result["social_profiles"]
    breaches = result["breaches"]
    pivots = result["discovered_footprints"]

    # Simple checksum-like hash for report integrity
    h = hashlib.sha256(f"{scan['id']}:{scan['completed_at']}".encode("utf-8"))
    report_hash = f"SHA256_{scan['id'][:8]}_{h.hexdigest()[:16].upper()}"

    lines = []
    lines.append("=" * 80)
    lines.append("                       OSINT DIGITAL FOOTPRINT DOSSIER")
    lines.append("=" * 80)
    lines.append("")
    lines.append(f"Generated:     {datetime.utcnow().isoformat()}Z")
    lines.append(f"Case ID:       {scan['case_id']}")
    lines.append(f"Entity ID:     {scan['entity_id']}")
    lines.append(f"Subject:       {scan['entity_value']} ({scan['entity_type']})")
    lines.append(f"Scan ID:       {scan['id']}")
    lines.append("")
    lines.append("-" * 80)
    lines.append("RISK SUMMARY")
    lines.append("-" * 80)
    lines.append(f"Overall Risk Level:    {summary['overall_risk_level']}")
    lines.append(f"Profiles Found:        {summary['platforms_found']}")
    lines.append(f"Breaches Identified:   {summary['total_breaches']}")
    lines.append(f"Critical Breaches:     {summary['critical_breaches']}")
    lines.append("")

    if profiles:
        lines.append("-" * 80)
        lines.append("CONFIRMED SOCIAL PROFILES")
        lines.append("-" * 80)
        for i, p in enumerate(profiles, 1):
            lines.append(f"[{i}] {p['platform']} (@{p['username']})")
            lines.append(f"    URL:           {p['profile_url'] or 'N/A'}")
            lines.append(f"    Verified:      {p['is_verified']}")
            lines.append(f"    Followers:     {p['follower_count'] or 0}")
            if p['location_hint']:
                lines.append(f"    Location Hint: {p['location_hint']}")
            if p['timezone_hint']:
                lines.append(f"    Timezone Hint: {p['timezone_hint']}")
            if p['bio']:
                lines.append(f"    Bio:           {p['bio']}")
            if p['follower_count_delta'] is not None and p['follower_count_delta'] != 0:
                change = "increased" if p['follower_count_delta'] > 0 else "decreased"
                lines.append(f"    Delta:         Followers {change} by {abs(p['follower_count_delta'])}")
            if p['bio_changed']:
                lines.append("    Change Flag:   Bio updated recently")
            if p['location_changed']:
                lines.append("    Change Flag:   Location changed recently")
            lines.append("")

    if breaches:
        lines.append("-" * 80)
        lines.append("DATA BREACH EXPOSURE")
        lines.append("-" * 80)
        for i, b in enumerate(breaches, 1):
            lines.append(f"[{i}] {b['breach_name']}")
            lines.append(f"    Severity:      {b['severity']}")
            if b['breach_domain']:
                lines.append(f"    Domain:        {b['breach_domain']}")
            if b['leak_date']:
                lines.append(f"    Leak Date:     {b['leak_date']}")
            lines.append(f"    Records:       {b['record_count']}")
            lines.append(f"    Data Classes:  {', '.join(b['exposed_data_classes'])}")
            if b['source_note']:
                lines.append(f"    Source Note:   {b['source_note']}")
            lines.append("")

    if pivots:
        lines.append("-" * 80)
        lines.append("AI-DISCOVERED FOOTPRINTS (Unconfirmed)")
        lines.append("-" * 80)
        for i, f in enumerate(pivots, 1):
            lines.append(f"[{i}] {f['entity_type']}: {f['display_value']}")
            lines.append(f"    Confidence:    {int(f['confidence'] * 100)}%")
            lines.append(f"    Source Field:  {f['source_field']}")
            lines.append(f"    Source Snippet: {f['source_snippet']}")
            lines.append("")

    lines.append("=" * 80)
    lines.append("REPORT INTEGRITY")
    lines.append("=" * 80)
    lines.append(f"Report Hash:   {report_hash}")
    lines.append("Generated by:  CrimeOS OSINT Module")
    lines.append("Classification: Law Enforcement Sensitive")
    lines.append("")
    lines.append("This report is automatically generated. Unauthorized distribution is prohibited.")
    lines.append("=" * 80)

    return "\n".join(lines)


def trigger_scan_async(scan_id: uuid.UUID) -> None:
    """Helper to trigger an OSINT scan asynchronously in a new thread."""
    import threading
    from app.database import SessionLocal

    def _target():
        db = SessionLocal()
        try:
            run_osint_scan_task(db, scan_id)
        except Exception as e:
            logger.error("Error running async OSINT scan in thread: %s", e)
        finally:
            db.close()

    threading.Thread(target=_target, daemon=True).start()

