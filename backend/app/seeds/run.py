import hashlib
from collections.abc import Iterable

from sqlalchemy import select

from app.ai.gemini_client import embed
from app.database import Base, SessionLocal, engine
from app.models import Case, LegalCode, LegalSection, SopChunk, SopDocument, User, UserRole
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

        db.commit()


if __name__ == "__main__":
    main()
