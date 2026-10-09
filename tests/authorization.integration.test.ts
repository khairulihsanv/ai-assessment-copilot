import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as getSubmissions } from "@/app/api/classes/[classId]/assignments/[assignmentId]/submissions/route";

import { GET as getClassDetails } from "@/app/api/classes/[classId]/route";
import { POST as finalizeGrade } from "@/app/api/submissions/[submissionId]/finalize/route";

import { prisma } from "@/lib/db/prisma";
import { requireTestDatabaseUrl } from "@/lib/testing/database-url";

// Checked again here for accidental invocation outside the integration config.
const testUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
if (process.env.DATABASE_URL !== testUrl) throw new Error("Prisma must use TEST_DATABASE_URL");
const runId = randomUUID();
const fixtureUsers: string[] = [];

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: authMock,
}));

describe("Integration Test: API Authorization (PostgreSQL Asli)", () => {
  let dosenId: string;
  let asistenId: string;
  let mahasiswa1Id: string;
  let mahasiswa2Id: string;
  let classId: string;
  let assignmentId: string;
  let submission1Id: string;

  beforeAll(async () => {
    const dosen = await prisma.user.create({
      data: {
        name: "Dosen Asli",
        email: `dosen-${runId}@example.invalid`,
        passwordHash: "hash",
        role: "DOSEN",
      },
    });
    fixtureUsers.push(dosen.id);
    dosenId = dosen.id;

    const asisten = await prisma.user.create({
      data: {
        name: "Asisten",
        email: `asisten-${runId}@example.invalid`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUsers.push(asisten.id);
    asistenId = asisten.id;

    const mahasiswa1 = await prisma.user.create({
      data: {
        name: "Mahasiswa 1",
        email: `mhs1-${runId}@example.invalid`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUsers.push(mahasiswa1.id);
    mahasiswa1Id = mahasiswa1.id;

    const mahasiswa2 = await prisma.user.create({
      data: {
        name: "Mahasiswa 2",
        email: `mhs2-${runId}@example.invalid`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUsers.push(mahasiswa2.id);
    mahasiswa2Id = mahasiswa2.id;

    const cls = await prisma.class.create({
      data: { name: "Kelas Rahasia", enrollmentKey: `SECRET-KEY-${runId}`, dosenId: dosen.id },
    });
    classId = cls.id;

    await prisma.enrollment.create({
      data: { classId: cls.id, userId: asisten.id, role: "ASSISTANT" },
    });
    await prisma.enrollment.create({
      data: { classId: cls.id, userId: mahasiswa1.id, role: "STUDENT" },
    });
    await prisma.enrollment.create({
      data: { classId: cls.id, userId: mahasiswa2.id, role: "STUDENT" },
    });

    const rubric = await prisma.rubric.create({
      data: {
        title: "Rubrik Ujian",
        classId: cls.id,
        createdById: dosen.id,
        criteria: {
          create: [
            {
              label: "Akurasi",
              maxScore: 100,
              weight: 100,
              answerKey: "KUNCI RAHASIA: 42",
              material: "Materi privat",
              expectedAnswer: "PRIVATE LEGACY KEY",
              answerKeyEmbedding: [0.1],
              materialEmbedding: [0.2],
            },
          ],
        },
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        title: "Tugas 1",
        status: "PUBLISHED",
        instructions: "Kerjakan",
        dueDate: new Date(),
        classId: cls.id,
        rubricId: rubric.id,
      },
    });
    assignmentId = assignment.id;

    const sub1 = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        userId: mahasiswa1Id,
        versions: {
          create: [
            {
              versionNumber: 1,
              type: "TEXT",
              content: "Jawaban MHS 1",
            },
          ],
        },
      },
      include: { versions: true },
    });
    submission1Id = sub1.id;
    await prisma.submission.update({
      where: { id: sub1.id },
      data: { activeVersionId: sub1.versions[0]!.id },
    });

    const sub2 = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        userId: mahasiswa2Id,
        versions: {
          create: [
            {
              versionNumber: 1,
              type: "TEXT",
              content: "Jawaban MHS 2",
            },
          ],
        },
      },
      include: { versions: true },
    });
    await prisma.submission.update({
      where: { id: sub2.id },
      data: { activeVersionId: sub2.versions[0]!.id },
    });
  });

  afterAll(async () => {
    if (classId) await prisma.class.deleteMany({ where: { id: classId } });
    if (fixtureUsers.length) await prisma.user.deleteMany({ where: { id: { in: fixtureUsers } } });
    await prisma.$disconnect();
  });

  it("1. menolak akses tanpa sesi", async () => {
    authMock.mockResolvedValue(null);
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(401);
  });

  it("2. menolak mahasiswa lintas kelas / tidak terdaftar", async () => {
    const spy = await prisma.user.create({
      data: {
        name: "Spy",
        email: `spy-${runId}@example.invalid`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUsers.push(spy.id);
    authMock.mockResolvedValue({ user: { id: spy.id, role: "MAHASISWA" } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(403);
  });

  it("3. mahasiswa tidak melihat sumber privat (answerKey, material, enrollmentKey)", async () => {
    authMock.mockResolvedValue({ user: { id: mahasiswa1Id, role: "MAHASISWA" } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrollmentKey).toBeUndefined();
    for (const field of [
      "answerKey",
      "material",
      "expectedAnswer",
      "answerKeyEmbedding",
      "materialEmbedding",
    ]) {
      expect(data.rubrics[0].criteria[0]).not.toHaveProperty(field);
    }
  });

  it("4. dosen pengampu melihat answerKey dan data sensitif secara utuh", async () => {
    authMock.mockResolvedValue({ user: { id: dosenId, role: "DOSEN" } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrollmentKey).toBe(`SECRET-KEY-${runId}`);
    expect(data.rubrics[0].criteria[0].answerKey).toBe("KUNCI RAHASIA: 42");
  });

  it("5. mahasiswa hanya melihat submisi miliknya sendiri", async () => {
    authMock.mockResolvedValue({ user: { id: mahasiswa1Id, role: "MAHASISWA" } });
    const req = new Request(
      `http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    );
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].userId).toBe(mahasiswa1Id);
  });

  it("6. dosen dan asisten melihat semua submisi", async () => {
    authMock.mockResolvedValue({ user: { id: asistenId, role: "MAHASISWA" } });
    const req = new Request(
      `http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    );
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(2);
  });

  it("7. asisten tidak dapat memfinalisasi nilai", async () => {
    authMock.mockResolvedValue({ user: { id: asistenId, role: "MAHASISWA" } });
    const body = JSON.stringify({ finalScore: 100, finalFeedback: "Bagus" });
    const req = new Request(`http://localhost/api/submissions/${submission1Id}/finalize`, {
      method: "POST",
      body,
    });
    const res = await finalizeGrade(req, {
      params: Promise.resolve({ submissionId: submission1Id }),
    });
    expect(res.status).toBe(403);
  });

  it("8. dosen pengampu dapat memfinalisasi nilai", async () => {
    authMock.mockResolvedValue({ user: { id: dosenId, role: "DOSEN" } });
    const current = await prisma.submission.findUniqueOrThrow({ where: { id: submission1Id } });
    const body = JSON.stringify({
      expectedSubmissionVersionId: current.activeVersionId,
      expectedReleasedGradeId: current.releasedGradeId,
      finalScore: 90,
      finalFeedback: "Sangat Baik",
      isAIAssisted: false,
      editedFromAI: false,
    });
    const req = new Request(`http://localhost/api/submissions/${submission1Id}/finalize`, {
      method: "POST",
      body,
    });
    const res = await finalizeGrade(req, {
      params: Promise.resolve({ submissionId: submission1Id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("9. mahasiswa tidak menerima nilai/draf evaluasi AI yang belum dirilis", async () => {
    // Sisipkan AI evaluation (draft)
    const sub1Fetch = await prisma.submission.findUnique({ where: { id: submission1Id } });
    await prisma.evaluationRun.create({
      data: {
        submissionId: submission1Id,
        versionId: sub1Fetch!.activeVersionId!,
        rawModelOutput: { foo: "bar" },
        perCriterionScore: [],
        suggestedTotalScore: 85,
        suggestedFeedback: "Draft AI feedback",
        status: "COMPLETED",
      },
    });

    authMock.mockResolvedValue({ user: { id: mahasiswa1Id, role: "MAHASISWA" } });
    const req = new Request(
      `http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    );
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    // Mahasiswa harusnya tidak menerima field evaluations karena isPrivileged = false
    expect(data[0]).not.toHaveProperty("evaluations");

    // Dosen harus menerimanya
    authMock.mockResolvedValue({ user: { id: dosenId, role: "DOSEN" } });
    const reqDosen = new Request(
      `http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    );
    const resDosen = await getSubmissions(reqDosen, {
      params: Promise.resolve({ classId, assignmentId }),
    });
    const dataDosen = await resDosen.json();
    const reviewed = dataDosen.find((item: { id: string }) => item.id === submission1Id);
    expect(reviewed).toHaveProperty("evaluations");
    expect(
      reviewed.evaluations.some(
        (item: { suggestedTotalScore: number }) => item.suggestedTotalScore === 85,
      ),
    ).toBe(true);
  });
  it("10. hides all unpublished grade revisions and non-active releases", async () => {
    const current = await prisma.submission.findUniqueOrThrow({ where: { id: submission1Id } });
    for (const status of ["DRAFT", "APPROVED", "WITHDRAWN", "SUPERSEDED", "RELEASED"]) {
      await prisma.gradeRevision.create({
        data: {
          submissionId: submission1Id,
          versionId: current.activeVersionId,
          status,
          finalScore: 1,
          finalFeedback: "PRIVATE DRAFT",
          gradedById: dosenId,
        },
      });
    }
    authMock.mockResolvedValue({ user: { id: mahasiswa1Id, role: "MAHASISWA" } });
    const res = await getSubmissions(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ classId, assignmentId }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data[0].grades.map((grade: { id: string }) => grade.id)).toEqual(
      current.releasedGradeId ? [current.releasedGradeId] : [],
    );
    expect(JSON.stringify(data)).not.toContain("PRIVATE DRAFT");
  });

  it("11. rejects stale release tokens without creating another grade", async () => {
    const current = await prisma.submission.findUniqueOrThrow({ where: { id: submission1Id } });
    const count = await prisma.gradeRevision.count({ where: { submissionId: submission1Id } });
    authMock.mockResolvedValue({ user: { id: dosenId, role: "DOSEN" } });
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({
        finalScore: 80,
        finalFeedback: "Stale tab",
        expectedSubmissionVersionId: current.activeVersionId,
        expectedReleasedGradeId: "outdated-grade",
      }),
    });
    expect(
      (await finalizeGrade(request, { params: Promise.resolve({ submissionId: submission1Id }) }))
        .status,
    ).toBe(409);
    expect(await prisma.gradeRevision.count({ where: { submissionId: submission1Id } })).toBe(
      count,
    );
  });

  it("12. allows only one of two simultaneous releases from the same snapshot", async () => {
    const current = await prisma.submission.findUniqueOrThrow({ where: { id: submission1Id } });
    authMock.mockResolvedValue({ user: { id: dosenId, role: "DOSEN" } });
    const release = () =>
      finalizeGrade(
        new Request("http://localhost/api/test", {
          method: "POST",
          body: JSON.stringify({
            finalScore: 75,
            finalFeedback: "Concurrent review",
            expectedSubmissionVersionId: current.activeVersionId,
            expectedReleasedGradeId: current.releasedGradeId,
          }),
        }),
        { params: Promise.resolve({ submissionId: submission1Id }) },
      );
    const count = await prisma.gradeRevision.count({ where: { submissionId: submission1Id } });
    const results = await Promise.all([release(), release()]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.gradeRevision.count({ where: { submissionId: submission1Id } })).toBe(
      count + 1,
    );
  });
});
