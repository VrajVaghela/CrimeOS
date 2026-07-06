from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/responses", tags=["provider responses"])


@router.get("/status", response_model=RouteStubOut)
async def response_status(_: User = Depends(get_current_user)) -> RouteStubOut:
    return RouteStubOut(module="responses", status="phase_1_stub", message="Provider response analytics start in Phase 5.")
