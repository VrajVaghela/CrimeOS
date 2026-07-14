import hashlib
from collections.abc import Iterable

from sqlalchemy import select

from app.ai.gemini_client import embed
from app.database import Base, SessionLocal, engine
import uuid
from app.models import Case, LegalCode, LegalSection, SopChunk, SopDocument, User, UserRole, CopilotMessage, AiCitation
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

            case2 = Case(
                case_number="ERH26-CYB-0002",
                title="Social media harassment and identity theft",
                status="open",
                crime_type="harassment",
                created_by=users["io"].id,
            )
            db.add(case2)
            db.flush()
            record(db, case_id=case2.id, user_id=users["io"].id, action="case.seeded", detail={"source": "phase_6_seed"})

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
