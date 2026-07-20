import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, CaseEntity
from app.services import osint_service, audit_service

router = APIRouter(prefix="/cases/{case_id}/osint", tags=["OSINT & digital footprint enrichment"])


@router.get("/{entity_id}", summary="Get OSINT scan results for an entity")
async def get_entity_osint(
    case_id: uuid.UUID,
    entity_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = osint_service.get_full_osint_result(db, entity_id)
    if not result:
        raise HTTPException(status_code=404, detail="OSINT scan result not found")

    if uuid.UUID(result["scan"]["case_id"]) != case_id:
        raise HTTPException(status_code=404, detail="OSINT scan result not found for this case")

    return {"osint": result}


@router.post("/{entity_id}/trigger", summary="Manually trigger or retry an OSINT scan")
async def trigger_entity_osint(
    case_id: uuid.UUID,
    entity_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entity = db.get(CaseEntity, entity_id)
    if not entity or entity.case_id != case_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Cannot trigger OSINT scan on unconfirmed or ignored entities. Confirm it first."
        )

    # Scans are only supported for email, phone, and person/username types
    supported_types = ("email", "phone", "person", "username", "social_handle")
    if entity.entity_type.lower() not in supported_types:
        raise HTTPException(
            status_code=400,
            detail=f"OSINT scan not supported for entity type '{entity.entity_type}'"
        )

    scan = osint_service.enqueue_osint_scan(
        db,
        case_id=case_id,
        entity_id=entity_id,
        entity_type=entity.entity_type,
        entity_value=entity.canonical_value
    )

    background_tasks.add_task(osint_service.run_osint_scan_task, db, scan.id)

    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="osint_scan_triggered_manually",
        detail={
            "scan_id": str(scan.id),
            "entity_id": str(entity_id),
            "entity_value": entity.canonical_value
        }
    )

    return {"status": "enqueued", "scan_id": str(scan.id)}


@router.post("/pivots/{entity_id}/confirm", summary="Confirm an unconfirmed discovered pivot")
async def confirm_pivot(
    case_id: uuid.UUID,
    entity_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entity = db.get(CaseEntity, entity_id)
    if not entity or entity.case_id != case_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.status != "unconfirmed":
        raise HTTPException(status_code=400, detail="Entity is already confirmed or ignored")

    entity.status = "confirmed"
    db.flush()

    # Trigger OSINT scan for the newly confirmed entity if supported
    supported_types = ("email", "phone", "person", "username", "social_handle")
    scan_meta = None
    if entity.entity_type.lower() in supported_types:
        scan = osint_service.enqueue_osint_scan(
            db,
            case_id=case_id,
            entity_id=entity_id,
            entity_type=entity.entity_type,
            entity_value=entity.canonical_value
        )
        background_tasks.add_task(osint_service.run_osint_scan_task, db, scan.id)
        scan_meta = {"scan_id": str(scan.id), "status": "enqueued"}

    # Generate a path revision for the investigation command center
    from app.services import path_revision_service
    try:
        path_revision_service.generate_path_revision(
            db=db,
            case_id=case_id,
            user_id=current_user.id,
            trigger_type="entities_verified",
            change_reason=f"Investigating Officer promoted unconfirmed pivot ({entity.entity_type}) '{entity.display_value}' to confirmed status."
        )
    except Exception as pr_exc:
        import logging
        logging.getLogger("crime_os.osint_router").error("Path revision failed on pivot confirm: %s", pr_exc)

    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="osint_pivot_confirmed",
        detail={
            "entity_id": str(entity_id),
            "entity_type": entity.entity_type,
            "entity_value": entity.canonical_value
        }
    )

    db.commit()

    return {"success": True, "entity": {"id": str(entity.id), "status": entity.status}, "scan": scan_meta}


@router.post("/pivots/{entity_id}/ignore", summary="Ignore an unconfirmed discovered pivot")
async def ignore_pivot(
    case_id: uuid.UUID,
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entity = db.get(CaseEntity, entity_id)
    if not entity or entity.case_id != case_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.status != "unconfirmed":
        raise HTTPException(status_code=400, detail="Entity is already confirmed or ignored")

    entity.status = "ignored"
    db.commit()

    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="osint_pivot_ignored",
        detail={
            "entity_id": str(entity_id),
            "entity_type": entity.entity_type,
            "entity_value": entity.canonical_value
        }
    )

    return {"success": True}


@router.get("/{entity_id}/export", summary="Export OSINT digital dossier report")
async def export_dossier(
    case_id: uuid.UUID,
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = osint_service.get_full_osint_result(db, entity_id)
    if not result:
        raise HTTPException(status_code=404, detail="OSINT scan result not found")

    if uuid.UUID(result["scan"]["case_id"]) != case_id:
        raise HTTPException(status_code=404, detail="OSINT scan result not found for this case")

    report_text = osint_service.generate_dossier_report(result)
    filename = f"dossier_{entity_id}_{int(datetime.utcnow().timestamp())}.txt"

    audit_service.record(
        db,
        case_id=case_id,
        user_id=current_user.id,
        action="osint_dossier_exported",
        detail={
            "entity_id": str(entity_id),
            "scan_id": result["scan"]["id"]
        }
    )

    db.commit()

    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "text/plain; charset=utf-8"
    }
    return PlainTextResponse(content=report_text, headers=headers)
