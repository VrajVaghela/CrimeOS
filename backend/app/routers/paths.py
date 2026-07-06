from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/paths", tags=["investigation paths"])


@router.get("/status", response_model=RouteStubOut)
async def path_status(_: User = Depends(get_current_user)) -> RouteStubOut:
    return RouteStubOut(module="paths", status="phase_1_stub", message="Grounded path generation starts in Phase 3.")
