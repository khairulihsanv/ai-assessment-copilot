import enum


class Role(str, enum.Enum):
    DOSEN = "DOSEN"
    MAHASISWA = "MAHASISWA"


class ClassRole(str, enum.Enum):
    STUDENT = "STUDENT"
    ASSISTANT = "ASSISTANT"


class SubmissionType(str, enum.Enum):
    TEXT = "TEXT"
    PDF = "PDF"
    DOCX = "DOCX"
    ANY = "ANY"


class AssignmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    AI_PROCESSING = "AI_PROCESSING"
    AI_REVIEWED = "AI_REVIEWED"
    GRADED = "GRADED"


class SourceType(str, enum.Enum):
    ANSWER_KEY = "ANSWER_KEY"
    MATERIAL = "MATERIAL"


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCEL_REQUESTED = "CANCEL_REQUESTED"
    CANCELLED = "CANCELLED"


class JobType(str, enum.Enum):
    DOCUMENT_EXTRACT = "DOCUMENT_EXTRACT"
    DOCUMENT_INDEX = "DOCUMENT_INDEX"
    EVALUATION = "EVALUATION"


class DocumentStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    EXTRACTING = "EXTRACTING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    APPROVED = "APPROVED"
    INDEXING = "INDEXING"
    READY = "READY"
    FAILED = "FAILED"
    RETIRED = "RETIRED"
