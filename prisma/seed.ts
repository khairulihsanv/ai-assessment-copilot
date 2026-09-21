import { PrismaClient, Role, SubmissionType, AssignmentStatus, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database AI Assessment Copilot...");

  // 1. Clean existing records
  await prisma.grade.deleteMany();
  await prisma.aIEvaluation.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.rubricCriterion.deleteMany();
  await prisma.rubric.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const passwordHashDosen = await bcrypt.hash("Dosen@12345", salt);
  const passwordHashMhs = await bcrypt.hash("Mhs@12345", salt);

  const dosen = await prisma.user.create({
    data: {
      name: "Dr. Budi Santoso, M.Kom.",
      email: "dosen.demo@example.com",
      passwordHash: passwordHashDosen,
      role: Role.DOSEN,
    },
  });

  const mahasiswa = await prisma.user.create({
    data: {
      name: "Ahmad Fikri Pratama",
      email: "mahasiswa.demo@example.com",
      passwordHash: passwordHashMhs,
      role: Role.MAHASISWA,
    },
  });

  console.log(`✅ User dibuat: Dosen (${dosen.email}) & Mahasiswa (${mahasiswa.email})`);

  // 3. Create Class
  const sampleClass = await prisma.class.create({
    data: {
      name: "Praktikum Rekayasa Perangkat Lunak - TI 3A",
      subject: "Rekayasa Perangkat Lunak",
      description: "Mata kuliah praktikum pengembangan sistem berbasis web modern, arsitektur microservices, dan implementasi CI/CD.",
      enrollmentKey: "RPL2026",
      dosenId: dosen.id,
    },
  });

  console.log(`✅ Kelas dibuat: ${sampleClass.name} (Kode: ${sampleClass.enrollmentKey})`);

  // 4. Enroll Student
  await prisma.enrollment.create({
    data: {
      classId: sampleClass.id,
      mahasiswaId: mahasiswa.id,
    },
  });

  console.log(`✅ Mahasiswa terdaftar di kelas`);

  // 5. Create Rubric with 3 weighted criteria (sum = 100%)
  const rubric = await prisma.rubric.create({
    data: {
      title: "Rubrik Penilaian Analisis Arsitektur Sistem",
      classId: sampleClass.id,
      createdById: dosen.id,
      criteria: {
        create: [
          {
            label: "Pemahaman Konsep & Teori Arsitektur",
            description: "Ketepatan menjelaskan karakteristik, kelebihan, dan kelemahan arsitektur Monolith vs Microservices.",
            maxScore: 100,
            weight: 40,
          },
          {
            label: "Analisis Kritis & Studi Kasus",
            description: "Kedalaman penalaran dalam menentukan skenario pemilihan arsitektur yang tepat pada industri riil.",
            maxScore: 100,
            weight: 40,
          },
          {
            label: "Sistematika Penulisan & Referensi",
            description: "Kerapian struktur esai, tata bahasa akademik, serta kelengkapan referensi rujukan ilmiah.",
            maxScore: 100,
            weight: 20,
          },
        ],
      },
    },
    include: { criteria: true },
  });

  console.log(`✅ Rubrik dibuat: ${rubric.title} (3 Kriteria berbobot 100%)`);

  // 6. Create Assignment
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const assignment = await prisma.assignment.create({
    data: {
      classId: sampleClass.id,
      title: "Tugas 1 — Analisis Arsitektur: Monolithic vs Microservices",
      instructions: `Tuliskan esai analisis komparatif antara arsitektur Monolithic dan Microservices. 
Uraikan poin-poin berikut:
1. Definisi serta karakteristik utama masing-masing arsitektur.
2. Kelebihan dan kekurangan dari segi skalabilitas, maintainability, kemudahan deployment, dan kompleksitas operasional.
3. Berikan satu studi kasus nyata (misalnya sistem e-commerce atau perbankan digital) beserta justifikasi teknis arsitektur mana yang lebih direkomendasikan.
4. Tuliskan jawaban Anda secara komprehensif, logis, dan sertakan sumber referensi terpercaya.`,
      submissionType: SubmissionType.ANY,
      dueDate,
      maxScore: 100,
      allowLateSubmission: true,
      status: AssignmentStatus.PUBLISHED,
      rubricId: rubric.id,
    },
  });

  console.log(`✅ Tugas dibuat: ${assignment.title}`);

  // 7. Create Sample Student Submission (Ready for AI Evaluation)
  const sampleAnswer = `ANALISIS KOMPARATIF ARSITEKTUR: MONOLITHIC VS MICROSERVICES

1. Definisi dan Karakteristik Utama
Arsitektur Monolithic adalah model pengembangan aplikasi di mana seluruh komponen bisnis, layer presentasi, logika database, dan modul fungsional disatukan dalam satu basis kode (single codebase) serta dideploy sebagai satu kesatuan unit eksekusi. Karakteristik utamanya meliputi shared memory, komunikasi in-process yang sangat cepat, dan kesederhanaan deployment awal.

Sebaliknya, arsitektur Microservices memecah aplikasi menjadi sekumpulan layanan kecil independen yang terfokus pada domain bisnis spesifik (Bounded Context). Setiap service memiliki database tersendiri (Database-per-service), berjalan dalam proses terisolasi, dan berkomunikasi melalui protokol ringan seperti RESTful API, gRPC, atau message broker (Kafka/RabbitMQ).

2. Perbandingan Teknis
- Skalabilitas: Monolith hanya dapat diskalakan secara horizontal dengan menggandakan seluruh aplikasi, yang memboroskan sumber daya komputasi. Microservices memungkinkan independent scaling, di mana service dengan beban tinggi (misalnya Service Pembayaran saat flash sale) dapat diskalakan tanpa menambah kapasitas service statis seperti Katalog.
- Maintainability: Basis kode Monolith cenderung menjadi "Big Ball of Mud" seiring bertambahnya tim pengembang. Pada Microservices, kode lebih terisolasi sehingga memudahkan pengujian unit dan refactoring modular.
- Kompleksitas Operasional: Monolith memiliki kompleksitas deployment yang rendah pada tahap awal. Microservices membutuhkan orkestrasi kontainer (Docker & Kubernetes), distributed tracing, centralized logging, serta penanganan distributed transaction (Saga Pattern) yang jauh lebih rumit.

3. Studi Kasus Nyata: Platform E-Commerce Skala Nasional
Pada sistem e-commerce berskala nasional dengan jutaan transaksi harian, arsitektur Microservices jauh lebih direkomendasikan. Komponen Order Service, Payment Gateway, dan Inventory Service memiliki karakteristik trafik yang sangat dinamis dan membutuhkan fault tolerance tinggi. Kegagalan pada Notification Service tidak boleh mengakibatkan kelumpuhan proses Checkout pelanggan. Dengan Microservices, setiap tim dapat merilis fitur secara independen menggunakan pipeline CI/CD tanpa risiko downtime menyeluruh.

4. Kesimpulan
Monolith sangat ideal untuk startup tahap awal (MVP) karena kecepatan iterasi dan kesederhanaan arsitektur. Namun, ketika skala bisnis, trafik pengguna, dan jumlah anggota tim engineering meningkat drastis, transisi terencana menuju Microservices merupakan keputusan arsitektural yang tepat guna menjaga keandalan dan skalabilitas jangka panjang.

Referensi:
- Newman, S. (2021). Building Microservices: Designing Fine-Grained Systems (2nd ed.). O'Reilly Media.
- Fowler, M. (2014). Microservices: a definition of this new architectural term. martinfowler.com.`;

  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignment.id,
      mahasiswaId: mahasiswa.id,
      type: SubmissionType.TEXT,
      content: sampleAnswer,
      status: SubmissionStatus.SUBMITTED,
    },
  });

  console.log(`✅ Sample Submission dibuat untuk mahasiswa: ${submission.id}`);
  console.log("🎉 Seeding database selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
