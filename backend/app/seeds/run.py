import hashlib
from collections.abc import Iterable

from sqlalchemy import select

from app.ai.gemini_client import embed
from app.database import Base, SessionLocal, engine
import uuid
from datetime import datetime
from app.models import (
    Case, LegalCode, LegalSection, SopChunk, SopDocument, User, UserRole,
    CopilotMessage, AiCitation, Complaint, ExtractedEntity, CaseEntity,
    EntityRelationship, EvidenceFile, EvidenceMarker, InvestigationPath,
    PathStep, LegalRequest, ProviderResponse, CaseWorkflowState
)
from app.models.enums import ProviderType, RequestStatus, SourceType, StepStatus
from app.services.audit_service import record
from app.services.security import hash_password


def deterministic_embedding(text: str) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    for idx in range(768):
        values.append(((digest[idx % len(digest)] / 255.0) * 2.0) - 1.0)
    return values


def legal_sections() -> Iterable[tuple[LegalCode, str, str, str]]:
    topics = [
        "organized crime", "terror act", "murder", "culpable homicide", "hurt", "wrongful restraint",
        "kidnapping", "theft", "extortion", "robbery", "cheating", "forgery", "defamation", "criminal intimidation",
        "cyber deception", "identity misuse", "breach of trust", "stalking", "sexual harassment", "evidence tampering",
    ]
    for offset, topic in enumerate(topics, start=1):
        yield LegalCode.BNS, str(100 + offset), topic.title(), f"Demo BNS reference excerpt for {topic}; use with cited reasoning in the UI."
    for offset, topic in enumerate(topics, start=1):
        yield LegalCode.BNSS, str(170 + offset), f"Procedure for {topic}", f"Demo BNSS procedural excerpt for handling {topic} investigation actions."
    for offset, topic in enumerate(topics, start=1):
        yield LegalCode.BSA, str(50 + offset), f"Evidence rule for {topic}", f"Demo BSA evidence excerpt for admissibility and handling of {topic} evidence."


SOPS = [
    (
        "Cyber Financial Fraud SOP",
        "cyber_fraud",
        "sop_cyber_financial_fraud.md",
        [
            "Intake: Capture victim identity, transaction IDs, bank account numbers, UPI handles, phone numbers, and exact timestamps.",
            "Immediate action: Preserve digital evidence, request bank freeze/KYC, and obtain CDR for suspect numbers.",
            "Analysis: Correlate transaction timing with phone activity and platform login metadata before suspect outreach.",
        ],
    ),
    (
        "Mobile Theft SOP",
        "theft",
        "sop_mobile_theft.md",
        [
            "Intake: Record IMEI, phone model, last known location, SIM numbers, and ownership proof.",
            "Trace: Request CDR/IPDR and device location trail through approved telecom request templates.",
            "Recovery: Document seizure memo, chain of custody, and victim handover acknowledgement.",
        ],
    ),
    (
        "Online Harassment SOP",
        "harassment",
        "sop_online_harassment.md",
        [
            "Intake: Preserve URLs, screenshots, account handles, threat language, timestamps, and witness names.",
            "Platform action: Request subscriber data, content preservation, and takedown status from the platform.",
            "Victim safety: Assess threat escalation and record protection measures in the audit timeline.",
        ],
    ),
    (
        "Bank Account Mule Network SOP",
        "banking_fraud",
        "sop_bank_mule_network.md",
        [
            "Intake: Extract beneficiary accounts, IFSC, amount, transaction reference, and complaint delay.",
            "Containment: Send freeze and KYC requests to banks and preserve transaction statements.",
            "Linking: Group accounts by shared phone, address, device, or introducer fields from provider responses.",
        ],
    ),
]


def seed_users() -> dict[str, User]:
    return {
        "io": User(username="io", hashed_password=hash_password("demo123"), role=UserRole.IO, full_name="Inspector Asha Patel"),
        "sho": User(username="sho", hashed_password=hash_password("demo123"), role=UserRole.SHO, full_name="SHO Vikram Singh"),
        "legal": User(username="legal", hashed_password=hash_password("demo123"), role=UserRole.LEGAL, full_name="Legal Advisor Meera Shah"),
    }


def main() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.username == "io")):
            users = seed_users()
            db.add_all(users.values())
            db.flush()
            
            # Seed Case 1
            case = Case(
                case_number="ERH26-CYB-0001",
                title="UPI fraud complaint awaiting ingestion",
                status="open",
                crime_type="cyber_fraud",
                created_by=users["io"].id,
            )
            db.add(case)
            db.flush()
            record(db, case_id=case.id, user_id=users["io"].id, action="case.seeded", detail={"source": "phase_1_seed"})

            # Seed Case 2 (Full Phase 8 Examples)
            case2 = Case(
                case_number="ERH26-CYB-0002",
                title="Social media harassment and identity theft",
                status="open",
                crime_type="harassment",
                created_by=users["io"].id,
            )
            db.add(case2)
            db.flush()
            record(db, case_id=case2.id, user_id=users["io"].id, action="case.seeded", detail={"source": "phase_8_seed"})

            # 1. Complaint for Case 2
            complaint2 = Complaint(
                case_id=case2.id,
                source_type=SourceType.IMAGE,
                original_file_path="uploads/complaint_2.png",
                detected_language="guj",
                raw_text="મને સોશિયલ મીડિયા એકાઉન્ટ @target_harass પરથી નકલી પ્રોફાઇલ દ્વારા ધમકીભર્યા સંદેશાઓ મળી રહ્યા છે. તેમાં એક ફોન નંબર 9876543210 અને ઈમેલ culprit@harass.com સંકળાયેલા હોઈ શકે છે.",
                translated_text="I am receiving threatening messages via a fake profile from social media account @target_harass. A phone number 9876543210 and email culprit@harass.com might be associated with it."
            )
            db.add(complaint2)
            db.flush()

            # 2. ExtractedEntity records for Complaint 2
            ext_phone = ExtractedEntity(complaint_id=complaint2.id, entity_type="phone", value="9876543210", confidence=0.95)
            ext_email = ExtractedEntity(complaint_id=complaint2.id, entity_type="email", value="culprit@harass.com", confidence=0.98)
            ext_profile = ExtractedEntity(complaint_id=complaint2.id, entity_type="person", value="fake_profile_123", confidence=0.90)
            db.add_all([ext_phone, ext_email, ext_profile])
            db.flush()

            # 3. CaseEntity records for Case 2 (normalized/verified)
            ent_phone = CaseEntity(
                case_id=case2.id,
                entity_type="phone",
                canonical_value="9876543210",
                display_value="+91 98765 43210",
                confidence=0.95
            )
            ent_email = CaseEntity(
                case_id=case2.id,
                entity_type="email",
                canonical_value="culprit@harass.com",
                display_value="culprit@harass.com",
                confidence=0.98
            )
            ent_profile = CaseEntity(
                case_id=case2.id,
                entity_type="person",
                canonical_value="fake_profile_123",
                display_value="@fake_profile_123",
                confidence=0.90
            )
            db.add_all([ent_phone, ent_email, ent_profile])
            db.flush()

            # 4. EntityRelationship records for Case 2
            rel1 = EntityRelationship(
                case_id=case2.id,
                source_entity_id=ent_profile.id,
                target_entity_id=ent_phone.id,
                relationship_type="co_occurrence",
                confidence=0.90,
                evidence_ref={"source_type": "complaint", "source_id": str(complaint2.id)}
            )
            rel2 = EntityRelationship(
                case_id=case2.id,
                source_entity_id=ent_profile.id,
                target_entity_id=ent_email.id,
                relationship_type="co_occurrence",
                confidence=0.90,
                evidence_ref={"source_type": "complaint", "source_id": str(complaint2.id)}
            )
            db.add_all([rel1, rel2])
            db.flush()

            # 5. EvidenceFile and EvidenceMarker records for Case 2
            ev_file = EvidenceFile(
                case_id=case2.id,
                file_path="uploads/evidence_chat.png",
                file_type="image",
                transcript="આજે રાત્રે તારી ખેર નથી, નકલી પ્રોફાઇલથી તને બરબાદ કરી દઈશ.",
                translation="You won't be spared tonight, I will ruin you with a fake profile.",
                ai_tags={
                    "forensic_description": "Screenshot of Instagram direct message threats from account @fake_profile_123.",
                    "extracted_tags": ["instagram", "chat", "harassment"],
                    "flagged_elements": ["fake_profile_123", "culprit@harass.com"]
                }
            )
            db.add(ev_file)
            db.flush()

            ev_marker = EvidenceMarker(
                evidence_file_id=ev_file.id,
                marker_type="image_bounding_box",
                transcript_text="You won't be spared tonight, I will ruin you",
                linked_entity_ids=[str(ent_profile.id)]
            )
            db.add(ev_marker)
            db.flush()

            # 6. Investigation Path Revisions (Adaptive paths)
            path_rev1 = InvestigationPath(
                case_id=case2.id,
                revision_number=1,
                trigger_type="complaint",
                change_reason="Initial investigation path suggestions based on intake complaint.",
                is_active=False,
                model_used="gemini-2.5-pro"
            )
            db.add(path_rev1)
            db.flush()

            step1 = PathStep(
                path_id=path_rev1.id,
                step_order=1,
                title="Identify Profile",
                description="Verify the URL/handle instagram.com/fake_profile_123",
                sop_citation="Online Harassment SOP Section 1",
                status=StepStatus.DONE,
                suggested_action_type=None
            )
            step2 = PathStep(
                path_id=path_rev1.id,
                step_order=2,
                title="Preserve Platform Data",
                description="Send subscriber information request to Meta Platforms Inc.",
                sop_citation="Online Harassment SOP Section 2",
                status=StepStatus.DONE,
                suggested_action_type="platform"
            )
            db.add_all([step1, step2])
            db.flush()

            path_rev2 = InvestigationPath(
                case_id=case2.id,
                parent_path_id=path_rev1.id,
                revision_number=2,
                trigger_type="provider_response",
                change_reason="Meta response linked profile to suspect phone 9876543210 and email culprit@harass.com.",
                is_active=True,
                model_used="gemini-2.5-pro"
            )
            db.add(path_rev2)
            db.flush()

            step3 = PathStep(
                path_id=path_rev2.id,
                step_order=1,
                title="Identify Profile",
                description="Verify the URL/handle instagram.com/fake_profile_123",
                sop_citation="Online Harassment SOP Section 1",
                status=StepStatus.DONE,
                suggested_action_type=None
            )
            step4 = PathStep(
                path_id=path_rev2.id,
                step_order=2,
                title="Preserve Platform Data",
                description="Send subscriber information request to Meta Platforms Inc.",
                sop_citation="Online Harassment SOP Section 2",
                status=StepStatus.DONE,
                suggested_action_type="platform"
            )
            step5 = PathStep(
                path_id=path_rev2.id,
                step_order=3,
                title="Analyze Phone & Email data",
                description="Request CDR for subscriber phone +91 98765 43210 and trace IP logins",
                sop_citation="Online Harassment SOP Section 3",
                status=StepStatus.PENDING,
                suggested_action_type="telecom"
            )
            db.add_all([step3, step4, step5])
            db.flush()

            # 7. Legal Requests & Provider Responses for Case 2
            req_platform = LegalRequest(
                case_id=case2.id,
                path_step_id=step4.id,
                provider_type=ProviderType.PLATFORM,
                provider_name="Meta Platforms Inc.",
                template_used="platform_data.txt.j2",
                generated_body="""Subject: Request for Subscriber Information - @fake_profile_123
Official Legal Request under Section 94 of BNSS (Bharatiya Nagarik Suraksha Sanhita).
Date: 2026-07-14

To,
The Nodal Officer,
Meta Platforms Inc.

Pursuant to the investigation of Case ERH26-CYB-0002, please preserve and extract the subscriber registration and IP access logs for the profile:
- URL/Handle: @fake_profile_123
- Action period: 2026-07-01 to 2026-07-14

Investigating Officer,
Inspector Asha Patel""",
                recipient_email="nodal.officer@meta.com",
                status=RequestStatus.RESPONDED,
                dispatched_at=datetime.utcnow()
            )
            db.add(req_platform)
            db.flush()

            resp_platform = ProviderResponse(
                legal_request_id=req_platform.id,
                received_at=datetime.utcnow(),
                file_path=None,
                parsed_data={"records": [{"username": "fake_profile_123", "email": "culprit@harass.com", "ip_address": "103.88.22.14", "registration_phone": "9876543210"}]},
                ai_insights="Meta Response shows account registration used email culprit@harass.com and registration phone 9876543210. IP address 103.88.22.14 was used during the harassment event timestamp."
            )
            db.add(resp_platform)
            db.flush()

            # Draft request that will fail the quality gate checklist
            req_telecom_fail = LegalRequest(
                case_id=case2.id,
                path_step_id=step5.id,
                provider_type=ProviderType.TELECOM,
                provider_name="Airtel",
                template_used="telecom_cdr.txt.j2",
                generated_body="""Official Telecom Request to Airtel.
Missing dates. Missing target identifiers. Missing legal basis.""",
                recipient_email="invalid-email-address",
                status=RequestStatus.DRAFT
            )
            db.add(req_telecom_fail)
            db.flush()

            # 8. Citations & Copilot messages for Case 2
            user_msg_c2_1 = CopilotMessage(
                case_id=case2.id,
                user_id=users["io"].id,
                role="user",
                message="What did Meta's response reveal about the suspect profile?",
            )
            db.add(user_msg_c2_1)
            db.flush()

            cit_c2_1 = AiCitation(
                case_id=case2.id,
                output_type="copilot_message",
                output_id=uuid.uuid4(),  # placeholder
                source_type="provider_response",
                source_id=str(resp_platform.id),
                excerpt="registered with phone +91 98765 43210 and email culprit@harass.com",
                locator="Meta Platforms Response Row #1",
                confidence=0.98
            )
            db.add(cit_c2_1)
            db.flush()

            assistant_msg_c2_1 = CopilotMessage(
                case_id=case2.id,
                user_id=None,
                role="assistant",
                message="According to the **Meta Platforms Response**, the suspect account `@fake_profile_123` was registered using the phone number **9876543210** and the email **culprit@harass.com**, accessing from IP **103.88.22.14**.",
                cited_source_ids=[str(cit_c2_1.id)]
            )
            db.add(assistant_msg_c2_1)
            db.flush()
            cit_c2_1.output_id = assistant_msg_c2_1.id
            db.flush()

            # 9. Audit events for Case 2
            record(db, case_id=case2.id, user_id=users["io"].id, action="complaint_ingested", detail={"source": "upload_complaint"})
            record(db, case_id=case2.id, user_id=users["io"].id, action="entities_extracted", detail={"count": 3})
            record(db, case_id=case2.id, user_id=users["io"].id, action="path_generated", detail={"revision": 1})
            record(db, case_id=case2.id, user_id=users["io"].id, action="request_dispatched", detail={"request_id": str(req_platform.id)})
            record(db, case_id=case2.id, user_id=None, action="response_received", detail={"response_id": str(resp_platform.id)})
            record(db, case_id=case2.id, user_id=None, action="path_revision_generated", detail={"revision": 2, "trigger": "provider_response"})

            # 10. CaseWorkflowState for Case 2
            workflow2 = CaseWorkflowState(
                case_id=case2.id,
                current_stage="summarize",
                blocker_codes=[],
                next_action_type="generate_summary",
                next_action_label="Generate Case Summary / मामले का सारांश बनाएं",
                updated_at=datetime.utcnow()
            )
            db.add(workflow2)
            db.flush()

        if not db.scalar(select(LegalSection).limit(1)):
            db.add_all(
                LegalSection(code=code, section_number=number, title=title, text=text)
                for code, number, title, text in legal_sections()
            )

        if not db.scalar(select(SopDocument).limit(1)):
            for title, crime_type, source_file, chunks in SOPS:
                doc = SopDocument(title=title, crime_type=crime_type, source_file=source_file)
                db.add(doc)
                db.flush()
                try:
                    vectors = embed(chunks)
                except Exception:
                    vectors = [deterministic_embedding(chunk) for chunk in chunks]
                for chunk, vector in zip(chunks, vectors, strict=True):
                    db.add(SopChunk(sop_document_id=doc.id, chunk_text=f"{title}: {chunk}", embedding=vector))

        # Seed copilot messages & citations for Case 1
        case = db.scalar(select(Case).where(Case.case_number == "ERH26-CYB-0001"))
        user_io = db.scalar(select(User).where(User.username == "io"))
        if case and user_io:
            # 1. Next Action
            user_msg_1 = CopilotMessage(
                case_id=case.id,
                user_id=user_io.id,
                role="user",
                message="What is the next best action for this case?",
            )
            db.add(user_msg_1)
            db.flush()

            sop_chunk_cyber = db.scalar(
                select(SopChunk)
                .join(SopDocument)
                .where(SopDocument.crime_type == "cyber_fraud")
                .limit(1)
            )

            cit_1 = AiCitation(
                case_id=case.id,
                output_type="copilot_message",
                output_id=uuid.uuid4(),  # placeholder
                source_type="sop_chunk",
                source_id=str(sop_chunk_cyber.id) if sop_chunk_cyber else "mock_sop_chunk",
                excerpt="Preserve digital evidence, request bank freeze/KYC, and obtain CDR",
                locator="Cyber Financial Fraud SOP Section 2",
                confidence=0.95
            )
            db.add(cit_1)
            db.flush()

            assistant_msg_1 = CopilotMessage(
                case_id=case.id,
                user_id=None,
                role="assistant",
                message="Based on the **Cyber Financial Fraud SOP**, the recommended next action is to preserve all digital evidence, submit a bank freeze/KYC request to the beneficiary bank, and obtain Call Detail Records (CDR) for all suspect phone numbers.",
                cited_source_ids=[str(cit_1.id)]
            )
            db.add(assistant_msg_1)
            db.flush()
            cit_1.output_id = assistant_msg_1.id
            db.flush()

            # 2. Missing Facts
            user_msg_2 = CopilotMessage(
                case_id=case.id,
                user_id=user_io.id,
                role="user",
                message="What facts or information are currently missing or unverified?",
            )
            db.add(user_msg_2)
            db.flush()

            cit_2 = AiCitation(
                case_id=case.id,
                output_type="copilot_message",
                output_id=uuid.uuid4(),  # placeholder
                source_type="complaint",
                source_id="complaint_text",
                excerpt="No complaint text ingested yet",
                locator="Complaint Intake form",
                confidence=0.9
            )
            db.add(cit_2)
            db.flush()

            assistant_msg_2 = CopilotMessage(
                case_id=case.id,
                user_id=None,
                role="assistant",
                message="Currently, the complaint text has not been fully processed or translation is pending. We need the original complaint file to extract key victim details, transaction IDs, suspect UPI handles, and exact timestamps of the fraud.",
                cited_source_ids=[str(cit_2.id)]
            )
            db.add(assistant_msg_2)
            db.flush()
            cit_2.output_id = assistant_msg_2.id
            db.flush()

            # 3. Evidence Explanation
            user_msg_3 = CopilotMessage(
                case_id=case.id,
                user_id=user_io.id,
                role="user",
                message="Can you explain the evidence in this case?",
            )
            db.add(user_msg_3)
            db.flush()

            cit_3 = AiCitation(
                case_id=case.id,
                output_type="copilot_message",
                output_id=uuid.uuid4(),  # placeholder
                source_type="audit_event",
                source_id="case_created",
                excerpt="case.seeded",
                locator="Audit logs",
                confidence=0.85
            )
            db.add(cit_3)
            db.flush()

            assistant_msg_3 = CopilotMessage(
                case_id=case.id,
                user_id=None,
                role="assistant",
                message="This case has just been registered. No physical or digital evidence files (like screenshots or PDFs) have been uploaded to the evidence gallery yet. Please upload relevant transaction receipts or screenshots under the Evidence tab to help verify the suspect records.",
                cited_source_ids=[str(cit_3.id)]
            )
            db.add(assistant_msg_3)
            db.flush()
            cit_3.output_id = assistant_msg_3.id
            db.flush()

        db.commit()


if __name__ == "__main__":
    main()
