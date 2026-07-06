from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get("/status", response_model=RouteStubOut)
async def summary_status(_: User = Depends(get_current_user)) -> RouteStubOut:
    return RouteStubOut(module="summaries", status="phase_1_stub", message="Versioned summaries start in Phase 5.")
