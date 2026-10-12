import { expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe
  .serial("E2E Alur Pengguna Inti: Kelas → Tugas → Submisi → Review → Nilai", () => {
    let createdEnrollmentKey: string;
    let createdAssignmentTitle: string;
    let createdClassId: string;
    let createdAssignmentId: string;

    test("Flow A: Dosen membuat kelas baru dan membuat penugasan", async ({ browser }) => {
      const dosenContext = await browser.newContext();
      const page = await dosenContext.newPage();

      // 1. Dosen Login
      await page.goto("/login");
      await page.fill("#email", "dosen_a@test.local");
      await page.fill("#password", FIXTURE_PASSWORD);
      await page.click("button[type='submit']");
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

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

      // 5. Buat Tugas Baru
      const buatTugasBtn = page.locator("a:has-text('Buat Tugas Baru')").first();
      await buatTugasBtn.click();
      await expect(page).toHaveURL(/\/assignments\/new/, { timeout: 10000 });

      createdAssignmentTitle = `Tugas Analisis Konsensus Raft ${Date.now().toString().slice(-4)}`;
      await page.fill("#title", createdAssignmentTitle);
      await page.fill(
        "#instructions",
        "Jelaskan mekanisme pemilihan leader (leader election) dan log replication pada algoritma konsensus Raft.",
      );

      // Set Due Date: 7 hari ke depan
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const isoString = futureDate.toISOString().slice(0, 16);
      await page.fill("#dueDate", isoString);

      await page.fill("#maxScore", "100");

      // Submit pembuatan tugas
      await page.click("button[type='submit']:has-text('Terbitkan Tugas')");

      // Tunggu diarahkan ke halaman detail tugas (bukan lagi di /assignments/new)
      await expect(page).not.toHaveURL(/\/assignments\/new/, { timeout: 15000 });
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle, { timeout: 15000 });
      createdAssignmentId = page.url().split("/assignments/")[1].split("/")[0].split("?")[0];

      // 6. Verifikasi persistensi data setelah reload
      await page.reload();
      await expect(page.locator("h1")).toContainText(createdAssignmentTitle);
      await expect(page.locator("text=Jelaskan mekanisme pemilihan leader")).toBeVisible();

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
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // 2. Navigasi ke Daftar Kelas & Gabung Kelas
      await page.goto("/classes");
      const gabungKelasBtn = page.locator("button:has-text('Gabung Kelas')").first();
      await gabungKelasBtn.click();

      // Masukkan Kode Enrollment
      await page.fill("#keyInput", createdEnrollmentKey);
      await page.click("button[type='submit']:has-text('Gabung Sekarang')");

      // Verifikasi kelas sekarang muncul di halaman Mahasiswa
      await page.goto(`/classes/${createdClassId}`);
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
      await expect(studentPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // Login Dosen
      await dosenPage.goto("/login");
      await dosenPage.fill("#email", "dosen_a@test.local");
      await dosenPage.fill("#password", FIXTURE_PASSWORD);
      await dosenPage.click("button[type='submit']");
      await expect(dosenPage).toHaveURL(/\/dashboard/, { timeout: 15000 });

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

      // 3. Dosen Mengisi Nilai dan Feedback
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
  });
