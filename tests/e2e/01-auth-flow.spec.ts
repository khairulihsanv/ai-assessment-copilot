import { expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe("E2E Alur Autentikasi Interaktif", () => {
  test("1. Halaman Landing menampilkan CTA dan mengarahkan ke form masuk", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Koreksi Tugas");

    const masukBtn = page.locator("a[href='/login'], .lp-nav__login").first();
    await masukBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("2. Login gagal dengan kata sandi salah menampilkan pesan error", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "dosen_a@test.local");
    await page.fill("#password", "PasswordSalah123!");
    await page.click("button[type='submit']");

    // Validasi pesan error dari form aplikasi sebenarnya
    const errorAlert = page.locator("text=Email atau kata sandi tidak cocok").first();
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
  });

  test("3. Dosen dapat login interaktif melalui UI, diarahkan ke dashboard, lalu logout", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#email", "dosen_a@test.local");
    await page.fill("#password", FIXTURE_PASSWORD);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    // Verifikasi nama pengguna muncul di dashboard
    await expect(page.locator("text=Dr. Dosen A, M.Kom.").first()).toBeVisible({ timeout: 10000 });

    // Dosen melakukan Logout via tombol Keluar
    const logoutBtn = page.locator("button[title='Keluar dari Akun']").first();
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // Coba kembali ke dashboard setelah logout (harus diredirect kembali ke /login)
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("4. Mahasiswa dapat login interaktif melalui UI dan diarahkan ke dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#email", "mhs_a@test.local");
    await page.fill("#password", FIXTURE_PASSWORD);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    // Verifikasi identitas mahasiswa di portal
    await expect(page.locator("text=Mahasiswa A Pratama").first()).toBeVisible({ timeout: 10000 });
  });
});
