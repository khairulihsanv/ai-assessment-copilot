import { AssignmentStatus, ClassRole, PrismaClient, Role, SubmissionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireTestDatabaseUrl } from "../apps/frontend/src/server/config/database-url.js";

export const FIXTURE_PASSWORD = "Password123!";

export interface FixtureData {
  dosenA: { id: string; email: string; name: string };
  dosenB: { id: string; email: string; name: string };
  mahasiswaA: { id: string; email: string; name: string };
  mahasiswaB: { id: string; email: string; name: string };
  asistenA: { id: string; email: string; name: string };
  classA: { id: string; name: string; enrollmentKey: string };
  classB: { id: string; name: string; enrollmentKey: string };
  assignmentA1: { id: string; title: string };
}

export async function seedE2EFixtures(prisma: PrismaClient): Promise<FixtureData> {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 6);

  // Clean previous test data if any
  const testEmails = [
    "dosen_a@test.local",
    "dosen_b@test.local",
    "mhs_a@test.local",
    "mhs_b@test.local",
    "asisten_a@test.local",
  ];

  await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });

  // 1. Create Users
  const dosenA = await prisma.user.create({
    data: {
      name: "Dr. Dosen A, M.Kom.",
      email: "dosen_a@test.local",
      passwordHash,
      role: Role.DOSEN,
    },
  });

  const dosenB = await prisma.user.create({
    data: {
      name: "Prof. Dosen B, Ph.D.",
      email: "dosen_b@test.local",
      passwordHash,
      role: Role.DOSEN,
    },
  });

  const mahasiswaA = await prisma.user.create({
    data: {
      name: "Mahasiswa A Pratama",
      email: "mhs_a@test.local",
      passwordHash,
      role: Role.MAHASISWA,
    },
  });

  const mahasiswaB = await prisma.user.create({
    data: {
      name: "Mahasiswa B Santoso",
      email: "mhs_b@test.local",
      passwordHash,
      role: Role.MAHASISWA,
    },
  });

  const asistenA = await prisma.user.create({
    data: {
      name: "Asisten A Wijaya",
      email: "asisten_a@test.local",
      passwordHash,
      role: Role.MAHASISWA,
    },
  });

  // 2. Create Classes
  const classA = await prisma.class.create({
    data: {
      name: "Rekayasa Perangkat Lunak A",
      subject: "RPL-2026",
      description: "Kelas RPL Tahun Ajaran 2026/2027",
      enrollmentKey: "KEY-RPLA",
      dosenId: dosenA.id,
    },
  });

  const classB = await prisma.class.create({
    data: {
      name: "Basis Data B",
      subject: "BD-2026",
      description: "Kelas Basis Data Lanjut",
      enrollmentKey: "KEY-BDB",
      dosenId: dosenB.id,
    },
  });

  // 3. Enrollments
  await prisma.enrollment.create({
    data: {
      classId: classA.id,
      userId: mahasiswaA.id,
      role: ClassRole.STUDENT,
    },
  });

  await prisma.enrollment.create({
    data: {
      classId: classA.id,
      userId: asistenA.id,
      role: ClassRole.ASSISTANT,
    },
  });

  await prisma.enrollment.create({
    data: {
      classId: classB.id,
      userId: mahasiswaB.id,
      role: ClassRole.STUDENT,
    },
  });

  // 4. Initial Rubric & Assignment for Class A
  const rubricA = await prisma.rubric.create({
    data: {
      title: "Rubrik Penilaian Analisis Perangkat Lunak",
      classId: classA.id,
      createdById: dosenA.id,
      criteria: {
        create: [
          {
            label: "Ketepatan Analisis",
            description: "Analisis use-case dan kebutuhan sistem lengkap",
            maxScore: 60,
            weight: 60,
            answerKey:
              "Sistem harus memuat identifikasi aktor, functional requirement, dan use case diagram.",
          },
          {
            label: "Kualitas Penjelasan",
            description: "Bahasa terstruktur dan disertai contoh kasus nyata",
            maxScore: 40,
            weight: 40,
            material: "Gunakan pedoman penulisan dokumen SRS IEEE 830.",
          },
        ],
      },
    },
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const assignmentA1 = await prisma.assignment.create({
    data: {
      title: "Tugas 1: Spesifikasi Kebutuhan Perangkat Lunak",
      instructions: "Uraikan kebutuhan fungsional dan non-fungsional aplikasi web e-learning.",
      submissionType: SubmissionType.ANY,
      dueDate,
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      classId: classA.id,
      rubricId: rubricA.id,
    },
  });

  return {
    dosenA: { id: dosenA.id, email: dosenA.email, name: dosenA.name },
    dosenB: { id: dosenB.id, email: dosenB.email, name: dosenB.name },
    mahasiswaA: { id: mahasiswaA.id, email: mahasiswaA.email, name: mahasiswaA.name },
    mahasiswaB: { id: mahasiswaB.id, email: mahasiswaB.email, name: mahasiswaB.name },
    asistenA: { id: asistenA.id, email: asistenA.email, name: asistenA.name },
    classA: { id: classA.id, name: classA.name, enrollmentKey: classA.enrollmentKey },
    classB: { id: classB.id, name: classB.name, enrollmentKey: classB.enrollmentKey },
    assignmentA1: { id: assignmentA1.id, title: assignmentA1.title },
  };
}

// Standalone execution
if (process.argv[1] && process.argv[1].includes("e2e-seed")) {
  const url = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  seedE2EFixtures(prisma)
    .then((data) => {
      console.log("[e2e-seed] Fixtures seeded successfully:", JSON.stringify(data, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[e2e-seed] Error seeding fixtures:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
