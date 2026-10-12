import { expect, test } from "@playwright/test";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe("E2E Pemeriksaan UI Responsif & Tampilan (Desktop & Mobile)", () => {
  test("1. Halaman Login responsif dan bebas horizontal overflow", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Masuk ke ruang kerja");

    // Periksa tidak ada horizontal scroll overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Form inputs and buttons are visible and enabled
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeEnabled();

    // Pastikan tidak ada hydration error
    const hydrationErrors = consoleErrors.filter((e) => e.toLowerCase().includes("hydration"));
    expect(hydrationErrors.length).toBe(0);
  });

  test("2. Halaman Daftar Kelas responsif pada viewport aktif", async ({ page }) => {
    // Login Dosen A
    await page.goto("/login");
    await page.fill("#email", "dosen_a@test.local");
    await page.fill("#password", FIXTURE_PASSWORD);
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/classes");
    await expect(page.locator("h1")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Tombol buat kelas terlihat
    const createBtn = page.locator("button:has-text('Buat Kelas Baru')").first();
    await expect(createBtn).toBeVisible();
  });

  test("3. Halaman Detail Kelas & Tugas responsif dan layout rapi", async ({ page }) => {
    // Login Mahasiswa A
    await page.goto("/login");
    await page.fill("#email", "mhs_a@test.local");
    await page.fill("#password", FIXTURE_PASSWORD);
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/classes");
    const classCardLink = page.locator("a[href^='/classes/']").first();
    if (await classCardLink.isVisible()) {
      await classCardLink.click();
      await expect(page).toHaveURL(/\/classes\//);

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    }
  });
});
