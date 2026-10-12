import { expect, test } from "@playwright/test";
import jwt from "jsonwebtoken";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe("E2E Pemeriksaan Akses & Keamanan Sistem", () => {
  test("1. Akses tanpa sesi ke API bisnis ditolak 401", async ({ request }) => {
    const res = await request.get("/api/classes");
    expect(res.status()).toBe(401);
  });

  test("2. Mahasiswa B tidak dapat mengakses detail pengumpulan milik Mahasiswa A", async ({
    browser,
    request,
  }) => {
    // 1. Dosen A login untuk mendapatkan ID submission Mahasiswa A di Assignment A1
    const dosenContext = await browser.newContext();
    const dosenPage = await dosenContext.newPage();
    await dosenPage.goto("/login");
    await dosenPage.fill("#email", "dosen_a@test.local");
    await dosenPage.fill("#password", FIXTURE_PASSWORD);
    await dosenPage.click("button[type='submit']");
    await expect(dosenPage).toHaveURL(/\/dashboard/);

    // Ambil daftar kelas A
    const classesRes = await dosenPage.request.get("/api/classes");
    const classes = await classesRes.json();
    const classA = classes.find((c: any) => c.enrollmentKey === "KEY-RPLA");
    expect(classA).toBeTruthy();

    // Pastikan Mahasiswa A mengumpulkan jawaban di Tugas 1
    const mhsAContext = await browser.newContext();
    const mhsAPage = await mhsAContext.newPage();
    await mhsAPage.goto("/login");
    await mhsAPage.fill("#email", "mhs_a@test.local");
    await mhsAPage.fill("#password", FIXTURE_PASSWORD);
    await mhsAPage.click("button[type='submit']");
    await expect(mhsAPage).toHaveURL(/\/dashboard/);

    // Dapatkan ID tugas A1
    const assignmentsRes = await mhsAPage.request.get(`/api/classes/${classA.id}`);
    const classDetail = await assignmentsRes.json();
    const assignmentA1 = classDetail.assignments?.[0];
    expect(assignmentA1).toBeTruthy();

    // Mahasiswa A submit jawaban
    const submitRes = await mhsAPage.request.post(
      `/api/classes/${classA.id}/assignments/${assignmentA1.id}/submissions`,
      {
        data: { content: "Jawaban Mahasiswa A Rahasia & Eksklusif." },
      },
    );
    expect([200, 201]).toContain(submitRes.status());
    const submissionA = await submitRes.json();

    // 2. Mahasiswa B Login di sesi terpisah
    const mhsBContext = await browser.newContext();
    const mhsBPage = await mhsBContext.newPage();
    await mhsBPage.goto("/login");
    await mhsBPage.fill("#email", "mhs_b@test.local");
    await mhsBPage.fill("#password", FIXTURE_PASSWORD);
    await mhsBPage.click("button[type='submit']");
    await expect(mhsBPage).toHaveURL(/\/dashboard/);

    // Mahasiswa B mencoba mengakses submission Mahasiswa A langsung via URL UI
    await mhsBPage.goto(
      `/classes/${classA.id}/assignments/${assignmentA1.id}/submissions/${submissionA.id}`,
    );
    // UI harus mengalihkan atau menampilkan 404/403
    await expect(mhsBPage).not.toHaveURL(new RegExp(submissionA.id));

    // Mahasiswa B mencoba akses via API
    const crossApiRes = await mhsBPage.request.get(
      `/api/classes/${classA.id}/assignments/${assignmentA1.id}/submissions`,
    );
    if (crossApiRes.status() === 200) {
      const data = await crossApiRes.json();
      // Mahasiswa B tidak boleh melihat submission milik Mahasiswa A
      const leaked = data.some((s: any) => s.userId === submissionA.userId);
      expect(leaked).toBe(false);
    } else {
      expect([401, 403, 404]).toContain(crossApiRes.status());
    }

    await dosenContext.close();
    await mhsAContext.close();
    await mhsBContext.close();
  });

  test("3. Dosen B tidak dapat memodifikasi kelas atau finalisasi nilai milik Dosen A", async ({
    browser,
  }) => {
    const dosenBContext = await browser.newContext();
    const dosenBPage = await dosenBContext.newPage();
    await dosenBPage.goto("/login");
    await dosenBPage.fill("#email", "dosen_b@test.local");
    await dosenBPage.fill("#password", FIXTURE_PASSWORD);
    await dosenBPage.click("button[type='submit']");
    await expect(dosenBPage).toHaveURL(/\/dashboard/);

    // Ambil info Kelas A dari Dosen A
    const dosenAContext = await browser.newContext();
    const dosenAPage = await dosenAContext.newPage();
    await dosenAPage.goto("/login");
    await dosenAPage.fill("#email", "dosen_a@test.local");
    await dosenAPage.fill("#password", FIXTURE_PASSWORD);
    await dosenAPage.click("button[type='submit']");
    await expect(dosenAPage).toHaveURL(/\/dashboard/);
    const classARes = await dosenAPage.request.get("/api/classes");
    const classes = await classARes.json();
    const classA = classes.find((c: any) => c.enrollmentKey === "KEY-RPLA");

    // Dosen B mencoba PATCH /api/classes/[classAId]
    const patchRes = await dosenBPage.request.patch(`/api/classes/${classA.id}`, {
      data: { name: "Nama Dibajak Oleh Dosen B" },
    });
    expect([403, 404]).toContain(patchRes.status());

    await dosenBContext.close();
    await dosenAContext.close();
  });

  test("4. Kunci jawaban, materi privat, dan enrollment key tidak bocor ke mahasiswa", async ({
    browser,
  }) => {
    const mhsContext = await browser.newContext();
    const mhsPage = await mhsContext.newPage();
    await mhsPage.goto("/login");
    await mhsPage.fill("#email", "mhs_a@test.local");
    await mhsPage.fill("#password", FIXTURE_PASSWORD);
    await mhsPage.click("button[type='submit']");
    await expect(mhsPage).toHaveURL(/\/dashboard/);

    // Ambil kelas A via API
    const classesRes = await mhsPage.request.get("/api/classes");
    const classes = await classesRes.json();
    const classA = classes.find((c: any) => c.name.includes("Rekayasa Perangkat Lunak"));
    expect(classA).toBeTruthy();

    // Pastikan enrollmentKey disembunyikan dari mahasiswa
    expect(classA.enrollmentKey).toBeUndefined();

    // Ambil detail kelas A
    const detailRes = await mhsPage.request.get(`/api/classes/${classA.id}`);
    const detail = await detailRes.json();
    expect(detail.enrollmentKey).toBeUndefined();

    // Periksa rubrik: answerKey dan material TIDAK boleh ada di payload mahasiswa
    if (detail.assignments?.[0]?.rubric?.criteria) {
      for (const cr of detail.assignments[0].rubric.criteria) {
        expect(cr.answerKey).toBeUndefined();
        expect(cr.material).toBeUndefined();
      }
    }

    await mhsContext.close();
  });

  test("5. Header buatan browser (x-user-id / x-role) tidak mengganti identitas sesi", async ({
    browser,
  }) => {
    const mhsContext = await browser.newContext({
      extraHTTPHeaders: {
        "x-user-id": "cmv4_fake_dosen_id",
        "x-role": "DOSEN",
        role: "DOSEN",
      },
    });
    const mhsPage = await mhsContext.newPage();
    await mhsPage.goto("/login");
    await mhsPage.fill("#email", "mhs_a@test.local");
    await mhsPage.fill("#password", FIXTURE_PASSWORD);
    await mhsPage.click("button[type='submit']");
    await expect(mhsPage).toHaveURL(/\/dashboard/);

    // Coba membuat kelas (hanya diizinkan untuk DOSEN)
    const createClassRes = await mhsPage.request.post("/api/classes", {
      data: { name: "Kelas Ilegal Dari Mahasiswa Spoofed" },
    });
    // Wajib ditolak 401 atau 403 karena sesi asli bertipe MAHASISWA
    expect([401, 403]).toContain(createClassRes.status());

    await mhsContext.close();
  });

  test("6. Backend Hono menolak token internal tidak sah (Kontrol positif + 5 kasus negatif)", async ({
    request,
  }) => {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const secret = process.env.INTERNAL_API_SECRET || "default_unsafe_secret_for_dev_only";

    // KONTROL POSITIF: Token valid harus diterima backend
    const validToken = jwt.sign(
      { sub: "usr_valid_123", role: "DOSEN", iss: "frontend", aud: "backend" },
      secret,
      { algorithm: "HS256", expiresIn: "5m" },
    );
    const positiveRes = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect([200, 404]).toContain(positiveRes.status());
    expect(positiveRes.status()).not.toBe(401);

    // KASUS NEGATIF 1: Signature Palsu (Tampered Signature)
    const tamperedToken = jwt.sign(
      { sub: "usr_attacker", role: "DOSEN", iss: "frontend", aud: "backend" },
      "wrong_attacker_secret_key_12345",
      { algorithm: "HS256" },
    );
    const res1 = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(res1.status()).toBe(401);

    // KASUS NEGATIF 2: Expired Token
    const expiredToken = jwt.sign(
      { sub: "usr_valid_123", role: "DOSEN", iss: "frontend", aud: "backend" },
      secret,
      { algorithm: "HS256", expiresIn: "-10s" },
    );
    const res2 = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res2.status()).toBe(401);

    // KASUS NEGATIF 3: Issuer Salah (Wrong Issuer)
    const wrongIssToken = jwt.sign(
      { sub: "usr_valid_123", role: "DOSEN", iss: "malicious-issuer", aud: "backend" },
      secret,
      { algorithm: "HS256", expiresIn: "5m" },
    );
    const res3 = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${wrongIssToken}` },
    });
    expect(res3.status()).toBe(401);

    // KASUS NEGATIF 4: Audience Salah (Wrong Audience)
    const wrongAudToken = jwt.sign(
      { sub: "usr_valid_123", role: "DOSEN", iss: "frontend", aud: "external-service" },
      secret,
      { algorithm: "HS256", expiresIn: "5m" },
    );
    const res4 = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${wrongAudToken}` },
    });
    expect(res4.status()).toBe(401);

    // KASUS NEGATIF 5: Tanpa Claims Wajib (Missing sub or role)
    const missingClaimsToken = jwt.sign({ iss: "frontend", aud: "backend" }, secret, {
      algorithm: "HS256",
      expiresIn: "5m",
    });
    const res5 = await request.get(`${backendUrl}/classes`, {
      headers: { Authorization: `Bearer ${missingClaimsToken}` },
    });
    expect(res5.status()).toBe(401);
  });
});
