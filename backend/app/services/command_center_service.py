import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AuditEvent,
    Case,
    CaseSummary,
    CaseWorkflowState,
    Complaint,
    ExtractedEntity,
    InvestigationPath,
    LegalRequest,
    ProviderResponse,
)
from app.schemas.command_center import (
    CaseWorkflowStateOut,
    CommandCenterOut,
    RecentActivityOut,
    WorkflowStageOut,
)


def get_stage_labels(stage: str) -> tuple[str, str]:
    mapping = {
        "ingest": ("Ingest", "शिकायत दर्ज"),
        "verify": ("Verify", "सत्यापन"),
        "investigate": ("Investigate", "जांच मार्ग"),
        "request": ("Request", "कानूनी अनुरोध"),
        "analyze": ("Analyze", "प्रतिक्रिया विश्लेषण"),
        "summarize": ("Summarize", "मामला सारांश"),
    }
    return mapping.get(stage, (stage, stage))


def get_command_center(db: Session, case_id: uuid.UUID) -> CommandCenterOut:
    case = db.scalar(select(Case).where(Case.id == case_id))
    if not case:
        raise ValueError(f"Case with id {case_id} not found")

    complaints = list(db.scalars(select(Complaint).where(Complaint.case_id == case_id)))
    
    complaint_ids = [c.id for c in complaints]
    has_entities = False
    if complaint_ids:
        entities_count = db.scalar(
            select(func.count(ExtractedEntity.id)).where(ExtractedEntity.complaint_id.in_(complaint_ids))
        )
        has_entities = (entities_count or 0) > 0

    paths = list(db.scalars(select(InvestigationPath).where(InvestigationPath.case_id == case_id)))
    requests = list(db.scalars(select(LegalRequest).where(LegalRequest.case_id == case_id)))
    
    request_ids = [r.id for r in requests]
    has_responses = False
    if request_ids:
        responses_count = db.scalar(
            select(func.count(ProviderResponse.id)).where(ProviderResponse.legal_request_id.in_(request_ids))
        )
        has_responses = (responses_count or 0) > 0

    summaries = list(db.scalars(select(CaseSummary).where(CaseSummary.case_id == case_id)))

    stage_completion = {
        "ingest": len(complaints) > 0,
        "verify": has_entities,
        "investigate": len(paths) > 0,
        "request": any(r.status in ["dispatched", "responded"] for r in requests),
        "analyze": has_responses,
        "summarize": len(summaries) > 0,
    }

    stages_list = ["ingest", "verify", "investigate", "request", "analyze", "summarize"]
    
    current_stage = "ingest"
    for stg in stages_list:
        if not stage_completion[stg]:
            current_stage = stg
            break
    else:
        current_stage = "summarize"

    stages_out = []
    found_incomplete = False
    for stg in stages_list:
        is_completed = stage_completion[stg]
        if is_completed:
            status = "done"
        elif not found_incomplete:
            status = "in_progress"
            found_incomplete = True
        else:
            status = "pending"
            
        label, label_hi = get_stage_labels(stg)
        stages_out.append(
            WorkflowStageOut(
                stage=stg,
                label=label,
                label_hi=label_hi,
                status=status,
                is_completed=is_completed,
            )
        )

    completed_count = sum(1 for stg in stages_list if stage_completion[stg])
    completion_percentage = int((completed_count / 6.0) * 100)

    blocker_codes = []
    next_action_type = None
    next_action_label = None

    if current_stage == "ingest":
        blocker_codes = ["MISSING_COMPLAINT"]
        next_action_type = "upload_complaint"
        next_action_label = "Upload Complaint / शिकायत अपलोड करें"
    elif current_stage == "verify":
        blocker_codes = ["UNVERIFIED_ENTITIES"]
        next_action_type = "verify_entities"
        next_action_label = "Verify Entities / संस्थाओं को सत्यापित करें"
    elif current_stage == "investigate":
        blocker_codes = ["MISSING_PATH"]
        next_action_type = "generate_path"
        next_action_label = "Generate Investigation Path / जांच मार्ग बनाएं"
    elif current_stage == "request":
        blocker_codes = ["NO_REQUESTS_DISPATCHED"]
        next_action_type = "draft_request"
        next_action_label = "Draft Legal Request / कानूनी अनुरोध का मसौदा तैयार करें"
    elif current_stage == "analyze":
        blocker_codes = ["AWAITING_PROVIDER_RESPONSE"]
        next_action_type = "trigger_response"
        next_action_label = "Trigger Mock Response / नकली प्रतिक्रिया ट्रिगर करें"
    elif current_stage == "summarize":
        blocker_codes = ["MISSING_SUMMARY"]
        next_action_type = "generate_summary"
        next_action_label = "Generate Case Summary / मामले का सारांश बनाएं"

    workflow_state = db.scalar(select(CaseWorkflowState).where(CaseWorkflowState.case_id == case_id))
    if not workflow_state:
        workflow_state = CaseWorkflowState(
            case_id=case_id,
            current_stage=current_stage,
            blocker_codes=blocker_codes,
            next_action_type=next_action_type,
            next_action_label=next_action_label,
            updated_at=datetime.utcnow(),
        )
        db.add(workflow_state)
    else:
        workflow_state.current_stage = current_stage
        db_blockers = workflow_state.blocker_codes or []
        combined_blockers = list(set(blocker_codes + db_blockers))
        workflow_state.blocker_codes = combined_blockers
        workflow_state.next_action_type = next_action_type
        workflow_state.next_action_label = next_action_label
        workflow_state.updated_at = datetime.utcnow()
    
    db.commit()

    recent_events = list(
        db.scalars(
            select(AuditEvent)
            .where(AuditEvent.case_id == case_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(5)
        )
    )
    
    recent_activity = []
    for event in recent_events:
        actor_name = event.user.full_name if event.user else "System"
        recent_activity.append(
            RecentActivityOut(
                id=event.id,
                action=event.action,
                timestamp=event.created_at,
                actor_name=actor_name,
                detail=event.detail,
            )
        )

    workflow_out = CaseWorkflowStateOut(
        case_id=workflow_state.case_id,
        current_stage=workflow_state.current_stage,
        blocker_codes=workflow_state.blocker_codes,
        next_action_type=workflow_state.next_action_type,
        next_action_label=workflow_state.next_action_label,
        updated_at=workflow_state.updated_at,
        stages=stages_out,
        completion_percentage=completion_percentage,
        recent_activity=recent_activity,
    )

    return CommandCenterOut(
        case_id=case.id,
        case_number=case.case_number,
        title=case.title,
        status=case.status,
        crime_type=case.crime_type,
        created_at=case.created_at,
        workflow=workflow_out,
    )
