import csv
import logging
import os
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

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


def generate_mock_response(db: Session, request_id: uuid.UUID) -> ProviderResponse:
    request = db.get(LegalRequest, request_id)
    if not request:
        raise NotFoundError("Legal request not found")
        
    if request.status != RequestStatus.DISPATCHED:
        raise AppError("Can only generate mock responses for dispatched requests")
        
    # Find case and entities to customize mock data
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
    
    records = []
    
    if request.provider_type == ProviderType.TELECOM:
        # Get target phone from entities or default
        target_phone = next((e.value for e in entities if e.entity_type == "phone"), "+919876543210")
        target_ip = next((e.value for e in entities if e.entity_type == "ip_address"), "103.88.22.14")
        
        headers = ["timestamp", "calling_number", "called_number", "duration_sec", "cell_id", "imei"]
        records = [
            {
                "timestamp": "2026-07-06T10:15:30Z",
                "calling_number": target_phone,
                "called_number": "+918888888888",
                "duration_sec": "145",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910"
            },
            {
                "timestamp": "2026-07-06T11:02:15Z",
                "calling_number": target_phone,
                "called_number": "+917777777777",
                "duration_sec": "62",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910"
            },
            {
                "timestamp": "2026-07-06T12:45:00Z",
                "calling_number": target_phone,
                "called_number": "+918888888888",
                "duration_sec": "320",
                "cell_id": "MUM-T2-C1",
                "imei": "863920040582910"
            },
            {
                "timestamp": "2026-07-06T14:10:45Z",
                "calling_number": "+919999999999",
                "called_number": target_phone,
                "duration_sec": "45",
                "cell_id": "MUM-T1-C3",
                "imei": "863920040582910"
            }
        ]
        
    elif request.provider_type == ProviderType.BANK:
        # Get target bank account, transaction ID and amount or default
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
                "ip_address": "103.88.22.14"
            },
            {
                "timestamp": "2026-07-06T10:10:00Z",
                "transaction_id": "TXN10002",
                "source_account": target_account,
                "destination_account": "AC-887766",
                "amount": "45000.00",
                "status": "SUCCESS",
                "ip_address": "103.88.22.14"
            },
            {
                "timestamp": "2026-07-06T10:15:00Z",
                "transaction_id": "TXN10003",
                "source_account": "AC-887766",
                "destination_account": "AC-554433",
                "amount": "40000.00",
                "status": "SUCCESS",
                "ip_address": "192.168.1.1"
            }
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
                "action": "login"
            },
            {
                "timestamp": "2026-07-06T09:30:00Z",
                "username": target_user,
                "email": target_email,
                "ip_address": "103.88.22.14",
                "action": "update_profile"
            }
        ]
        
    # Write CSV
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(records)
        
    # Create ProviderResponse record
    # AI insights will be generated via Gemini in Phase 5, let's use a nice template-based insight for Phase 4
    ai_insights = f"Demo insights: Automated parser detected {len(records)} transactions/records in response. IP correlation checks show activity from 103.88.22.14."
    
    response_record = ProviderResponse(
        legal_request_id=request_id,
        received_at=datetime.utcnow(),
        file_path=relative_path,
        parsed_data={"records": records},
        ai_insights=ai_insights
    )
    
    db.add(response_record)
    
    # Update request status to RESPONDED
    request.status = RequestStatus.RESPONDED
    
    # Audit Event
    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=uuid.UUID("00000000-0000-0000-0000-0000-000000000000"), # System/Mock Provider
        action="response_received",
        detail={
            "request_id": str(request_id),
            "response_id": str(response_record.id),
            "provider_type": request.provider_type.value,
            "records_count": len(records)
        }
    )
    
    db.commit()
    db.refresh(response_record)
    return response_record
