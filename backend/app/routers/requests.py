import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.requests import LegalRequestCreateIn, LegalRequestUpdateIn, LegalRequestOut
from app.services import legal_request_service

router = APIRouter(prefix="/requests", tags=["legal requests"])


@router.post("", response_model=LegalRequestOut, summary="Create a legal request draft")
async def create_request(
    body: LegalRequestCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalRequestOut:
    request = legal_request_service.create_request_draft(
        db=db,
        case_id=body.case_id,
        step_id=body.path_step_id,
        provider_name=body.provider_name,
        recipient_email=body.recipient_email,
        current_user=current_user
    )
    return LegalRequestOut.model_validate(request)


@router.get("/cases/{case_id}", response_model=list[LegalRequestOut], summary="Get legal requests for a case")
async def get_case_requests(
    case_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LegalRequestOut]:
    requests = legal_request_service.get_requests_by_case(db, case_id)
    return [LegalRequestOut.model_validate(r) for r in requests]


@router.get("/{request_id}", response_model=LegalRequestOut, summary="Get details of a legal request")
async def get_request_details(
    request_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalRequestOut:
    request = legal_request_service.get_request(db, request_id)
    return LegalRequestOut.model_validate(request)


@router.patch("/{request_id}", response_model=LegalRequestOut, summary="Update legal request draft body/metadata")
async def update_request(
    request_id: uuid.UUID,
    body: LegalRequestUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalRequestOut:
    request = legal_request_service.update_request_draft(
        db=db,
        request_id=request_id,
        generated_body=body.generated_body,
        provider_name=body.provider_name,
        recipient_email=body.recipient_email,
        current_user=current_user
    )
    return LegalRequestOut.model_validate(request)


@router.post("/{request_id}/approve", response_model=LegalRequestOut, summary="Approve a legal request")
async def approve_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalRequestOut:
    request = legal_request_service.approve_request(db, request_id, current_user)
    return LegalRequestOut.model_validate(request)


@router.post("/{request_id}/dispatch", response_model=LegalRequestOut, summary="Dispatch a legal request via email")
async def dispatch_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LegalRequestOut:
    request = await legal_request_service.dispatch_request(db, request_id, current_user)
    return LegalRequestOut.model_validate(request)
