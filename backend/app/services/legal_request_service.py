import logging
import os
import uuid
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.header import Header
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re
from typing import Any


import jinja2
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import NotFoundError, AppError
from app.models import Case, PathStep, LegalRequest, User
from app.models.enums import ProviderType, RequestStatus, StepStatus
from app.services import audit_service

logger = logging.getLogger("crime_os.legal_requests")

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates", "requests"))
jinja_env = jinja2.Environment(loader=jinja2.FileSystemLoader(TEMPLATE_DIR))

# Thread pool executor to run blocking SMTP calls off the main event loop
executor = ThreadPoolExecutor(max_workers=3)

def _get_data_requested_for_provider(db: Session, case_id: uuid.UUID, provider_type: ProviderType) -> str:
    from app.models import Complaint, ExtractedEntity
    
    complaints = list(db.scalars(
        select(Complaint).where(Complaint.case_id == case_id)
    ))
    if not complaints:
        return "No complaints found."
    
    complaint_ids = [c.id for c in complaints]
    if not complaint_ids:
        return "No complaints found."
    
    entities = list(db.scalars(
        select(ExtractedEntity).where(ExtractedEntity.complaint_id.in_(complaint_ids))
    ))
    
    lines = []
    if provider_type == ProviderType.TELECOM:
        phones = {e.value for e in entities if e.entity_type == "phone"}
        ips = {e.value for e in entities if e.entity_type == "ip_address"}
        for phone in sorted(phones):
            lines.append(f"- Phone Number: {phone}")
        for ip in sorted(ips):
            lines.append(f"- IP Address: {ip}")
            
    elif provider_type == ProviderType.BANK:
        accounts = {e.value for e in entities if e.entity_type == "bank_account"}
        txns = {e.value for e in entities if e.entity_type == "transaction_id"}
        amounts = {e.value for e in entities if e.entity_type == "amount"}
        for acc in sorted(accounts):
            lines.append(f"- Bank Account: {acc}")
        for txn in sorted(txns):
            lines.append(f"- Transaction ID: {txn}")
        for amt in sorted(amounts):
            lines.append(f"- Amount: {amt}")
            
    elif provider_type == ProviderType.PLATFORM:
        urls = {e.value for e in entities if e.entity_type == "url"}
        emails = {e.value for e in entities if e.entity_type == "email"}
        users = {e.value for e in entities if e.entity_type == "person"}
        ips = {e.value for e in entities if e.entity_type == "ip_address"}
        for url in sorted(urls):
            lines.append(f"- URL / Handle: {url}")
        for email in sorted(emails):
            lines.append(f"- Email Address: {email}")
        for user in sorted(users):
            lines.append(f"- Suspect Name / Profile: {user}")
        for ip in sorted(ips):
            lines.append(f"- IP Address: {ip}")
            
    if not lines:
        if provider_type == ProviderType.TELECOM:
            return "- Suspect phone number(s) mentioned in complaint"
        elif provider_type == ProviderType.BANK:
            return "- Recipient bank account(s) mentioned in complaint"
        else:
            return "- Suspect account handle or email mentioned in complaint"
            
    return "\n".join(lines)


def get_request(db: Session, request_id: uuid.UUID) -> LegalRequest:
    request = db.get(LegalRequest, request_id)
    if not request:
        raise NotFoundError("Legal request not found")
    return request


def get_requests_by_case(db: Session, case_id: uuid.UUID) -> list[LegalRequest]:
    return list(db.scalars(
        select(LegalRequest).where(LegalRequest.case_id == case_id).order_by(LegalRequest.status)
    ))


def get_pending_requests(db: Session) -> list[LegalRequest]:
    return list(db.scalars(
        select(LegalRequest).where(LegalRequest.status == RequestStatus.DRAFT).order_by(LegalRequest.dispatched_at.desc())
    ))



def create_request_draft(
    db: Session,
    case_id: uuid.UUID,
    step_id: uuid.UUID | None,
    provider_name: str,
    recipient_email: str,
    current_user: User
) -> LegalRequest:
    case = db.get(Case, case_id)
    if not case:
        raise NotFoundError("Case not found")
        
    provider_type = ProviderType.TELECOM
    template_name = "telecom_cdr.txt.j2"
    legal_basis = "Section 94 of BNSS (Bharatiya Nagarik Suraksha Sanhita)"
    
    step = None
    if step_id:
        step = db.get(PathStep, step_id)
        if not step:
            raise NotFoundError("Path step not found")
        if step.suggested_action_type:
            try:
                provider_type = ProviderType(step.suggested_action_type)
            except ValueError:
                provider_type = ProviderType.TELECOM
                
    # Map provider type to template and legal basis
    if provider_type == ProviderType.TELECOM:
        template_name = "telecom_cdr.txt.j2"
        legal_basis = "Section 94 of BNSS (Bharatiya Nagarik Suraksha Sanhita)"
    elif provider_type == ProviderType.BANK:
        template_name = "bank_freeze.txt.j2"
        legal_basis = "Section 106 of BNSS (Bharatiya Nagarik Suraksha Sanhita) & Section 102 of CrPC"
    elif provider_type == ProviderType.PLATFORM:
        template_name = "platform_data.txt.j2"
        legal_basis = "Section 94 of BNSS (Bharatiya Nagarik Suraksha Sanhita)"
        
    # Render template
    data_requested = _get_data_requested_for_provider(db, case_id, provider_type)
    
    try:
        template = jinja_env.get_template(template_name)
        body = template.render(
            case_number=case.case_number,
            provider_name=provider_name,
            legal_basis=legal_basis,
            data_requested=data_requested,
            officer_name=current_user.full_name
        )
    except Exception as e:
        logger.error("Failed to render request template %s: %s", template_name, e)
        raise AppError(f"Failed to generate template: {str(e)}")
        
    request_record = LegalRequest(
        case_id=case_id,
        path_step_id=step_id,
        provider_type=provider_type,
        provider_name=provider_name,
        template_used=template_name,
        generated_body=body,
        recipient_email=recipient_email,
        status=RequestStatus.DRAFT
    )
    
    db.add(request_record)
    db.flush()
    
    # Audit Event
    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="request_drafted",
        detail={
            "request_id": str(request_record.id),
            "provider_type": provider_type.value,
            "provider_name": provider_name,
            "recipient_email": recipient_email
        }
    )
    
    # If there is a step, update its status to IN_PROGRESS
    if step:
        step.status = StepStatus.IN_PROGRESS
        
    db.commit()
    db.refresh(request_record)
    return request_record


def update_request_draft(
    db: Session,
    request_id: uuid.UUID,
    generated_body: str,
    provider_name: str,
    recipient_email: str,
    current_user: User
) -> LegalRequest:
    request = get_request(db, request_id)
    if request.status != RequestStatus.DRAFT:
        raise AppError("Only drafts can be updated")
        
    request.generated_body = generated_body
    request.provider_name = provider_name
    request.recipient_email = recipient_email
    
    # Audit Event
    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=current_user.id,
        action="request_draft_updated",
        detail={
            "request_id": str(request_id),
            "provider_name": provider_name,
            "recipient_email": recipient_email
        }
    )
    
    db.commit()
    db.refresh(request)
    return request


def approve_request(db: Session, request_id: uuid.UUID, current_user: User) -> LegalRequest:
    from app.models.enums import UserRole
    if current_user.role != UserRole.SHO:
        raise AppError("Only an SHO can approve legal requests")
    request = get_request(db, request_id)
    if request.status != RequestStatus.DRAFT:
        raise AppError("Only drafts can be approved")
        
    request.status = RequestStatus.APPROVED

    
    # Audit Event
    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=current_user.id,
        action="request_approved",
        detail={
            "request_id": str(request_id),
            "approver": current_user.username
        }
    )
    
    db.commit()
    db.refresh(request)
    return request


def _send_smtp_email_sync(subject: str, body: str, recipient_email: str) -> None:
    """Synchronously send email via smtplib. Raised errors will bubble up to caller."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Skipping real mail dispatch.")
        return

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.DEMO_PROVIDER_INBOX
    msg["X-Intended-Recipient"] = recipient_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_PORT == 587:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, [settings.DEMO_PROVIDER_INBOX], msg.as_string())
    logger.info("SMTP email successfully sent to %s (demo inbox)", settings.DEMO_PROVIDER_INBOX)


def check_request_readiness(db: Session, request_id: uuid.UUID, current_user: User) -> dict[str, Any]:
    request = get_request(db, request_id)
    body = request.generated_body
    items = []
    is_ready = True

    # 1. Recipient check
    recipient_ok = False
    if request.recipient_email and "@" in request.recipient_email and "." in request.recipient_email:
        recipient_ok = True

    if recipient_ok:
        items.append({
            "key": "recipient",
            "label": "Recipient Email",
            "status": "passed",
            "message": f"Valid recipient email: {request.recipient_email}",
            "fix": None,
            "message_key": "recipient_passed",
            "message_params": {"email": request.recipient_email or ""},
        })
    else:
        is_ready = False
        items.append({
            "key": "recipient",
            "label": "Recipient Email",
            "status": "failed",
            "message": "Missing or invalid recipient email address",
            "fix": "Enter a valid nodal officer email address (e.g. nodal.officer@provider.com).",
            "message_key": "recipient_failed",
            "fix_key": "recipient_fix",
        })

    # 2. Entities check
    has_entities = False
    entity_reason = ""
    entity_fix = ""
    # Phase 14C: dictionary-key suffix mirroring entity_reason/entity_fix.
    entity_reason_key = ""
    entity_fix_key = ""

    if "No complaints found" in body or "mentioned in complaint" in body:
        has_entities = False
        entity_reason = "Contains default placeholder text for data requested"
        entity_fix = "Edit the draft to replace placeholder text with actual case identifiers (e.g. Phone Number, Bank Account)."
        entity_reason_key = "entities_placeholder"
        entity_fix_key = "entities_placeholder_fix"
    else:
        if request.provider_type == ProviderType.TELECOM:
            phone_match = re.search(r"\b\d{10}\b|\b\d{5}\s?\d{5}\b|\+91\d{10}", body)
            ip_match = re.search(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", body)
            if phone_match or ip_match:
                has_entities = True
            else:
                entity_reason = "No phone number or IP address detected in the draft body"
                entity_fix = "Edit the draft to include the target Phone Number(s) or IP address(es) for CDR request."
                entity_reason_key = "entities_telecom"
                entity_fix_key = "entities_telecom_fix"
        elif request.provider_type == ProviderType.BANK:
            acc_match = re.search(r"AC-\d+|account|Acc|ACC|AC\s?\d+|\b\d{9,18}\b", body, re.IGNORECASE)
            txn_match = re.search(r"TXN\d+|transaction|txn|transfer", body, re.IGNORECASE)
            if acc_match or txn_match:
                has_entities = True
            else:
                entity_reason = "No bank account number or transaction ID detected in the draft body"
                entity_fix = "Edit the draft to include the target Bank Account(s) or Transaction ID(s) to freeze."
                entity_reason_key = "entities_bank"
                entity_fix_key = "entities_bank_fix"
        elif request.provider_type == ProviderType.PLATFORM:
            email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", body)
            url_match = re.search(r"https?://|www\.|@\w+", body)
            if email_match or url_match or "profile" in body.lower() or "suspect" in body.lower():
                has_entities = True
            else:
                entity_reason = "No email address, URL, handle or username detected in the draft body"
                entity_fix = "Edit the draft to include the target handle, profile URL, or email address."
                entity_reason_key = "entities_platform"
                entity_fix_key = "entities_platform_fix"

    if has_entities:
        items.append({
            "key": "entities",
            "label": "Target Identifiers",
            "status": "passed",
            "message": "Target identifiers (phone/account/email) verified in draft body",
            "fix": None,
            "message_key": "entities_passed",
        })
    else:
        is_ready = False
        items.append({
            "key": "entities",
            "label": "Target Identifiers",
            "status": "failed",
            "message": entity_reason or "No target identifiers found in the draft",
            "fix": entity_fix or "Specify the target identifiers in the draft.",
            "message_key": entity_reason_key or "entities_failed",
            "fix_key": entity_fix_key or "entities_fix",
        })

    # 3. Legal Basis check
    has_legal_basis = False
    legal_basis_match = re.search(r"Section\s+\d+|Sec\.\s+\d+|under\s+section|BNSS|BNS|BSA|CrPC|IPC", body, re.IGNORECASE)
    if legal_basis_match:
        has_legal_basis = True

    if has_legal_basis:
        items.append({
            "key": "legal_basis",
            "label": "Legal Basis",
            "status": "passed",
            "message": "Valid legal sections/acts cited in draft body",
            "fix": None,
            "message_key": "legal_basis_passed",
        })
    else:
        is_ready = False
        items.append({
            "key": "legal_basis",
            "label": "Legal Basis",
            "status": "failed",
            "message": "No legal basis specified (e.g. BNSS/CrPC/BSA/BNS section)",
            "fix": "Cite the legal provision under which information is sought (e.g., 'Section 94 of BNSS' or 'Section 106 of BNSS').",
            "message_key": "legal_basis_failed",
            "fix_key": "legal_basis_fix",
        })

    # 4. Date Range check
    has_date = False
    date_match = re.search(r"\b\d{4}-\d{2}-\d{2}\b|\b\d{2}/\d{2}/\d{4}\b|between|period|date|range|from\s+\S+\s+to\s+\S+", body, re.IGNORECASE)
    if date_match:
        has_date = True

    if has_date:
        items.append({
            "key": "date_range",
            "label": "Date Range / Period",
            "status": "passed",
            "message": "Date range or time period verified in draft body",
            "fix": None,
            "message_key": "date_range_passed",
        })
    else:
        is_ready = False
        items.append({
            "key": "date_range",
            "label": "Date Range / Period",
            "status": "failed",
            "message": "No specific date range or time period specified",
            "fix": "Specify the exact date range for the requested logs (e.g., 'CDR for the period 2026-07-01 to 2026-07-07').",
            "message_key": "date_range_failed",
            "fix_key": "date_range_fix",
        })

    # 5. Approval check
    from app.models.enums import UserRole
    approval_ok = False
    if request.status in (RequestStatus.APPROVED, RequestStatus.DISPATCHED, RequestStatus.RESPONDED):
        approval_ok = True
    elif current_user.role == UserRole.SHO:
        approval_ok = True

    if approval_ok:
        items.append({
            "key": "approval",
            "label": "SHO Approval Status",
            "status": "passed",
            "message": "Approved by SHO or eligible for instant dispatch",
            "fix": None,
            "message_key": "approval_passed",
        })
    else:
        is_ready = False
        items.append({
            "key": "approval",
            "label": "SHO Approval Status",
            "status": "failed",
            "message": "Request is in DRAFT status and requires SHO approval",
            "fix": "Ask the Station House Officer (SHO) to log in and approve this request draft.",
            "message_key": "approval_failed",
            "fix_key": "approval_fix",
        })

    # 6. Citation check
    if request.path_step_id:
        items.append({
            "key": "citation",
            "label": "SOP Pathway Link",
            "status": "passed",
            "message": "Linked to active investigation step and SOP citation",
            "fix": None,
            "message_key": "citation_passed",
        })
    else:
        items.append({
            "key": "citation",
            "label": "SOP Pathway Link",
            "status": "warning",
            "message": "Draft is not linked to any specific step in the investigation pathway",
            "fix": "For complete audit trail, create this request from a suggested step in the Investigation Path tab.",
            "message_key": "citation_warning",
            "fix_key": "citation_fix",
        })

    return {
        "is_ready": is_ready,
        "items": items
    }


async def dispatch_request(db: Session, request_id: uuid.UUID, current_user: User) -> LegalRequest:
    request = get_request(db, request_id)
    if request.status not in (RequestStatus.DRAFT, RequestStatus.APPROVED):
        raise AppError("Request must be in DRAFT or APPROVED status to dispatch")

    # Enforce readiness check
    readiness = check_request_readiness(db, request_id, current_user)
    if not readiness["is_ready"]:
        failed_msgs = [item["message"] for item in readiness["items"] if item["status"] == "failed"]
        raise AppError(f"Pre-dispatch validation failed: {'; '.join(failed_msgs)}")

    # Auto-approve if currently a draft
    if request.status == RequestStatus.DRAFT:
        request.status = RequestStatus.APPROVED

        
    case = db.get(Case, request.case_id)
    case_number = case.case_number if case else "Unknown"
    
    # Parse subject line from body or build fallback
    subject = f"Legal Request: {case_number} - {request.provider_name}"
    body = request.generated_body
    if body.startswith("Subject:"):
        lines = body.split("\n", 1)
        subject_line = lines[0].replace("Subject:", "").strip()
        if subject_line:
            subject = subject_line
        if len(lines) > 1:
            body = lines[1].strip()

    smtp_success = True
    smtp_error_msg = None

    try:
        # Run blocking SMTP call inside the thread pool executor
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            executor,
            _send_smtp_email_sync,
            subject,
            body,
            request.recipient_email
        )
    except Exception as e:
        smtp_success = False
        smtp_error_msg = str(e)
        logger.error("SMTP dispatch failed for request %s: %s", request_id, e)

    # Transition status
    request.status = RequestStatus.DISPATCHED
    request.dispatched_at = datetime.utcnow()
    
    # Update path step status to DONE if it exists
    if request.path_step_id:
        step = db.get(PathStep, request.path_step_id)
        if step:
            step.status = StepStatus.DONE

    # Record Audit Event
    audit_detail = {
        "request_id": str(request_id),
        "smtp_success": smtp_success,
        "recipient_email": request.recipient_email,
        "actual_inbox": settings.DEMO_PROVIDER_INBOX
    }
    if not smtp_success:
        audit_detail["dispatch_note"] = "smtp_failed_demo_mode"
        audit_detail["smtp_error"] = smtp_error_msg

    audit_service.record(
        db,
        case_id=request.case_id,
        user_id=current_user.id,
        action="request_dispatched",
        detail=audit_detail
    )
    
    db.commit()
    db.refresh(request)
    return request
