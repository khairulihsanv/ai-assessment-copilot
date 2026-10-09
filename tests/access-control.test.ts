import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, db } = vi.hoisted(() => ({
  authMock: vi.fn(),
  db: {
    class: { findUnique: vi.fn() },
    assignment: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
    enrollment: { findUnique: vi.fn() },
    submission: { findUnique: vi.fn(), findMany: vi.fn() },
    rubric: { findFirst: vi.fn() },
    documentVersion: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

import { POST as uploadReference } from "@/app/api/classes/[classId]/assignments/[assignmentId]/reference-documents/route";
import {
  DELETE as deleteAssignment,
  PATCH as patchAssignment,
} from "@/app/api/classes/[classId]/assignments/[assignmentId]/route";
import { GET as submissions } from "@/app/api/classes/[classId]/assignments/[assignmentId]/submissions/route";
import { GET as assignments } from "@/app/api/classes/[classId]/assignments/route";
import { POST as approveDocument } from "@/app/api/document-versions/[id]/approve/route";
import { POST as finalize } from "@/app/api/submissions/[submissionId]/finalize/route";

const classParams = { params: Promise.resolve({ classId: "class-1" }) };
const assignmentParams = {
  params: Promise.resolve({ classId: "class-1", assignmentId: "task-1" }),
};
const req = () => new Request("http://localhost/api/test");

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ user: { id: "student", role: "MAHASISWA" } });
  db.class.findUnique.mockResolvedValue({
    dosenId: "teacher",
    enrollments: [{ userId: "student", role: "STUDENT" }],
  });
  db.assignment.findMany.mockResolvedValue([]);
});

describe("Authorization handler contracts (mock DB, not integration)", () => {
  it("does not claim an approved document is indexed and READY", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher", role: "DOSEN" } });
    db.documentVersion.findUnique.mockResolvedValue({
      extractionStatus: "REVIEW_REQUIRED",
      document: { assignment: { classId: "class-1" } },
    });
    db.documentVersion.updateMany.mockResolvedValue({ count: 1 });
    const response = await approveDocument(req(), { params: Promise.resolve({ id: "doc-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "APPROVED", indexingPending: true });
    expect(db.documentVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "doc-1", extractionStatus: "REVIEW_REQUIRED" },
      data: { extractionStatus: "APPROVED", approvedById: "teacher", approvedAt: expect.any(Date) },
    });
  });
  it("rejects reference uploads targeting an assignment in another class before reading files", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher", role: "DOSEN" } });
    db.assignment.findFirst.mockResolvedValue(null);
    expect((await uploadReference(req(), assignmentParams)).status).toBe(404);
    expect(db.assignment.findFirst).toHaveBeenCalledWith({
      where: { id: "task-1", classId: "class-1" },
      select: { id: true },
    });
  });
  it("rejects unauthenticated requests before querying data", async () => {
    authMock.mockResolvedValue(null);
    expect((await assignments(req(), classParams)).status).toBe(401);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
  });

  it("rejects users not enrolled in the class", async () => {
    db.class.findUnique.mockResolvedValue({ dosenId: "teacher", enrollments: [] });
    expect((await assignments(req(), classParams)).status).toBe(403);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
  });

  it("selects only public rubric fields and released grades for students", async () => {
    expect((await assignments(req(), classParams)).status).toBe(200);
    const query = db.assignment.findMany.mock.calls[0]?.[0];
    expect(query.include.rubric.include.criteria).toEqual({
      select: {
        id: true,
        label: true,
        description: true,
        maxScore: true,
        weight: true,
        rubricId: true,
      },
    });
    expect(query.include.submissions.where).toEqual({ userId: "student" });
    expect(query.include.submissions.include.grades.where).toEqual({ status: "RELEASED" });
    expect(query.where.status).toEqual({ not: "DRAFT" });
  });

  it("filters grades by the explicit release pointer, not creation time", async () => {
    db.assignment.findMany.mockResolvedValue([
      {
        id: "task-1",
        submissions: [
          {
            releasedGradeId: "published",
            grades: [
              { id: "other", status: "RELEASED" },
              { id: "published", status: "RELEASED" },
              { id: "draft", status: "DRAFT" },
            ],
          },
        ],
      },
    ]);
    const data = await (await assignments(req(), classParams)).json();
    expect(data[0].submissions[0].grades).toEqual([{ id: "published", status: "RELEASED" }]);
  });

  it("rejects outsiders on the submissions endpoint", async () => {
    db.assignment.findFirst.mockResolvedValue({
      status: "PUBLISHED",
      class: { dosenId: "teacher", enrollments: [] },
    });
    expect((await submissions(req(), assignmentParams)).status).toBe(403);
    expect(db.submission.findMany).not.toHaveBeenCalled();
  });

  it("calls the real finalize handler and rejects assistants", async () => {
    authMock.mockResolvedValue({ user: { id: "assistant", role: "MAHASISWA" } });
    expect(
      (await finalize(req(), { params: Promise.resolve({ submissionId: "sub-1" }) })).status,
    ).toBe(403);
    expect(db.submission.findUnique).not.toHaveBeenCalled();
  });

  it("rejects another lecturer on finalize", async () => {
    authMock.mockResolvedValue({ user: { id: "other-teacher", role: "DOSEN" } });
    db.submission.findUnique.mockResolvedValue({ assignment: { class: { dosenId: "teacher" } } });
    expect(
      (await finalize(req(), { params: Promise.resolve({ submissionId: "sub-1" }) })).status,
    ).toBe(403);
  });

  it("binds assignment deletion to the authorized class", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher", role: "DOSEN" } });
    db.assignment.delete.mockResolvedValue({});
    expect((await deleteAssignment(req(), assignmentParams)).status).toBe(200);
    expect(db.assignment.delete).toHaveBeenCalledWith({
      where: { id: "task-1", classId: "class-1" },
    });
  });

  it("rejects assigning a rubric from another class", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher", role: "DOSEN" } });
    db.rubric.findFirst.mockResolvedValue(null);
    const request = new Request("http://localhost/api/test", {
      method: "PATCH",
      body: JSON.stringify({ rubricId: "foreign" }),
    });
    expect((await patchAssignment(request, assignmentParams)).status).toBe(400);
    expect(db.assignment.update).not.toHaveBeenCalled();
  });
});
