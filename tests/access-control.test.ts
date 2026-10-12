import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const { db } = vi.hoisted(() => ({
  db: {
    class: { findUnique: vi.fn() },
    assignment: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
    enrollment: { findUnique: vi.fn() },
    submission: { findUnique: vi.fn(), findMany: vi.fn() },
    rubric: { findFirst: vi.fn() },
    documentVersion: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("../apps/backend/src/db/prisma.js", () => ({ prisma: db }));

import app from "../apps/backend/src/app.js";

function makeToken(user: { id: string; role: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role, iss: "frontend", aud: "backend" },
    process.env.INTERNAL_API_SECRET || "default_unsafe_secret_for_dev_only",
    { expiresIn: "5m" },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  db.class.findUnique.mockResolvedValue({
    dosenId: "teacher",
    enrollments: [{ userId: "student", role: "STUDENT" }],
  });
  db.assignment.findMany.mockResolvedValue([]);
});

describe("Authorization handler contracts (mock DB, not integration)", () => {
  it("does not claim an approved document is indexed and READY", async () => {
    db.documentVersion.findUnique.mockResolvedValue({
      extractionStatus: "REVIEW_REQUIRED",
      document: { assignment: { classId: "class-1" } },
    });
    db.class.findUnique.mockResolvedValue({
      dosenId: "teacher",
    });
    db.documentVersion.updateMany.mockResolvedValue({ count: 1 });

    const token = makeToken({ id: "teacher", role: "DOSEN" });
    const response = await app.request("/document-versions/doc-1/approve", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "APPROVED", indexingPending: true });
    expect(db.documentVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "doc-1", extractionStatus: "REVIEW_REQUIRED" },
      data: { extractionStatus: "APPROVED", approvedById: "teacher", approvedAt: expect.any(Date) },
    });
  });

  it("rejects reference uploads targeting an assignment in another class before reading files", async () => {
    db.class.findUnique.mockResolvedValue({
      dosenId: "teacher",
      enrollments: [],
    });
    db.assignment.findFirst.mockResolvedValue(null);

    const token = makeToken({ id: "teacher", role: "DOSEN" });
    const response = await app.request("/classes/class-1/assignments/task-1/reference-documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(404);
    expect(db.assignment.findFirst).toHaveBeenCalledWith({
      where: { id: "task-1", classId: "class-1" },
      select: { id: true },
    });
  });

  it("rejects unauthenticated requests before querying data", async () => {
    const response = await app.request("/classes/class-1/assignments");
    expect(response.status).toBe(401);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
  });

  it("rejects users not enrolled in the class", async () => {
    db.class.findUnique.mockResolvedValue({ dosenId: "teacher", enrollments: [] });
    const token = makeToken({ id: "student", role: "MAHASISWA" });
    const response = await app.request("/classes/class-1/assignments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
  });

  it("selects only public rubric fields and released grades for students", async () => {
    const token = makeToken({ id: "student", role: "MAHASISWA" });
    const response = await app.request("/classes/class-1/assignments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
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

    const token = makeToken({ id: "student", role: "MAHASISWA" });
    const response = await app.request("/classes/class-1/assignments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    expect(data[0].submissions[0].grades).toEqual([{ id: "published", status: "RELEASED" }]);
  });

  it("rejects outsiders on the submissions endpoint", async () => {
    db.assignment.findFirst.mockResolvedValue({
      status: "PUBLISHED",
      class: { dosenId: "teacher", enrollments: [] },
    });

    const token = makeToken({ id: "student", role: "MAHASISWA" });
    const response = await app.request("/classes/class-1/assignments/task-1/submissions", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
    expect(db.submission.findMany).not.toHaveBeenCalled();
  });

  it("calls the real finalize handler and rejects assistants", async () => {
    const token = makeToken({ id: "assistant", role: "MAHASISWA" });
    const response = await app.request("/submissions/sub-1/finalize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
    expect(db.submission.findUnique).not.toHaveBeenCalled();
  });

  it("rejects another lecturer on finalize", async () => {
    db.submission.findUnique.mockResolvedValue({ assignment: { class: { dosenId: "teacher" } } });

    const token = makeToken({ id: "other-teacher", role: "DOSEN" });
    const response = await app.request("/submissions/sub-1/finalize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
  });

  it("binds assignment deletion to the authorized class", async () => {
    db.class.findUnique.mockResolvedValue({ dosenId: "teacher" });
    db.assignment.delete.mockResolvedValue({});

    const token = makeToken({ id: "teacher", role: "DOSEN" });
    const response = await app.request("/classes/class-1/assignments/task-1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(db.assignment.delete).toHaveBeenCalledWith({
      where: { id: "task-1", classId: "class-1" },
    });
  });

  it("rejects assigning a rubric from another class", async () => {
    db.class.findUnique.mockResolvedValue({ dosenId: "teacher" });
    db.rubric.findFirst.mockResolvedValue(null);

    const token = makeToken({ id: "teacher", role: "DOSEN" });
    const response = await app.request("/classes/class-1/assignments/task-1", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rubricId: "foreign" }),
    });

    expect(response.status).toBe(400);
    expect(db.assignment.update).not.toHaveBeenCalled();
  });
});
