import enum


class Tradition(str, enum.Enum):
    AYURVEDA = "ayurveda"
    TCM = "tcm"
    UNANI = "unani"
    OTHER = "other"


class ResolutionStatus(str, enum.Enum):
    UNRESOLVED = "unresolved"
    NEEDS_REVIEW = "needs_review"
    RESOLVED = "resolved"


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingType(str, enum.Enum):
    SHARED_TARGET = "shared_target"
    SHARED_PATHWAY = "shared_pathway"
    KNOWN_INTERACTION = "known_interaction"
    PATHWAY_COMPLEMENT = "pathway_complement"


class EvidenceTier(str, enum.Enum):
    CURATED = "curated"
    MEASURED = "measured"
    INFERRED = "inferred"
    PREDICTED = "predicted"
