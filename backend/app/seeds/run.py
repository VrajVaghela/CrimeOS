import hashlib
import os
import sys
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
    PathStep, LegalRequest, ProviderResponse, CaseWorkflowState,
    OsintScan, SocialProfile, DataBreach, OsintSnapshot
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
    # Dropping every table is a local dev convenience, never a deploy-time default:
    # docker-compose.prod.yml runs this script on every backend container start, so an
    # unconditional drop_all() would wipe the database on each restart. Opt in with
    # `SEED_RESET=1` or `python -m app.seeds.run --reset`.
    reset = "--reset" in sys.argv or os.getenv("SEED_RESET", "").strip().lower() in {"1", "true", "yes"}
    if reset:
        print("SEED_RESET enabled — dropping all tables before reseeding.")
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
                canonical_value="Fake_Profile_123",
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
                next_action_label="Generate Case Summary / मामले का साराංශ बनाएं",
                updated_at=datetime.utcnow()
            )
            db.add(workflow2)
            db.flush()

            # 11. Seed OSINT Scan and Results for Case 2
            # A. Email scan (HIGH/CRITICAL risk)
            scan_email = OsintScan(
                case_id=case2.id,
                entity_id=ent_email.id,
                entity_type="email",
                entity_value="culprit@harass.com",
                status="COMPLETED",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            db.add(scan_email)
            db.flush()

            # Social Profiles for Email Scan
            db.add_all([
                SocialProfile(
                    scan_id=scan_email.id,
                    platform="Spotify",
                    username="culprit@harass.com",
                    profile_url="",
                    exists_confidence="LIKELY"
                ),
                SocialProfile(
                    scan_id=scan_email.id,
                    platform="Netflix",
                    username="culprit@harass.com",
                    profile_url="",
                    exists_confidence="LIKELY"
                ),
                SocialProfile(
                    scan_id=scan_email.id,
                    platform="Amazon",
                    username="culprit@harass.com",
                    profile_url="",
                    exists_confidence="UNCERTAIN"
                )
            ])

            # Data Breaches for Email Scan
            db.add_all([
                DataBreach(
                    scan_id=scan_email.id,
                    breach_name="DataVault Leak 2021",
                    breach_domain="datavault.example.com",
                    leak_date="2021-03-15",
                    exposed_data_classes=["Emails", "Passwords", "Financial Credentials"],
                    record_count=4200000,
                    severity="CRITICAL",
                    source_note="Credential dump found on paste site"
                ),
                DataBreach(
                    scan_id=scan_email.id,
                    breach_name="ShopSphere Exposure 2020",
                    breach_domain="shopsphere.example.com",
                    leak_date="2020-11-02",
                    exposed_data_classes=["Emails", "Passwords", "Physical Address"],
                    record_count=12500000,
                    severity="HIGH",
                    source_note="E-commerce platform database breach"
                )
            ])
            db.flush()

            # Compute and save snapshot for Email
            email_snapshot_data = {
                "scan": {
                    "id": str(scan_email.id),
                    "case_id": str(case2.id),
                    "entity_id": str(ent_email.id),
                    "entity_type": "email",
                    "entity_value": "culprit@harass.com",
                    "status": "COMPLETED",
                    "started_at": scan_email.started_at.isoformat(),
                    "completed_at": scan_email.completed_at.isoformat()
                },
                "social_profiles": [
                    {"platform": "Spotify", "username": "culprit@harass.com", "profile_url": "", "exists_confidence": "LIKELY", "profile_picture_url": None, "bio": None, "location_hint": None, "timezone_hint": None, "follower_count": None, "follower_count_delta": None, "bio_changed": False, "location_changed": False, "is_verified": False},
                    {"platform": "Netflix", "username": "culprit@harass.com", "profile_url": "", "exists_confidence": "LIKELY", "profile_picture_url": None, "bio": None, "location_hint": None, "timezone_hint": None, "follower_count": None, "follower_count_delta": None, "bio_changed": False, "location_changed": False, "is_verified": False},
                    {"platform": "Amazon", "username": "culprit@harass.com", "profile_url": "", "exists_confidence": "UNCERTAIN", "profile_picture_url": None, "bio": None, "location_hint": None, "timezone_hint": None, "follower_count": None, "follower_count_delta": None, "bio_changed": False, "location_changed": False, "is_verified": False}
                ],
                "breaches": [
                    {"breach_name": "DataVault Leak 2021", "breach_domain": "datavault.example.com", "leak_date": "2021-03-15", "exposed_data_classes": ["Emails", "Passwords", "Financial Credentials"], "record_count": 4200000, "severity": "CRITICAL", "source_note": "Credential dump found on paste site"},
                    {"breach_name": "ShopSphere Exposure 2020", "breach_domain": "shopsphere.example.com", "leak_date": "2020-11-02", "exposed_data_classes": ["Emails", "Passwords", "Physical Address"], "record_count": 12500000, "severity": "HIGH", "source_note": "E-commerce platform database breach"}
                ],
                "risk_summary": {
                    "total_breaches": 2,
                    "critical_breaches": 1,
                    "platforms_found": 3,
                    "overall_risk_level": "CRITICAL"
                }
            }
            db.add(OsintSnapshot(scan_id=scan_email.id, case_id=case2.id, entity_id=ent_email.id, snapshot_data=email_snapshot_data))

            # B. Person scan (fake_profile_123) -> returns bio with unconfirmed pivots
            scan_profile = OsintScan(
                case_id=case2.id,
                entity_id=ent_profile.id,
                entity_type="person",
                entity_value="Fake_Profile_123",
                status="COMPLETED",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            db.add(scan_profile)
            db.flush()

            bio_text = "Coffee addict & code writer. Contact me at partner_in_crime@steal.com or call +919999988888 @another_alias"
            sp = SocialProfile(
                scan_id=scan_profile.id,
                platform="GitHub",
                username="fake_profile_123",
                profile_url="https://github.com/fake_profile_123",
                profile_picture_url="https://api.dicebear.com/7.x/initials/svg?seed=fake_profile_123",
                bio=bio_text,
                location_hint="India",
                timezone_hint="IST",
                follower_count=137,
                is_verified=False,
                exists_confidence="CONFIRMED"
            )
            db.add(sp)
            db.flush()

            # Save Snapshot for Person
            person_snapshot_data = {
                "scan": {
                    "id": str(scan_profile.id),
                    "case_id": str(case2.id),
                    "entity_id": str(ent_profile.id),
                    "entity_type": "person",
                    "entity_value": "Fake_Profile_123",
                    "status": "COMPLETED",
                    "started_at": scan_profile.started_at.isoformat(),
                    "completed_at": scan_profile.completed_at.isoformat()
                },
                "social_profiles": [
                    {
                        "platform": "GitHub",
                        "username": "fake_profile_123",
                        "profile_url": "https://github.com/fake_profile_123",
                        "profile_picture_url": "https://api.dicebear.com/7.x/initials/svg?seed=fake_profile_123",
                        "bio": bio_text,
                        "location_hint": "India",
                        "timezone_hint": "IST",
                        "follower_count": 137,
                        "follower_count_delta": None,
                        "bio_changed": False,
                        "location_changed": False,
                        "is_verified": False,
                        "exists_confidence": "CONFIRMED"
                    }
                ],
                "breaches": [],
                "risk_summary": {
                    "total_breaches": 0,
                    "critical_breaches": 0,
                    "platforms_found": 1,
                    "overall_risk_level": "LOW"
                }
            }
            db.add(OsintSnapshot(scan_id=scan_profile.id, case_id=case2.id, entity_id=ent_profile.id, snapshot_data=person_snapshot_data))

            # C. Seed unconfirmed pivot entities in case_entities & AiCitations linked to scan_profile
            # email pivot: partner_in_crime@steal.com
            pivot_email = CaseEntity(
                case_id=case2.id,
                entity_type="email",
                canonical_value="partner_in_crime@steal.com",
                display_value="partner_in_crime@steal.com",
                confidence=0.95,
                status="unconfirmed"
            )
            # phone pivot: +919999988888
            pivot_phone = CaseEntity(
                case_id=case2.id,
                entity_type="phone",
                canonical_value="919999988888",
                display_value="+919999988888",
                confidence=0.85,
                status="unconfirmed"
            )
            # person pivot: @another_alias
            pivot_alias = CaseEntity(
                case_id=case2.id,
                entity_type="person",
                canonical_value="another_alias",
                display_value="@another_alias",
                confidence=0.80,
                status="unconfirmed"
            )
            db.add_all([pivot_email, pivot_phone, pivot_alias])
            db.flush()

            # --- Phase 10A: Timeline seeds for Case 2 ---
            # AI-synthesized chronological timeline events
            from app.models.timeline import TimelineEvent

            tl_event_1 = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 1, 10, 30),
                event_type="complaint_filed",
                title="Victim Files Complaint",
                description="Inspector Asha Patel receives a written complaint from the victim reporting sustained online harassment and identity theft from account @fake_profile_123.",
                location="Ahmedabad, GJ",
                confidence=1.0,
                ai_generated=False,
                source_ref={"type": "complaint", "id": str(complaint2.id)},
            )
            tl_event_2 = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 2, 14, 15),
                event_type="entity_extracted",
                title="Suspect Identifiers Extracted by AI",
                description="Gemini Flash extracted phone 9876543210, email culprit@harass.com, and social handle @fake_profile_123 from the Gujarati image complaint with high confidence.",
                confidence=0.95,
                ai_generated=True,
                source_ref={"type": "complaint", "id": str(complaint2.id)},
            )
            tl_event_3 = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 5, 9, 0),
                event_type="request_dispatched",
                title="Legal Request Sent to Meta Platforms",
                description="Inspector Asha Patel dispatched a legal preservation request to Meta Platforms Inc. for subscriber data and IP access logs for @fake_profile_123.",
                location=None,
                confidence=None,
                ai_generated=False,
                source_ref={"type": "legal_request", "id": str(req_platform.id)},
            )
            tl_event_4 = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 7, 11, 45),
                event_type="response_received",
                title="Meta Platforms Responds with Subscriber Data",
                description="Meta Platforms Inc. confirmed the harassing account registered with phone 9876543210 and email culprit@harass.com, accessing from IP 103.88.22.14 during the incident window.",
                confidence=0.98,
                ai_generated=True,
                source_ref={"type": "provider_response", "id": str(resp_platform.id)},
            )
            # Officer note event (manually entered, no AI confidence)
            tl_event_note = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 8, 8, 0),
                event_type="officer_note",
                title="IO Observation: Suspect Likely in Ahmedabad",
                description="Based on Meta's IP geolocation data (103.88.22.14), the suspect device was operating from the Ahmedabad metropolitan area during the harassment window. Recommend cross-referencing CDR for confirmation.",
                location="Ahmedabad, GJ",
                confidence=None,
                ai_generated=False,
                source_ref={"type": "officer_note"},
            )
            # CCTV frame event (AI-analyzed image pin)
            tl_cctv_evidence = EvidenceFile(
                case_id=case2.id,
                file_path="uploads/evidence/demo_cctv_frame.jpg",
                file_type="image",
                ai_tags={
                    "forensic_description": "CCTV capture from ATM premises on 2026-07-02 showing a person matching the suspect's partial description.",
                    "tags": ["cctv", "atm", "partial-match"],
                    "confidence": 0.72,
                    "description": "Partial face visible, dark jacket, timestamp 14:22:05 IST.",
                    "flagged_elements": ["partial_face_match", "dark_jacket", "14:22:05_IST"],
                }
            )
            db.add(tl_cctv_evidence)
            db.flush()

            tl_event_cctv = TimelineEvent(
                case_id=case2.id,
                occurred_at=datetime(2026, 7, 2, 14, 22),
                event_type="cctv_frame",
                title="CCTV Frame Pinned: ATM Vicinity",
                description="Gemini Vision analyzed a CCTV capture from the ATM near the victim's residence. A person matching the suspect's partial description (dark jacket) was detected at 14:22:05 IST.",
                location="ATM, Paldi Road, Ahmedabad",
                confidence=0.72,
                ai_generated=True,
                evidence_file_id=tl_cctv_evidence.id,
                source_ref={"type": "cctv_frame", "evidence_file_id": str(tl_cctv_evidence.id)},
                cctv_analysis={
                    "persons_detected": 1,
                    "vehicles_detected": 0,
                    "forensic_flags": ["partial_face_detected", "dark_jacket"],
                    "timestamp_in_video": "00:00:05",
                    "confidence_reason": "Partial face match; insufficient for positive ID. Refer for forensic enhancement."
                }
            )
            db.add_all([tl_event_1, tl_event_2, tl_event_3, tl_event_4, tl_event_note, tl_event_cctv])
            db.flush()
            record(db, case_id=case2.id, user_id=users["io"].id, action="timeline.seeded", detail={"event_count": 6, "source": "phase_10a_seed"})

            # --- Phase 10C: Seeded video evidence fixture for Case 2 ---
            # Demonstrates the video analysis report without requiring an actual upload
            video_evidence_seed = EvidenceFile(
                case_id=case2.id,
                file_path="uploads/evidence/demo_cctv_clip.mp4",
                file_type="video",
                ai_tags={
                    "video_status": "COMPLETED",
                    "progress_percentage": 100,
                    "error_detail": None,
                    "original_sha256": "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01",
                    "duration_seconds": 45,
                    "summary": "45-second CCTV footage from ATM vicinity on 2026-07-02. One person matching partial suspect description detected at timestamp 00:00:05.",
                    "crime_summary": "Footage shows a dark-jacketed individual near the ATM at 14:22 IST on the same date as the harassment incident. Partial face detected; recommend forensic enhancement before court submission.",
                    "risk_evaluation": "MEDIUM",
                    "timeline": [
                        {"timestamp_in_video": "00:00:05", "timestamp_seconds": 5.0, "description": "Individual enters ATM vestibule. Dark jacket, obscured face."},
                        {"timestamp_in_video": "00:00:18", "timestamp_seconds": 18.0, "description": "Individual uses ATM keypad. Hand visible but face not captured."},
                        {"timestamp_in_video": "00:00:40", "timestamp_seconds": 40.0, "description": "Individual exits vestibule and moves off-camera to the south."},
                    ],
                    "entities_detected": ["Person:dark_jacket", "ATM", "Timestamp:14:22:05"]
                }
            )
            db.add(video_evidence_seed)
            db.flush()
            record(db, case_id=case2.id, user_id=users["io"].id, action="video.analysis_completed", detail={"evidence_id": str(video_evidence_seed.id), "source": "phase_10c_seed"})

            # AiCitations for pivots
            db.add_all([
                AiCitation(
                    case_id=case2.id,
                    output_type="case_entity",
                    output_id=pivot_email.id,
                    source_type="osint_scan",
                    source_id=str(scan_profile.id),
                    excerpt=f"Extracted from GitHub bio: \"{bio_text}\"",
                    locator="GitHub:bio",
                    confidence=0.95
                ),
                AiCitation(
                    case_id=case2.id,
                    output_type="case_entity",
                    output_id=pivot_phone.id,
                    source_type="osint_scan",
                    source_id=str(scan_profile.id),
                    excerpt=f"Extracted from GitHub bio: \"{bio_text}\"",
                    locator="GitHub:bio",
                    confidence=0.85
                ),
                AiCitation(
                    case_id=case2.id,
                    output_type="case_entity",
                    output_id=pivot_alias.id,
                    source_type="osint_scan",
                    source_id=str(scan_profile.id),
                    excerpt=f"Extracted from GitHub bio: \"{bio_text}\"",
                    locator="GitHub:bio",
                    confidence=0.80
                )
            ])
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
        else:
            print("Seed data already present — skipping (use SEED_RESET=1 to rebuild).")

        db.commit()


if __name__ == "__main__":
    main()
