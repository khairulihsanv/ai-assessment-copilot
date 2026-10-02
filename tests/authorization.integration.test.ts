import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GET as getAssignments, POST as postAssignment } from '@/app/api/classes/[classId]/assignments/route';
import { GET as getClassDetails } from '@/app/api/classes/[classId]/route';
import { POST as finalizeGrade } from '@/app/api/submissions/[submissionId]/finalize/route';
import { GET as getSubmissions } from '@/app/api/classes/[classId]/assignments/[assignmentId]/submissions/route';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth';

// TEST_DATABASE_URL and DATABASE_URL mapping is handled in vitest.setup.ts
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL wajib ada. Tes ini tidak boleh berjalan menggunakan database development atau production.");
}

vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(),
}));

describe('Integration Test: API Authorization (PostgreSQL Asli)', () => {
  let dosenId: string;
  let asistenId: string;
  let mahasiswa1Id: string;
  let mahasiswa2Id: string;
  let classId: string;
  let assignmentId: string;
  let submission1Id: string;

  beforeAll(async () => {
    await prisma.grade.deleteMany();
    await prisma.aIEvaluation.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.rubricCriterion.deleteMany();
    await prisma.rubric.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();

    const dosen = await prisma.user.create({
      data: { name: 'Dosen Asli', email: 'dosen@test.com', passwordHash: 'hash', role: 'DOSEN' }
    });
    dosenId = dosen.id;

    const asisten = await prisma.user.create({
      data: { name: 'Asisten', email: 'asisten@test.com', passwordHash: 'hash', role: 'MAHASISWA' }
    });
    asistenId = asisten.id;

    const mahasiswa1 = await prisma.user.create({
      data: { name: 'Mahasiswa 1', email: 'mhs1@test.com', passwordHash: 'hash', role: 'MAHASISWA' }
    });
    mahasiswa1Id = mahasiswa1.id;

    const mahasiswa2 = await prisma.user.create({
      data: { name: 'Mahasiswa 2', email: 'mhs2@test.com', passwordHash: 'hash', role: 'MAHASISWA' }
    });
    mahasiswa2Id = mahasiswa2.id;

    const cls = await prisma.class.create({
      data: { name: 'Kelas Rahasia', enrollmentKey: 'SECRET-KEY', dosenId: dosen.id }
    });
    classId = cls.id;

    await prisma.enrollment.create({ data: { classId: cls.id, userId: asisten.id, role: 'ASSISTANT' } });
    await prisma.enrollment.create({ data: { classId: cls.id, userId: mahasiswa1.id, role: 'STUDENT' } });
    await prisma.enrollment.create({ data: { classId: cls.id, userId: mahasiswa2.id, role: 'STUDENT' } });

    const rubric = await prisma.rubric.create({
      data: {
        title: 'Rubrik Ujian', classId: cls.id, createdById: dosen.id,
        criteria: {
          create: [{ label: 'Akurasi', maxScore: 100, weight: 100, answerKey: 'KUNCI RAHASIA: 42', material: 'Materi privat' }]
        }
      }
    });

    const assignment = await prisma.assignment.create({
      data: { title: 'Tugas 1', instructions: 'Kerjakan', dueDate: new Date(), classId: cls.id, rubricId: rubric.id }
    });
    assignmentId = assignment.id;

    const sub1 = await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        userId: mahasiswa1Id,
        type: 'TEXT',
        content: 'Jawaban MHS 1',
        status: 'SUBMITTED'
      }
    });
    submission1Id = sub1.id;

    await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        userId: mahasiswa2Id,
        type: 'TEXT',
        content: 'Jawaban MHS 2',
        status: 'SUBMITTED'
      }
    });
  });

  afterAll(async () => {
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('1. menolak akses tanpa sesi', async () => {
    (auth as any).mockResolvedValue(null);
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(401);
  });

  it('2. menolak mahasiswa lintas kelas / tidak terdaftar', async () => {
    const spy = await prisma.user.create({ data: { name: 'Spy', email: 'spy@test.com', passwordHash: 'hash', role: 'MAHASISWA' } });
    (auth as any).mockResolvedValue({ user: { id: spy.id, role: 'MAHASISWA' } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(403);
  });

  it('3. mahasiswa tidak melihat sumber privat (answerKey, material, enrollmentKey)', async () => {
    (auth as any).mockResolvedValue({ user: { id: mahasiswa1Id, role: 'MAHASISWA' } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrollmentKey).toBeUndefined();
    expect(data.rubrics[0].criteria[0]).not.toHaveProperty('answerKey');
  });

  it('4. dosen pengampu melihat answerKey dan data sensitif secara utuh', async () => {
    (auth as any).mockResolvedValue({ user: { id: dosenId, role: 'DOSEN' } });
    const req = new Request(`http://localhost/api/classes/${classId}`);
    const res = await getClassDetails(req, { params: Promise.resolve({ classId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrollmentKey).toBe('SECRET-KEY');
    expect(data.rubrics[0].criteria[0].answerKey).toBe('KUNCI RAHASIA: 42');
  });

  it('5. mahasiswa hanya melihat submisi miliknya sendiri', async () => {
    (auth as any).mockResolvedValue({ user: { id: mahasiswa1Id, role: 'MAHASISWA' } });
    const req = new Request(`http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`);
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].userId).toBe(mahasiswa1Id);
  });

  it('6. dosen dan asisten melihat semua submisi', async () => {
    (auth as any).mockResolvedValue({ user: { id: asistenId, role: 'MAHASISWA' } });
    const req = new Request(`http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`);
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(2);
  });

  it('7. asisten tidak dapat memfinalisasi nilai', async () => {
    (auth as any).mockResolvedValue({ user: { id: asistenId, role: 'MAHASISWA' } });
    const body = JSON.stringify({ finalScore: 100, finalFeedback: 'Bagus' });
    const req = new Request(`http://localhost/api/submissions/${submission1Id}/finalize`, { method: 'POST', body });
    const res = await finalizeGrade(req, { params: Promise.resolve({ submissionId: submission1Id }) });
    expect(res.status).toBe(403);
  });

  it('8. dosen pengampu dapat memfinalisasi nilai', async () => {
    (auth as any).mockResolvedValue({ user: { id: dosenId, role: 'DOSEN' } });
    const body = JSON.stringify({ finalScore: 90, finalFeedback: 'Sangat Baik', isAIAssisted: false, editedFromAI: false });
    const req = new Request(`http://localhost/api/submissions/${submission1Id}/finalize`, { method: 'POST', body });
    const res = await finalizeGrade(req, { params: Promise.resolve({ submissionId: submission1Id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('9. mahasiswa tidak menerima nilai/draf evaluasi AI yang belum dirilis', async () => {
    // Sisipkan AI evaluation (draft)
    await prisma.aIEvaluation.create({
      data: {
        submissionId: submission1Id,
        rawModelOutput: { foo: "bar" },
        perCriterionScore: [],
        suggestedTotalScore: 85,
        suggestedFeedback: 'Draft AI feedback'
      }
    });

    (auth as any).mockResolvedValue({ user: { id: mahasiswa1Id, role: 'MAHASISWA' } });
    const req = new Request(`http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`);
    const res = await getSubmissions(req, { params: Promise.resolve({ classId, assignmentId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // Mahasiswa harusnya tidak menerima field aiEvaluation karena isPrivileged = false
    expect(data[0]).not.toHaveProperty('aiEvaluation');
    
    // Dosen harus menerimanya
    (auth as any).mockResolvedValue({ user: { id: dosenId, role: 'DOSEN' } });
    const reqDosen = new Request(`http://localhost/api/classes/${classId}/assignments/${assignmentId}/submissions`);
    const resDosen = await getSubmissions(reqDosen, { params: Promise.resolve({ classId, assignmentId }) });
    const dataDosen = await resDosen.json();
    expect(dataDosen[0]).toHaveProperty('aiEvaluation');
    expect(dataDosen[0].aiEvaluation.suggestedTotalScore).toBe(85);
  });
});
