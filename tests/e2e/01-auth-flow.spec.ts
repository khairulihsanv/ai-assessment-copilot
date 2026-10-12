import { expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe("E2E Alur Autentikasi Interaktif", () => {
  test("1. Login gagal dengan kata sandi salah menampilkan pesan error", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "dosen_a@test.local");
    await page.fill("#password", "PasswordSalah123!");
    await page.click("button[type='submit']");

    // Validasi pesan error dari form aplikasi sebenarnya
    const errorAlert = page.locator("text=Email atau kata sandi tidak cocok").first();
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
  });

  test("2. Dosen dapat login interaktif melalui UI dan diarahkan ke dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#email", "dosen_a@test.local");
    await page.fill("#password", FIXTURE_PASSWORD);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    // Verifikasi nama pengguna muncul di dashboard
    await expect(page.locator("text=Dr. Dosen A, M.Kom.").first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Mahasiswa dapat login interaktif melalui UI dan diarahkan ke dashboard", async ({
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
