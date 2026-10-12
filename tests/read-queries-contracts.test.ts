import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const { db } = vi.hoisted(() => ({
  db: {
    class: { findUnique: vi.fn(), findMany: vi.fn() },
    assignment: { findFirst: vi.fn(), findMany: vi.fn() },
    enrollment: { findUnique: vi.fn(), findMany: vi.fn() },
    submission: { findUnique: vi.fn(), findMany: vi.fn() },
    rubric: { findMany: vi.fn() },
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
});

describe("Read queries authorization and data contracts (Mock DB)", () => {
  describe("GET /classes/:classId", () => {
    it("returns correct class DTO for authorized teacher and hides nothing", async () => {
      db.class.findUnique.mockResolvedValueOnce({ dosenId: "teacher-1" }); // base check
      db.class.findUnique.mockResolvedValueOnce({
        id: "class-1",
        name: "Algoritma",
        dosenId: "teacher-1",
        enrollmentKey: "ABC123",
        enrollments: [],
        assignments: [],
        rubrics: [],
        _count: { enrollments: 0, assignments: 0 },
      });

      const token = makeToken({ id: "teacher-1", role: "DOSEN" });
      const res = await app.request("/classes/class-1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("class-1");
      expect(data.enrollmentKey).toBe("ABC123");
    });

    it("prevents cross-class outsider user from reading class data", async () => {
      db.class.findUnique.mockResolvedValueOnce({ dosenId: "teacher-1" });
      db.enrollment.findUnique.mockResolvedValueOnce(null);

      const token = makeToken({ id: "outsider-student", role: "MAHASISWA" });
      const res = await app.request("/classes/class-1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
    });

    it("sanitizes assignments and hides draft / unreleased grades from student", async () => {
      db.class.findUnique.mockResolvedValueOnce({ dosenId: "teacher-1" });
      db.enrollment.findUnique.mockResolvedValueOnce({ role: "STUDENT" });
      db.class.findUnique.mockResolvedValueOnce({
        id: "class-1",
        name: "Algoritma",
        dosenId: "teacher-1",
        enrollmentKey: false,
        enrollments: [],
        assignments: [
          {
            id: "asmt-1",
            title: "Tugas 1",
            submissions: [
              {
                id: "sub-1",
                releasedGradeId: "grade-rel",
                grades: [
                  { id: "grade-draft", status: "DRAFT", finalScore: 90 },
                  { id: "grade-rel", status: "RELEASED", finalScore: 75 },
                ],
              },
            ],
          },
        ],
        rubrics: [],
        _count: { enrollments: 1, assignments: 1 },
      });

      const token = makeToken({ id: "student-1", role: "MAHASISWA" });
      const res = await app.request("/classes/class-1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.assignments[0].submissions[0].grades).toEqual([
        { id: "grade-rel", status: "RELEASED", finalScore: 75 },
      ]);
    });
  });

  describe("GET /classes/:classId/assignments/:assignmentId/result", () => {
    it("distinguishes score 0 from ungraded (null)", async () => {
      db.enrollment.findUnique.mockResolvedValueOnce({ id: "enr-1" });
      db.submission.findUnique.mockResolvedValueOnce({
        id: "sub-1",
        assignmentId: "asmt-1",
        userId: "student-1",
        releasedGradeId: "grade-zero",
        grades: [
          {
            id: "grade-zero",
            finalScore: 0,
            finalFeedback: "Tidak memenuhi syarat",
            isAIAssisted: false,
            status: "RELEASED",
            createdAt: new Date().toISOString(),
          },
        ],
        assignment: {
          id: "asmt-1",
          title: "Tugas 1",
          maxScore: 100,
          classId: "class-1",
          class: { id: "class-1", name: "Kelas A", dosen: { name: "Pak Dosen" } },
          rubric: null,
        },
      });

      const token = makeToken({ id: "student-1", role: "MAHASISWA" });
      const res = await app.request("/classes/class-1/assignments/asmt-1/result", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.grade.finalScore).toBe(0);
      expect(data.grade.finalScore).not.toBeNull();
    });

    it("rejects request if grade is not released yet", async () => {
      db.enrollment.findUnique.mockResolvedValueOnce({ id: "enr-1" });
      db.submission.findUnique.mockResolvedValueOnce({
        id: "sub-1",
        assignmentId: "asmt-1",
        userId: "student-1",
        releasedGradeId: null, // belum dinilai / belum rilis
        grades: [],
        assignment: {
          id: "asmt-1",
          classId: "class-1",
          class: { id: "class-1", name: "Kelas A", dosen: { name: "Pak Dosen" } },
        },
      });

      const token = makeToken({ id: "student-1", role: "MAHASISWA" });
      const res = await app.request("/classes/class-1/assignments/asmt-1/result", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Nilai belum dirilis");
    });
  });

  describe("GET /submissions/:submissionId", () => {
    it("does not leak answer key or evaluations to student", async () => {
      db.submission.findUnique.mockResolvedValueOnce({
        id: "sub-1",
        userId: "student-1",
        releasedGradeId: "grade-1",
        assignment: {
          id: "asmt-1",
          class: { dosenId: "teacher-1" },
        },
        evaluations: [{ id: "eval-1", suggestedTotalScore: 80, rawModelOutput: {} }],
        grades: [
          { id: "grade-1", status: "RELEASED", finalScore: 85 },
          { id: "grade-draft", status: "DRAFT", finalScore: 90 },
        ],
        versions: [],
      });

      const token = makeToken({ id: "student-1", role: "MAHASISWA" });
      const res = await app.request("/submissions/sub-1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.evaluations).toEqual([]);
      expect(data.grades).toHaveLength(1);
      expect(data.grades[0].id).toBe("grade-1");
    });

    it("rejects student viewing another student submission", async () => {
      db.submission.findUnique.mockResolvedValueOnce({
        id: "sub-2",
        userId: "other-student",
        assignment: {
          class: { dosenId: "teacher-1" },
        },
      });

      const token = makeToken({ id: "student-1", role: "MAHASISWA" });
      const res = await app.request("/submissions/sub-2", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
