from fastapi import APIRouter

from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/mock/cctns", tags=["mock cctns"])


@router.get("/status", response_model=RouteStubOut)
async def mock_cctns_status() -> RouteStubOut:
    return RouteStubOut(module="mock_cctns", status="phase_1_stub", message="Mock CCTNS sync is a Phase 6 bonus.")
