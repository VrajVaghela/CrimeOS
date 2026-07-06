from fastapi import APIRouter

from app.schemas.common import RouteStubOut

router = APIRouter(prefix="/mock/provider", tags=["mock provider"])


@router.get("/status", response_model=RouteStubOut)
async def mock_provider_status() -> RouteStubOut:
    return RouteStubOut(module="mock_provider", status="phase_1_stub", message="Mock provider responses start in Phase 4.")
