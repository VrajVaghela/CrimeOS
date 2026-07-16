from enum import StrEnum


class UserRole(StrEnum):
    IO = "IO"
    SHO = "SHO"
    LEGAL = "LEGAL"


class SourceType(StrEnum):
    PDF = "pdf"
    IMAGE = "image"
    AUDIO = "audio"
    TEXT = "text"


class LegalCode(StrEnum):
    BNS = "BNS"
    BNSS = "BNSS"
    BSA = "BSA"


class StepStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    SKIPPED = "skipped"


class ProviderType(StrEnum):
    TELECOM = "telecom"
    BANK = "bank"
    PLATFORM = "platform"


class RequestStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    DISPATCHED = "dispatched"
    RESPONDED = "responded"
