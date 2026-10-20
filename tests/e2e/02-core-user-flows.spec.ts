import { expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe
  .serial("E2E Alur Pengguna Inti: Kelas → Tugas → Submisi → Review → Nilai", () => {
    let createdEnrollmentKey: string;
    let createdAssignmentTitle: string;
    let createdAssignmentTitle2: string;
    let createdClassId: string;
    let createdAssignmentId: string;
    let createdAssignmentId2: string;

    test("Flow A: Dosen membuat kelas baru, menyiapkan 2 rubrik berbeda melalui UI, dan membuat 2 penugasan", async ({
      browser,
    }) => {
      const dosenContext = await browser.newContext();
      const page = await dosenContext.newPage();

      // Handle any confirm dialogs for rubric preset templates
      page.on("dialog", (dialog) => dialog.accept());

      // 1. Dosen Login
      await page.goto("/login");
      await page.fill("#email", "dosen_a@test.local");
      await page.fill("#password", FIXTURE_PASSWORD);
      await page.click("button[type='submit']");
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // 2. Navigasi ke Halaman Kelas
      await page.goto("/classes");
      await expect(page.locator("h1")).toContainText("Kelas Anda");

      // 3. Buat Kelas Baru melalui Modal
      const buatKelasBtn = page.locator("button:has-text('Buat Kelas Baru')").first();
      await buatKelasBtn.click();

      const className = `Kelas Sistem Terdistribusi ${Date.now().toString().slice(-4)}`;
      await page.fill("#className", className);
      await page.fill("#subject", "IF-401");
      await page.fill("#description", "Praktikum Pemrograman Terdistribusi & Microservices");

      await page.click("button[type='submit']:has-text('Buat Kelas')");

      // Tunggu modal tertutup dan kartu kelas baru muncul
      const classCard = page.locator(`text=${className}`).first();
      await expect(classCard).toBeVisible({ timeout: 10000 });

      // 4. Buka Kelas Baru dan Ambil Kode Gabung
      await page.locator(`a:has-text('${className}')`).first().click();
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9]+/, { timeout: 10000 });

      const currentUrl = page.url();
      createdClassId = currentUrl.split("/classes/")[1].split("/")[0].split("?")[0];

      // Ambil kode pendaftaran dari tampilan detail kelas
      const keyElement = page.locator("#classEnrollmentKey, span.font-mono.tracking-wider").first();
      await expect(keyElement).toBeVisible();
      createdEnrollmentKey = (await keyElement.textContent())?.trim() || "";
      expect(createdEnrollmentKey).toBeTruthy();

      // 5. Dosen Membuat Rubrik 1 melalui UI (/classes/[classId]/rubrics)
      await page.goto(`/classes/${createdClassId}/rubrics`);
      await expect(page.locator("h1")).toContainText("Rubrik Penilaian Berbasis AI");

      const buatRubrikBtn = page.locator("button:has-text('Buat Rubrik Baru')").first();
      await buatRubrikBtn.click();

      // Terapkan preset "Esai" untuk Rubrik 1
      const presetEsaiBtn = page.locator("button:has-text('Esai')").first();
      await presetEsaiBtn.click();
      await page.click("button[type='submit']:has-text('Simpan Rubrik Penilaian')");
      await expect(page.locator("text=Tugas Esai & Analisis")).toBeVisible({ timeout: 15000 });

      // 6. Dosen Membuat Rubrik 2 melalui UI di kelas yang sama
      await page.locator("button:has-text('Buat Rubrik Baru')").first().click();
      const presetCodingBtn = page.locator("button:has-text('Pemrograman')").first();
      await presetCodingBtn.click();
      await page.click("button[type='submit']:has-text('Simpan Rubrik Penilaian')");
      await expect(page.locator("text=Tugas Pemrograman / Coding")).toBeVisible({ timeout: 15000 });

      // 7. Buat Tugas 1 yang Menautkan Rubrik 1
      await page.goto(`/classes/${createdClassId}/assignments/new`);
      createdAssignmentTitle = `Tugas Analisis Konsensus Raft ${Date.now().toString().slice(-4)}`;
      await page.fill("#title", createdAssignmentTitle);
      await page.fill(
        "#instructions",
        "Jelaskan mekanisme pemilihan leader (leader election) dan log replication pada algoritma konsensus Raft.",
      );

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const isoString = futureDate.toISOString().slice(0, 16);
      await page.fill("#dueDate", isoString);
      await page.fill("#maxScore", "100");

      // Pilih Rubrik 1 dari dropdown
      await page.locator("#rubricSelect").click();
      await page.locator("div[role='option']:has-text('Tugas Esai & Analisis')").click();

      await page.click("button[type='submit']:has-text('Terbitkan Tugas')");
      await expect(page).not.toHaveURL(/\/assignments\/new/, { timeout: 15000 });
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle, { timeout: 15000 });
      createdAssignmentId = page.url().split("/assignments/")[1].split("/")[0].split("?")[0];

      // 8. Buat Tugas 2 yang Menautkan Rubrik 2 (Menguji 2 tugas dengan rubrik berbeda dalam satu kelas)
      await page.goto(`/classes/${createdClassId}/assignments/new`);
      createdAssignmentTitle2 = `Tugas Praktikum Sharding Database ${Date.now().toString().slice(-4)}`;
      await page.fill("#title", createdAssignmentTitle2);
      await page.fill(
        "#instructions",
        "Implementasikan strategi sharding key dan failover rebalancing pada cluster.",
      );
      await page.fill("#dueDate", isoString);
      await page.fill("#maxScore", "100");

      // Pilih Rubrik 2 dari dropdown
      await page.locator("#rubricSelect").click();
      await page.locator("div[role='option']:has-text('Tugas Pemrograman / Coding')").click();

      await page.click("button[type='submit']:has-text('Terbitkan Tugas')");
      await expect(page).not.toHaveURL(/\/assignments\/new/, { timeout: 15000 });
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle2, { timeout: 15000 });
      createdAssignmentId2 = page.url().split("/assignments/")[1].split("/")[0].split("?")[0];

      // 9. Verifikasi kedua tugas tersimpan dengan rubrik berbeda di kelas
      expect(createdAssignmentId).not.toEqual(createdAssignmentId2);
      await page.goto(`/classes/${createdClassId}`);
      await expect(page.locator(`text=${createdAssignmentTitle}`)).toBeVisible();
      await expect(page.locator(`text=${createdAssignmentTitle2}`)).toBeVisible();

      await dosenContext.close();
    });

    test("Flow B: Mahasiswa bergabung kelas dan mengumpulkan jawaban tugas", async ({
      browser,
    }) => {
      expect(createdEnrollmentKey).toBeTruthy();
      expect(createdClassId).toBeTruthy();

      const studentContext = await browser.newContext();
      const page = await studentContext.newPage();

      // 1. Mahasiswa B Login
      await page.goto("/login");
      await page.fill("#email", "mhs_b@test.local");
      await page.fill("#password", FIXTURE_PASSWORD);
      await page.click("button[type='submit']");
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // 2. Navigasi ke Daftar Kelas & Gabung Kelas
      await page.goto("/classes");
      const gabungKelasBtn = page.locator("button:has-text('Gabung Kelas')").first();
      await gabungKelasBtn.click();

      // Masukkan Kode Enrollment
      await page.fill("#keyInput", createdEnrollmentKey);
      const joinResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/classes/join") && (resp.status() === 201 || resp.status() === 200),
      );
      await page.click("button[type='submit']:has-text('Gabung Sekarang')");
      await joinResponsePromise;

      // Verifikasi kelas sekarang terbuka dan muncul di halaman Mahasiswa
      await expect(page).toHaveURL(new RegExp(`/classes/${createdClassId}`), { timeout: 15000 });
      await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

      // 3. Buka Tugas yang Baru Dibuat
      await page.goto(`/classes/${createdClassId}/assignments/${createdAssignmentId}`);
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle);

      // 4. Pilih Tab Tulis Esai / Teks
      const textTabBtn = page.locator("button:has-text('Tulis Esai / Teks')");
      if (await textTabBtn.isVisible()) {
        await textTabBtn.click();
      }

      const answerContent =
        "Algoritma Raft mencapai konsensus melalui 3 status: Follower, Candidate, dan Leader. Pemilihan leader terjadi ketika follower mengalami election timeout.";
      await page.fill("#answerText", answerContent);

      // 5. Submit Jawaban Tugas
      await page.click("button[type='submit']:has-text('Kumpulkan Tugas')");

      // Tunggu notifikasi sukses
      await expect(page.locator("text=Jawaban berhasil dikumpulkan")).toBeVisible({
        timeout: 10000,
      });

      // 6. Verifikasi Persistensi Submisi Setelah Reload
      await page.reload();
      await expect(page.locator("text=Perbarui Pengumpulan Tugas")).toBeVisible({ timeout: 10000 });
      const textValue = await page.inputValue("#answerText");
      expect(textValue).toContain("Algoritma Raft mencapai konsensus");

      // 7. Kumpulkan Jawaban untuk Tugas 2 (Rubrik Coding / Berbeda)
      await page.goto(`/classes/${createdClassId}/assignments/${createdAssignmentId2}`);
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle2);
      const textTabBtn2 = page.locator("button:has-text('Tulis Esai / Teks')");
      if (await textTabBtn2.isVisible()) {
        await textTabBtn2.click();
      }
      await page.fill(
        "#answerText",
        "Sharding key ditentukan berdasarkan hash mod shard count dengan failover otomatis.",
      );
      await page.click("button[type='submit']:has-text('Kumpulkan Tugas')");
      await expect(page.locator("text=Jawaban berhasil dikumpulkan")).toBeVisible({
        timeout: 10000,
      });

      await studentContext.close();
    });

    test("Flow C: Dosen mereview jawaban, menyimpan draft (privat), lalu mempublikasikan nilai final", async ({
      browser,
    }) => {
      // 1. Dosen Context & Student Context Terpisah
      const dosenContext = await browser.newContext();
      const studentContext = await browser.newContext();

      const dosenPage = await dosenContext.newPage();
      const studentPage = await studentContext.newPage();

      // Login Mahasiswa
      await studentPage.goto("/login");
      await studentPage.fill("#email", "mhs_b@test.local");
      await studentPage.fill("#password", FIXTURE_PASSWORD);
      await studentPage.click("button[type='submit']");
      await expect(studentPage).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // Login Dosen
      await dosenPage.goto("/login");
      await dosenPage.fill("#email", "dosen_a@test.local");
      await dosenPage.fill("#password", FIXTURE_PASSWORD);
      await dosenPage.click("button[type='submit']");
      await expect(dosenPage).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // Buka Halaman Tugas di Dosen
      await dosenPage.goto(`/classes/${createdClassId}/assignments/${createdAssignmentId}`);
      await expect(dosenPage.locator("text=Mahasiswa B Santoso")).toBeVisible({ timeout: 10000 });

      // Dosen Klik "Koreksi AI" / Review Jawaban Mahasiswa
      const reviewBtn = dosenPage.locator("a:has-text('Koreksi AI')").first();
      await reviewBtn.click();
      await expect(dosenPage).toHaveURL(/\/submissions\/[a-zA-Z0-9]+/, { timeout: 10000 });

      // 2. Verifikasi Mahasiswa BELUM Melihat Nilai Sebelum Dirilis
      await studentPage.goto(`/classes/${createdClassId}/assignments/${createdAssignmentId}`);
      // Nilai akhir belum muncul di UI mahasiswa
      await expect(studentPage.locator("text=Nilai & Evaluasi Akhir")).not.toBeVisible();

      // 3. Dosen MENJALANKAN Evaluasi AI melalui UI
      const startAiBtn = dosenPage
        .locator(
          "button:has-text('Mulai Analisis AI'), button:has-text('Mulai Koreksi AI Sekarang')",
        )
        .first();
      await expect(startAiBtn).toBeVisible({ timeout: 10000 });
      await startAiBtn.click();

      // Verifikasi progress streaming AI muncul di UI dan tunggu sampai rekomendasi AI selesai di-stream
      await expect(
        dosenPage.locator("text=Saran Skor AI").or(dosenPage.locator("text=Saran AI")).first(),
      ).toBeVisible({ timeout: 35000 });
      await expect(dosenPage.locator("text=Saran Skor AI")).toBeVisible({ timeout: 35000 });

      // Verifikasi draf AI tetap privat dan tidak terlihat oleh mahasiswa
      await studentPage.reload();
      await expect(studentPage.locator("text=Nilai & Evaluasi Akhir")).not.toBeVisible();

      // Dosen meninjau saran AI, lalu dapat menyalin saran AI ke form keputusan
      const copyBtn = dosenPage
        .locator("button:has-text('Salin Semua Saran AI ke Keputusan Dosen')")
        .first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
      }

      // Dosen memodifikasi / menetapkan nilai dan catatan umpan balik resmi
      await dosenPage.fill("#finalScore", "88");
      await dosenPage.fill(
        "#finalFeedback",
        "Penjelasan mekanisme Raft sangat baik dan tepat. Pemahaman role transition sudah akurat.",
      );

      // 4. Dosen Finalisasi & Publikasikan Nilai
      const publishBtn = dosenPage.locator(
        "button[type='submit']:has-text('Finalisasi & Publikasikan Nilai')",
      );
      await publishBtn.click();

      // Tunggu konfirmasi sukses di layar dosen
      await expect(
        dosenPage.locator("text=Nilai final berhasil disimpan dan dipublikasikan ke mahasiswa"),
      ).toBeVisible({ timeout: 10000 });

      // 5. Mahasiswa Reload dan Melihat Nilai yang Dirilis Beserta Feedback
      await studentPage.reload();
      await expect(studentPage.locator("text=Nilai & Evaluasi Akhir")).toBeVisible({
        timeout: 10000,
      });
      await expect(studentPage.locator("text=88 / 100")).toBeVisible();
      await expect(
        studentPage.locator("text=Penjelasan mekanisme Raft sangat baik dan tepat"),
      ).toBeVisible();

      // 6. Uji Semantik Nilai: Nilai Sah 0 Tetap Ditampilkan sebagai 0 (Bukan Null / Belum Dinilai)
      await dosenPage.fill("#finalScore", "0");
      await dosenPage.fill(
        "#finalFeedback",
        "Format jawaban tidak memenuhi standar kode etik penulisan (Skor 0 diberikan sah).",
      );
      const updateBtn = dosenPage.locator("button[type='submit']:has-text('Perbarui Nilai Final')");
      await updateBtn.click();
      await expect(
        dosenPage.locator("text=Nilai final berhasil disimpan dan dipublikasikan"),
      ).toBeVisible({ timeout: 10000 });

      // Mahasiswa melihat nilai 0 secara sah
      await studentPage.reload();
      await expect(studentPage.locator("text=Nilai & Evaluasi Akhir")).toBeVisible({
        timeout: 10000,
      });
      await expect(studentPage.locator("text=0 / 100")).toBeVisible();
      await expect(
        studentPage.locator("text=Format jawaban tidak memenuhi standar kode etik"),
      ).toBeVisible();

      await dosenContext.close();
      await studentContext.close();
    });

    test("Flow D: Mahasiswa mengunggah berkas PDF valid, ekstraksi teks berhasil, dan Dosen mengevaluasi via AI", async ({
      browser,
    }) => {
      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();

      // 1. Mahasiswa A Login
      await studentPage.goto("/login");
      await studentPage.fill("#email", "mhs_a@test.local");
      await studentPage.fill("#password", FIXTURE_PASSWORD);
      await studentPage.click("button[type='submit']");
      await expect(studentPage).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // 2. Buka kelas RPL A dan tugas 1
      await studentPage.goto("/classes");
      const rplClassCard = studentPage.locator("a:has-text('Rekayasa Perangkat Lunak A')").first();
      await expect(rplClassCard).toBeVisible({ timeout: 10000 });
      await rplClassCard.click();

      const taskLink = studentPage.locator("a:has-text('Tugas 1')").first();
      await expect(taskLink).toBeVisible({ timeout: 10000 });
      await taskLink.click();

      // 3. Pastikan tab Upload Dokumen aktif
      const fileTabBtn = studentPage.locator("button:has-text('Upload Dokumen')").first();
      if (await fileTabBtn.isVisible()) {
        await fileTabBtn.click();
      }

      // 4. Siapkan file PDF valid dan unggah melalui input file
      const pdfText =
        "Kebutuhan fungsional mencakup autentikasi multi-peran dan evaluasi otomatis.";
      const streamContent = `BT /F1 12 Tf 50 700 Td (${pdfText}) Tj ET`;
      const streamLen = streamContent.length;
      const pdfString = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000330 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n417\n%%EOF`;

      const fileInput = studentPage.locator("input[type='file']").first();
      await fileInput.setInputFiles({
        name: "jawaban_srs_mahasiswa.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(pdfString, "utf-8"),
      });

      // Verifikasi nama file terpilih muncul di UI
      await expect(studentPage.locator("text=jawaban_srs_mahasiswa.pdf")).toBeVisible();

      // Submit pengumpulan tugas
      const submitBtn = studentPage
        .locator("button[type='submit']")
        .filter({
          hasText: /Kumpulkan Tugas|Kirim Ulang Jawaban/,
        })
        .first();
      await submitBtn.click();

      await expect(studentPage.locator("text=Jawaban berhasil dikumpulkan")).toBeVisible({
        timeout: 10000,
      });

      // 5. Dosen A Login dan Buka Tugas untuk Menjalankan Evaluasi AI
      const dosenContext = await browser.newContext();
      const dosenPage = await dosenContext.newPage();
      await dosenPage.goto("/login");
      await dosenPage.fill("#email", "dosen_a@test.local");
      await dosenPage.fill("#password", FIXTURE_PASSWORD);
      await dosenPage.click("button[type='submit']");
      await expect(dosenPage).toHaveURL(/\/dashboard/, { timeout: 30000 });

      // Buka kelas dan tugas
      await dosenPage.goto("/classes");
      await dosenPage.locator("a:has-text('Rekayasa Perangkat Lunak A')").first().click();
      await dosenPage.locator("a:has-text('Tugas 1')").first().click();

      // Dosen klik Review / Koreksi AI untuk Mahasiswa A
      await expect(dosenPage.locator("text=Mahasiswa A Pratama")).toBeVisible({ timeout: 10000 });
      const mhsARow = dosenPage.locator("tr, div").filter({ hasText: "Mahasiswa A Pratama" });
      const reviewMhsABtn = mhsARow.locator("a:has-text('Koreksi AI')").first();
      await reviewMhsABtn.click();
      await expect(dosenPage).toHaveURL(/\/submissions\/[a-zA-Z0-9]+/, { timeout: 10000 });

      // Verifikasi teks hasil ekstraksi PDF tampak di panel jawaban
      await expect(dosenPage.locator("text=Kebutuhan fungsional mencakup autentikasi")).toBeVisible(
        {
          timeout: 10000,
        },
      );

      // Dosen menjalankan penilaian AI via UI button
      const triggerAiBtn = dosenPage
        .locator(
          "button:has-text('Mulai Analisis AI'), button:has-text('Mulai Koreksi AI Sekarang')",
        )
        .first();
      await expect(triggerAiBtn).toBeVisible({ timeout: 10000 });
      await triggerAiBtn.click();

      // Verifikasi progres streaming AI muncul dan menyelesaikan saran evaluasi
      await expect(
        dosenPage.locator("text=Saran Skor AI").or(dosenPage.locator("text=Saran AI")).first(),
      ).toBeVisible({ timeout: 35000 });
      await expect(dosenPage.locator("text=Saran Skor AI")).toBeVisible({ timeout: 35000 });

      await studentContext.close();
      await dosenContext.close();
    });
  });
