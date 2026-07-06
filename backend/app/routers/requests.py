from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/requests", tags=["legal requests"])


@router.get("/status", response_model=RouteStubOut)
async def request_status(_: User = Depends(get_current_user)) -> RouteStubOut:
    return RouteStubOut(module="requests", status="phase_1_stub", message="Legal request drafting starts in Phase 4.")
