import csv
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import gemini_client
from app.ai.prompts import INSIGHT_GENERATION_PROMPT
from app.config import settings
from app.exceptions import NotFoundError, AppError
from app.models import Case, Complaint, ExtractedEntity, LegalRequest, ProviderResponse
from app.models.enums import ProviderType, RequestStatus
from app.services import audit_service

logger = logging.getLogger("crime_os.analytics")


def get_response_by_request(db: Session, request_id: uuid.UUID) -> ProviderResponse:
    res = db.scalar(
        select(ProviderResponse).where(ProviderResponse.legal_request_id == request_id)
    )
    if not res:
        raise NotFoundError("Provider response not found")
    return res


def get_responses_by_case(db: Session, case_id: uuid.UUID) -> list[ProviderResponse]:
    requests = db.scalars(
        select(LegalRequest).where(LegalRequest.case_id == case_id)
    ).all()
    if not requests:
        return []

    request_ids = [r.id for r in requests]
    return list(db.scalars(
        select(ProviderResponse).where(ProviderResponse.legal_request_id.in_(request_ids))
    ))


def _build_ai_insights(
    db: Session,
    *,
    case_title: str,
    crime_type: str | None,
    provider_type: str,
    provider_name: str,
    records: list[dict[str, Any]],
    response_id: uuid.UUID,
) -> str:
    """Call Gemini to generate intelligence insights from provider records."""
    record_count = len(records)
    # Send up to 20 rows to avoid token bloat
    sample = records[:20]
    records_sample = json.dumps(sample, ensure_ascii=False, indent=2)
    case_context = f"Case: {case_title} | Crime type: {crime_type or 'Unknown'}"

    prompt = INSIGHT_GENERATION_PROMPT.format(
        case_context=case_context,
        provider_type=provider_type,
        provider_name=provider_name,
        record_count=record_count,
        records_sample=records_sample,
    )

    try:
        insights = gemini_client.generate_text(
            db,
            purpose=f"analytics_insights_{response_id}",
            prompt=prompt,
        )
        return insights
    except Exception as exc:
        logger.warning("insight_generation_failed response_id=%s error=%s", response_id, exc)
        return (
            f"Auto-analysis: {record_count} records received from {provider_name} "
            f"({provider_type}). Manual review required. "
            f"Automated Gemini insight generation encountered an error — fallback message displayed."
        )


def regenerate_insights(db: Session, response_id: uuid.UUID) -> ProviderResponse:
    """Regenerate AI insights for an existing provider response."""
    response = db.get(ProviderResponse, response_id)
    if not response:
        raise NotFoundError("Provider response not found")

    request = db.get(LegalRequest, response.legal_request_id)
    if not request:
        raise NotFoundError("Associated legal request not found")

    case = db.get(Case, request.case_id)
    if not case:
        raise NotFoundError("Associated case not found")

    records = response.parsed_data.get("records", [])
    insights = _build_ai_insights(
        db,
        case_title=case.title,
        crime_type=case.crime_type,
        provider_type=request.provider_type.value,
        provider_name=request.provider_name,
        records=records,
        response_id=response_id,
    )

    response.ai_insights = insights
    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=None,
        action="insights_regenerated",
        detail={"response_id": str(response_id)},
    )
    db.commit()
    db.refresh(response)
    return response


def generate_mock_response(db: Session, request_id: uuid.UUID) -> ProviderResponse:
    request = db.get(LegalRequest, request_id)
    if not request:
        raise NotFoundError("Legal request not found")

    if request.status != RequestStatus.DISPATCHED:
        raise AppError("Can only generate mock responses for dispatched requests")

    case = db.get(Case, request.case_id)
    if not case:
        raise NotFoundError("Associated case not found")

    complaints = list(db.scalars(
        select(Complaint).where(Complaint.case_id == request.case_id)
    ))
    complaint_ids = [c.id for c in complaints]

    entities = []
    if complaint_ids:
        entities = list(db.scalars(
            select(ExtractedEntity).where(ExtractedEntity.complaint_id.in_(complaint_ids))
        ))

    case_dir = os.path.join(settings.UPLOAD_DIR, str(request.case_id))
    os.makedirs(case_dir, exist_ok=True)

    file_name = f"response_{request_id}.csv"
    file_path = os.path.join(case_dir, file_name)
    relative_path = f"uploads/{request.case_id}/{file_name}"

    records: list[dict[str, Any]] = []
    headers: list[str] = []

    if request.provider_type == ProviderType.TELECOM:
        target_phone = next((e.value for e in entities if e.entity_type == "phone"), "+919876543210")

        headers = ["timestamp", "calling_number", "called_number", "duration_sec", "cell_id", "imei"]
        records = [
            {
                "timestamp": "2026-07-06T10:15:30Z",
                "calling_number": target_phone,
                "called_number": "+918888888888",
                "duration_sec": "145",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910",
            },
            {
                "timestamp": "2026-07-06T11:02:15Z",
                "calling_number": target_phone,
                "called_number": "+917777777777",
                "duration_sec": "62",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910",
            },
            {
                "timestamp": "2026-07-06T12:45:00Z",
                "calling_number": target_phone,
                "called_number": "+918888888888",
                "duration_sec": "320",
                "cell_id": "MUM-T2-C1",
                "imei": "863920040582910",
            },
            {
                "timestamp": "2026-07-06T14:10:45Z",
                "calling_number": "+919999999999",
                "called_number": target_phone,
                "duration_sec": "45",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910",
            },
        ]

    elif request.provider_type == ProviderType.BANK:
        target_account = next((e.value for e in entities if e.entity_type == "bank_account"), "AC-1234567890")
        target_txn = next((e.value for e in entities if e.entity_type == "transaction_id"), "TXN10001")
        target_amount = next((e.value for e in entities if e.entity_type == "amount"), "50000.00")

        headers = ["timestamp", "transaction_id", "source_account", "destination_account", "amount", "status", "ip_address"]
        records = [
            {
                "timestamp": "2026-07-06T09:30:00Z",
                "transaction_id": target_txn,
                "source_account": "AC-998822",
                "destination_account": target_account,
                "amount": target_amount,
                "status": "SUCCESS",
                "ip_address": "103.88.22.14",
            },
            {
                "timestamp": "2026-07-06T10:10:00Z",
                "transaction_id": "TXN10002",
                "source_account": target_account,
                "destination_account": "AC-887766",
                "amount": "45000.00",
                "status": "SUCCESS",
                "ip_address": "103.88.22.14",
            },
            {
                "timestamp": "2026-07-06T10:15:00Z",
                "transaction_id": "TXN10003",
                "source_account": "AC-887766",
                "destination_account": "AC-554433",
                "amount": "40000.00",
                "status": "SUCCESS",
                "ip_address": "192.168.1.1",
            },
        ]

    elif request.provider_type == ProviderType.PLATFORM:
        target_user = next((e.value for e in entities if e.entity_type == "person"), "suspect_profile")
        target_email = next((e.value for e in entities if e.entity_type == "email"), "fraudster@gmail.com")

        headers = ["timestamp", "username", "email", "ip_address", "action"]
        records = [
            {
                "timestamp": "2026-07-06T08:00:00Z",
                "username": target_user,
                "email": target_email,
                "ip_address": "103.88.22.14",
                "action": "login",
            },
            {
                "timestamp": "2026-07-06T09:30:00Z",
                "username": target_user,
                "email": target_email,
                "ip_address": "103.88.22.14",
                "action": "update_profile",
            },
        ]

    # Write CSV
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(records)

    # Create ProviderResponse record first (need ID for Gemini cache key)
    response_record = ProviderResponse(
        legal_request_id=request_id,
        received_at=datetime.utcnow(),
        file_path=relative_path,
        parsed_data={"records": records},
        ai_insights="Generating insights...",  # Placeholder, will be updated below
    )
    db.add(response_record)
    db.flush()  # Flush to get the ID

    # Generate Gemini insights
    ai_insights = _build_ai_insights(
        db,
        case_title=case.title,
        crime_type=case.crime_type,
        provider_type=request.provider_type.value,
        provider_name=request.provider_name,
        records=records,
        response_id=response_record.id,
    )
    response_record.ai_insights = ai_insights

    # Update request status to RESPONDED
    request.status = RequestStatus.RESPONDED

    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=None,
        action="response_received",
        detail={
            "request_id": str(request_id),
            "response_id": str(response_record.id),
            "provider_type": request.provider_type.value,
            "records_count": len(records),
        },
    )

    try:
        from app.services import path_revision_service
        path_revision_service.generate_path_revision(
            db=db,
            case_id=request.case_id,
            user_id=None,
            trigger_type="provider_response",
            change_reason=f"Received parsed {request.provider_type.value.upper()} response from {request.provider_name} with {len(records)} records."
        )
    except Exception as pr_exc:
        logger.error("Failed to automatically generate path revision on provider response: %s", pr_exc, exc_info=True)

    db.commit()
    db.refresh(response_record)
    return response_record
