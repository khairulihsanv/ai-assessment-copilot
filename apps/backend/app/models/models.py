import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from app.database import Base
from app.models.enums import (
    AssignmentStatus,
    ClassRole,
    DocumentStatus,
    JobStatus,
    JobType,
    Role,
    SourceType,
    SubmissionType,
)

# Safe JSON type compatible with SQLite in tests and PostgreSQL in production
JsonType = JSON().with_variant(JSONB, "postgresql")


def generate_id() -> str:
    """Generate unique identifier compatible with string IDs in Prisma (cuid/uuid)."""
    return "c" + uuid.uuid4().hex[:24]


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    passwordHash = Column(String, nullable=False)
    role = Column(SQLEnum(Role, name="Role", create_type=False), nullable=False)
    avatarUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    owned_classes = relationship("Class", back_populates="dosen", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    graded_grades = relationship("GradeRevision", back_populates="graded_by", cascade="all, delete-orphan")
    created_rubrics = relationship("Rubric", back_populates="created_by", cascade="all, delete-orphan")
    owned_documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")


class Class(Base):
    __tablename__ = "classes"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    enrollmentKey = Column(String, unique=True, nullable=False, index=True)
    isArchived = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    dosenId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    dosen = relationship("User", back_populates="owned_classes")
    enrollments = relationship("Enrollment", back_populates="class_", cascade="all, delete-orphan")
    rubrics = relationship("Rubric", back_populates="class_", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String, primary_key=True, default=generate_id)
    role = Column(SQLEnum(ClassRole, name="ClassRole", create_type=False), default=ClassRole.STUDENT, nullable=False)
    joinedAt = Column(DateTime, default=func.now(), nullable=False)

    classId = Column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    mahasiswaId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("classId", "mahasiswaId", name="enrollments_classId_mahasiswaId_key"),
    )

    class_ = relationship("Class", back_populates="enrollments")
    user = relationship("User", back_populates="enrollments")


class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(String, primary_key=True, default=generate_id)
    title = Column(String, nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    classId = Column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    createdById = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    class_ = relationship("Class", back_populates="rubrics")
    created_by = relationship("User", back_populates="created_rubrics")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan", order_by="RubricCriterion.id")
    assignments = relationship("Assignment", back_populates="rubric")


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(String, primary_key=True, default=generate_id)
    label = Column(String, nullable=False)
    description = Column(String, nullable=True)
    maxScore = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    expectedAnswer = Column(String, nullable=True)

    answerKey = Column(Text, nullable=True)
    material = Column(Text, nullable=True)
    answerKeyEmbedding = Column(JsonType, nullable=True)
    materialEmbedding = Column(JsonType, nullable=True)

    rubricId = Column(String, ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False)

    rubric = relationship("Rubric", back_populates="criteria")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=generate_id)
    title = Column(String, nullable=False)
    instructions = Column(Text, nullable=False)
    submissionType = Column(SQLEnum(SubmissionType, name="SubmissionType", create_type=False), default=SubmissionType.ANY, nullable=False)
    dueDate = Column(DateTime, nullable=False)
    maxScore = Column(Float, default=100.0, nullable=False)
    allowLateSubmission = Column(Boolean, default=False, nullable=False)
    allowScan = Column(Boolean, default=True, nullable=False)
    status = Column(SQLEnum(AssignmentStatus, name="AssignmentStatus", create_type=False), default=AssignmentStatus.DRAFT, nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    classId = Column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    rubricId = Column(String, ForeignKey("rubrics.id", ondelete="SET NULL"), nullable=True)

    class_ = relationship("Class", back_populates="assignments")
    rubric = relationship("Rubric", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="assignment", cascade="all, delete-orphan")
    reference_sets = relationship("ReferenceSetVersion", back_populates="assignment", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=generate_id)
    assignmentId = Column(String, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    mahasiswaId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    activeVersionId = Column(String, nullable=True)
    releasedGradeId = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("assignmentId", "mahasiswaId", name="submissions_assignmentId_mahasiswaId_key"),
    )

    assignment = relationship("Assignment", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    versions = relationship("SubmissionVersion", back_populates="submission", cascade="all, delete-orphan", order_by="SubmissionVersion.versionNumber.desc()")
    evaluations = relationship("EvaluationRun", back_populates="submission", cascade="all, delete-orphan")
    grades = relationship("GradeRevision", back_populates="submission", cascade="all, delete-orphan")


class SubmissionVersion(Base):
    __tablename__ = "submission_versions"

    id = Column(String, primary_key=True, default=generate_id)
    submissionId = Column(String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    versionNumber = Column(Integer, nullable=False)
    type = Column(SQLEnum(SubmissionType, name="SubmissionType", create_type=False), nullable=False)
    content = Column(Text, nullable=True)
    fileUrl = Column(String, nullable=True)
    fileName = Column(String, nullable=True)
    rawOcrText = Column(Text, nullable=True)
    isEdited = Column(Boolean, default=False, nullable=False)
    ocrStatus = Column(String, default="NONE", nullable=False)
    pageCount = Column(Integer, default=1, nullable=False)
    submittedAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("submissionId", "versionNumber", name="submission_versions_submissionId_versionNumber_key"),
    )

    submission = relationship("Submission", back_populates="versions")
    pages = relationship("SubmissionPage", back_populates="version", cascade="all, delete-orphan", order_by="SubmissionPage.pageNumber.asc()")
    evaluations = relationship("EvaluationRun", back_populates="version", cascade="all, delete-orphan")
    grades = relationship("GradeRevision", back_populates="version")


class SubmissionPage(Base):
    __tablename__ = "submission_pages"

    id = Column(String, primary_key=True, default=generate_id)
    submissionVersionId = Column(String, ForeignKey("submission_versions.id", ondelete="CASCADE"), nullable=False)
    pageNumber = Column(Integer, nullable=False)
    imageUrl = Column(String, nullable=True)
    imageName = Column(String, nullable=True)
    mimeType = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    extractedText = Column(Text, nullable=True)
    confirmedText = Column(Text, nullable=True)
    ocrStatus = Column(String, default="SUCCESS", nullable=False)
    ocrError = Column(Text, nullable=True)
    source = Column(String, default="IMAGE", nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("submissionVersionId", "pageNumber", name="submission_pages_version_page_key"),
    )

    version = relationship("SubmissionVersion", back_populates="pages")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, default=generate_id)
    submissionId = Column(String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    versionId = Column(String, ForeignKey("submission_versions.id", ondelete="CASCADE"), nullable=False)

    rubricVersionSnapshot = Column(JsonType, nullable=True)
    rawModelOutput = Column(JsonType, nullable=False)
    perCriterionScore = Column(JsonType, nullable=False)
    suggestedTotalScore = Column(Float, nullable=True)
    suggestedFeedback = Column(Text, nullable=False)
    tokenUsage = Column(JsonType, nullable=True)

    referenceSetVersionId = Column(String, nullable=True)
    jobId = Column(String, unique=True, nullable=True)
    evaluatorConfig = Column(JsonType, nullable=True)
    evidence = Column(JsonType, nullable=True)

    createdAt = Column(DateTime, default=func.now(), nullable=False)
    status = Column(String, default="COMPLETED", nullable=False)
    idempotencyKey = Column(String, unique=True, nullable=True)

    submission = relationship("Submission", back_populates="evaluations")
    version = relationship("SubmissionVersion", back_populates="evaluations")


class GradeRevision(Base):
    __tablename__ = "grade_revisions"

    id = Column(String, primary_key=True, default=generate_id)
    submissionId = Column(String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    versionId = Column(String, ForeignKey("submission_versions.id", ondelete="SET NULL"), nullable=True)

    status = Column(String, default="DRAFT", nullable=False)
    finalScore = Column(Float, nullable=False)
    finalFeedback = Column(Text, nullable=False)
    isAIAssisted = Column(Boolean, default=False, nullable=False)
    editedFromAI = Column(Boolean, default=False, nullable=False)

    gradedById = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    changeReason = Column(String, nullable=True)
    legacyProvenance = Column(String, nullable=True)

    submission = relationship("Submission", back_populates="grades")
    version = relationship("SubmissionVersion", back_populates="grades")
    graded_by = relationship("User", back_populates="graded_grades")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_id)
    assignmentId = Column(String, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    ownerId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sourceType = Column(SQLEnum(SourceType, name="SourceType", create_type=False), nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    assignment = relationship("Assignment", back_populates="documents")
    owner = relationship("User", back_populates="owned_documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.versionNumber.desc()")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String, primary_key=True, default=generate_id)
    documentId = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    versionNumber = Column(Integer, nullable=False)
    objectKey = Column(String, nullable=False)
    mimeType = Column(String, nullable=False)
    checksum = Column(String, nullable=False)
    size = Column(Integer, nullable=False)

    extractionStatus = Column(SQLEnum(DocumentStatus, name="DocumentStatus", create_type=False), default=DocumentStatus.UPLOADED, nullable=False)
    errorMessage = Column(String, nullable=True)

    originalName = Column(String, nullable=True)
    parserVersion = Column(String, nullable=True)
    extractionMethod = Column(String, nullable=True)
    pageCount = Column(Integer, nullable=True)
    qualityFlags = Column(JsonType, nullable=True)
    activeIndexGeneration = Column(String, nullable=True)
    indexedAt = Column(DateTime, nullable=True)

    approvedById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approvedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("documentId", "versionNumber", name="document_versions_documentId_versionNumber_key"),
    )

    document = relationship("Document", back_populates="versions")
    approved_by = relationship("User")
    chunks = relationship("DocumentChunk", back_populates="document_version", cascade="all, delete-orphan", order_by="DocumentChunk.chunkIndex")
    reference_sets = relationship("ReferenceSetDocument", back_populates="document_version", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=generate_id)
    documentVersionId = Column(String, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False)
    chunkIndex = Column(Integer, default=0, nullable=False)
    tokenEstimate = Column(Integer, default=0, nullable=False)
    rawText = Column(Text, nullable=False)
    normalizedText = Column(Text, nullable=True)
    locator = Column(JsonType, nullable=False)
    heading = Column(String, nullable=True)
    language = Column(String, nullable=True)
    flags = Column(JsonType, nullable=True)
    checksum = Column(String, nullable=False)

    document_version = relationship("DocumentVersion", back_populates="chunks")
    embeddings = relationship("ChunkEmbedding", back_populates="chunk", cascade="all, delete-orphan")


class ChunkEmbedding(Base):
    __tablename__ = "chunk_embeddings"

    id = Column(String, primary_key=True, default=generate_id)
    chunkId = Column(String, ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    classId = Column(String, nullable=False)
    assignmentId = Column(String, nullable=False)
    documentVersionId = Column(String, nullable=False)
    sourceType = Column(SQLEnum(SourceType, name="SourceType", create_type=False), nullable=False)
    parserVersion = Column(String, nullable=True)
    checksum = Column(String, nullable=False)

    indexGeneration = Column(String, nullable=False)
    model = Column(String, nullable=False)
    dimension = Column(Integer, nullable=False)
    embedding = Column(JsonType, nullable=True)  # Native pgvector mapped as vector column in raw SQL or fallback JSON
    state = Column(String, default="READY", nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("chunkId", "indexGeneration", "model", name="chunk_embeddings_chunkId_indexGeneration_model_key"),
        Index("chunk_embeddings_assignmentId_indexGeneration_model_idx", "assignmentId", "indexGeneration", "model"),
        Index("chunk_embeddings_documentVersionId_indexGeneration_idx", "documentVersionId", "indexGeneration"),
    )

    chunk = relationship("DocumentChunk", back_populates="embeddings")


class EmbeddingCache(Base):
    __tablename__ = "embedding_cache"

    id = Column(String, primary_key=True, default=generate_id)
    scopeKey = Column(String, nullable=False)
    checksum = Column(String, nullable=False)
    model = Column(String, nullable=False)
    dimension = Column(Integer, nullable=False)
    vectors = Column(JsonType, nullable=False)
    hits = Column(Integer, default=0, nullable=False)
    createdAt = Column(DateTime, default=func.now(), nullable=False)
    lastUsedAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("scopeKey", "checksum", "model", "dimension", name="embedding_cache_scopeKey_checksum_model_dimension_key"),
    )


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_id)
    type = Column(SQLEnum(JobType, name="JobType", create_type=False), nullable=False)
    status = Column(SQLEnum(JobStatus, name="JobStatus", create_type=False), default=JobStatus.QUEUED, nullable=False)
    idempotencyKey = Column(String, unique=True, nullable=False)
    correlationId = Column(String, nullable=False)
    userId = Column(String, nullable=False)
    classId = Column(String, nullable=True)
    payload = Column(JsonType, nullable=False)
    progress = Column(JsonType, nullable=True)
    result = Column(JsonType, nullable=True)
    errorCode = Column(String, nullable=True)
    errorMessage = Column(String, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    maxAttempts = Column(Integer, default=3, nullable=False)
    runAfter = Column(DateTime, default=func.now(), nullable=False)
    leaseOwner = Column(String, nullable=True)
    leaseExpiresAt = Column(DateTime, nullable=True)
    heartbeatAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)
    startedAt = Column(DateTime, nullable=True)
    finishedAt = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("jobs_status_runAfter_idx", "status", "runAfter"),
        Index("jobs_userId_status_idx", "userId", "status"),
        Index("jobs_classId_status_idx", "classId", "status"),
    )


class ReferenceSetVersion(Base):
    __tablename__ = "reference_set_versions"

    id = Column(String, primary_key=True, default=generate_id)
    assignmentId = Column(String, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    versionNumber = Column(Integer, nullable=False)
    mapping = Column(JsonType, nullable=True)
    visibility = Column(String, default="PRIVATE", nullable=False)
    indexGeneration = Column(String, nullable=True)
    manifestHash = Column(String, nullable=True)

    approvedById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approvedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("assignmentId", "versionNumber", name="reference_set_versions_assignmentId_versionNumber_key"),
    )

    assignment = relationship("Assignment", back_populates="reference_sets")
    approved_by = relationship("User")
    documents = relationship("ReferenceSetDocument", back_populates="reference_set", cascade="all, delete-orphan")


class ReferenceSetDocument(Base):
    __tablename__ = "reference_set_documents"

    referenceSetId = Column(String, ForeignKey("reference_set_versions.id", ondelete="CASCADE"), primary_key=True)
    documentVersionId = Column(String, ForeignKey("document_versions.id", ondelete="CASCADE"), primary_key=True)

    reference_set = relationship("ReferenceSetVersion", back_populates="documents")
    document_version = relationship("DocumentVersion", back_populates="reference_sets")


class EvaluatorConfigVersion(Base):
    __tablename__ = "evaluator_config_versions"

    id = Column(String, primary_key=True, default=generate_id)
    versionNumber = Column(Integer, nullable=False)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    promptVersion = Column(String, nullable=False)
    parameters = Column(JsonType, nullable=False)
    retrievalConfig = Column(JsonType, nullable=False)
    parserVersion = Column(String, nullable=True)
    indexVersion = Column(String, nullable=True)
    createdAt = Column(DateTime, default=func.now(), nullable=False)
