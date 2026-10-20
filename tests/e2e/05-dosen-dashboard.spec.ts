import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { AssignmentStatus, PrismaClient, Role, SubmissionType } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../apps/frontend/src/server/config/database-url";
import { FIXTURE_PASSWORD } from "../../scripts/e2e-seed";

test.describe("Dashboard dosen: alur dan isolasi tampilan", () => {
  let prisma: PrismaClient;
  const createdClasses: string[] = [];
  const createdUsers: string[] = [];
  let reviewPath = "";
  let newTaskPath = "";
  const emptyTeacherEmail = `ui-empty-dosen-${Date.now()}@test.local`;
  const emptyStudentEmail = `ui-empty-student-${Date.now()}@test.local`;
  const authenticatedSessions = new Map<string, Awaited<ReturnType<BrowserContext["cookies"]>>>();

  async function login(page: Page, email = "dosen_a@test.local") {
    const cookies = authenticatedSessions.get(email);
    if (cookies) {
      // Reuse a real UI login for presentation tests without exhausting the login rate limit.
      await page.context().addCookies(cookies);
      await page.addInitScript(() => sessionStorage.setItem("dexa_session_active", "1"));
      await page.goto("/dashboard");
      await expect(page.locator("#main-content h1")).toBeVisible();
      return;
    }
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(FIXTURE_PASSWORD);
    await page.getByRole("button", { name: "Masuk ke Portal Akademik", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("#main-content h1")).toBeVisible();
    authenticatedSessions.set(email, await page.context().cookies());
  }

  test.beforeAll(async () => {
    const url = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
    prisma = new PrismaClient({ datasources: { db: { url } } });
    const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "dosen_a@test.local" } });
    for (const [email, role] of [
      [emptyTeacherEmail, Role.DOSEN],
      [emptyStudentEmail, Role.MAHASISWA],
    ] as const) {
      const user = await prisma.user.create({
        data: { email, role, name: "Pengguna Tanpa Data", passwordHash: teacher.passwordHash },
      });
      createdUsers.push(user.id);
    }
    const suffix = Date.now().toString(36);
    for (const [index, className, studentName] of [
      [0, "Analisis dan Perancangan Sistem", "Nadia Putri"],
      [1, "Basis Data dan Manajemen Informasi", "Raka Pratama"],
    ] as const) {
      const cls = await prisma.class.create({
        data: {
          name: className,
          subject: index ? "Sistem Informasi · Kelas B" : "Rekayasa Perangkat Lunak · Kelas A",
          dosenId: teacher.id,
          enrollmentKey: `UI-${suffix}-${index}`,
        },
      });
      createdClasses.push(cls.id);
      const student = await prisma.user.create({
        data: {
          email: `dashboard-${suffix}-${index}@test.local`,
          name: studentName,
          role: Role.MAHASISWA,
          passwordHash: teacher.passwordHash,
        },
      });
      createdUsers.push(student.id);
      await prisma.enrollment.create({ data: { classId: cls.id, userId: student.id } });
      const assignment = await prisma.assignment.create({
        data: {
          title: index
            ? "Normalisasi dan Perancangan Basis Data"
            : "Analisis Kebutuhan Sistem Perpustakaan",
          instructions:
            "Uraikan analisis Anda dan sertakan alasan untuk setiap keputusan perancangan.",
          classId: cls.id,
          status: AssignmentStatus.PUBLISHED,
          submissionType: SubmissionType.TEXT,
          dueDate: new Date(Date.now() + 604800000),
        },
      });
      const submission = await prisma.submission.create({
        data: { assignmentId: assignment.id, userId: student.id },
      });
      const version = await prisma.submissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber: 1,
          type: SubmissionType.TEXT,
          content:
            "Analisis kebutuhan sistem: pengelolaan koleksi, peminjaman, dan laporan transaksi.",
        },
      });
      await prisma.submission.update({
        where: { id: submission.id },
        data: { activeVersionId: version.id },
      });
      if (index === 0) {
        reviewPath = `/classes/${cls.id}/assignments/${assignment.id}/submissions/${submission.id}`;
        newTaskPath = `/classes/${cls.id}/assignments/new`;
      }
    }
  });

  test.afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.class.deleteMany({ where: { id: { in: createdClasses } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  test("pencarian dan filter tidak mengubah tujuan review jawaban", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page);
    const dashboard = page.locator("[data-dosen-dashboard]");
    await expect(dashboard.getByRole("heading", { name: "Antrean koreksi" })).toBeVisible();
    await expect(dashboard.getByRole("heading", { name: "Nadia Putri" })).toBeVisible();
    await page.getByLabel("Cari mahasiswa atau tugas").fill("Nadia");
    await expect(dashboard.getByRole("heading", { name: "Raka Pratama" })).toHaveCount(0);
    await expect(dashboard.locator(`a[href='${reviewPath}']`)).toBeVisible();
    await page
      .getByLabel("Filter kelas")
      .selectOption({ label: "Basis Data dan Manajemen Informasi" });
    await expect(page.getByRole("status")).toContainText("Tidak ada hasil yang cocok");
    await page.getByRole("button", { name: "Hapus filter" }).click();
    await expect(dashboard.getByRole("heading", { name: "Raka Pratama" })).toBeVisible();
    await dashboard.locator(`a[href='${reviewPath}']`).click();
    await expect(page).toHaveURL(new RegExp(`${reviewPath}$`));
    await expect(page.locator("#main-content")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("buat tugas memilih kelas dan dialog dapat dibatalkan dengan keyboard", async ({ page }) => {
    await login(page);
    const trigger = page.getByRole("button", { name: "Buat tugas", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Buat tugas untuk kelas mana?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByRole("link", { name: "Analisis dan Perancangan Sistem" }).click();
    await expect(page).toHaveURL(new RegExp(`${newTaskPath}$`));
    await expect(page.getByRole("heading", { name: "Buat Tugas Baru" })).toBeVisible();
  });

  test("desktop, tablet, dan mobile tidak overflow; navigasi mobile berfungsi", async ({
    page,
  }, testInfo) => {
    await login(page);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await expect(page.getByRole("heading", { name: "Antrean koreksi" })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `Horizontal overflow pada ${width}px`).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`dashboard-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("[data-dosen-dashboard]")).toHaveCSS("color", "rgb(241, 245, 249)");
    await page.screenshot({
      path: testInfo.outputPath("dashboard-dark-390.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Gunakan tema terang" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Buka navigasi" }).click();
    const navigation = page.getByRole("dialog", { name: "Navigasi Dexa Assessment" });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("link", { name: "Kelas Kuliah" }).click();
    await expect(page).toHaveURL(/\/classes$/);
    await expect(navigation).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Kelas Anda" })).toBeVisible();
  });

  test("dashboard mahasiswa tetap memakai alur dan tampilan semula", async ({ page }) => {
    await login(page, "mhs_a@test.local");
    await expect(page.getByRole("heading", { name: "Halo, Mahasiswa A Pratama." })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tugas yang perlu diperhatikan" }),
    ).toBeVisible();
    await expect(page.locator("[data-dosen-dashboard]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Buat tugas", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });

  test("sidebar mengikuti tema, hamburger di header, dan navigasi tetap bekerja saat diciutkan", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await login(page);
    const sidebar = page.locator("[data-workspace-sidebar]");
    const brand = sidebar.getByRole("link", { name: "Dexa Assessment — Ringkasan" });
    const collapse = sidebar.getByRole("button", { name: "Ciutkan sidebar" });
    const brandBounds = await brand.boundingBox();
    const toggleBounds = await collapse.boundingBox();
    expect(brandBounds).not.toBeNull();
    expect(toggleBounds).not.toBeNull();
    expect(toggleBounds!.x).toBeGreaterThanOrEqual(brandBounds!.x + brandBounds!.width);
    expect(Math.abs(toggleBounds!.y - brandBounds!.y)).toBeLessThan(12);
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.screenshot({
      path: testInfo.outputPath("sidebar-light-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });

    await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
    const darkSidebar = await sidebar.evaluate((element) => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (channels: number[]) =>
        channels
          .map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          })
          .reduce(
            (result, channel, index) => result + channel * [0.2126, 0.7152, 0.0722][index],
            0,
          );
      const background = luminance(rgb(getComputedStyle(element).backgroundColor));
      const inactive = element.querySelector("a[href='/classes']");
      if (!inactive) throw new Error("Navigasi kelas tidak ditemukan");
      const foreground = luminance(rgb(getComputedStyle(inactive).color));
      return {
        background,
        contrast:
          (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05),
      };
    });
    expect(darkSidebar.background).toBeLessThan(0.1);
    expect(darkSidebar.contrast).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: testInfo.outputPath("sidebar-dark-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });

    await collapse.click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect(sidebar.getByRole("button", { name: "Perluas sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await page.screenshot({
      path: testInfo.outputPath("sidebar-dark-collapsed.png"),
      fullPage: true,
      animations: "disabled",
    });
    await sidebar.getByRole("link", { name: "Kelas Kuliah" }).click();
    await expect(page).toHaveURL(/\/classes$/);
    await expect(sidebar.getByRole("link", { name: "Kelas Kuliah" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("button", { name: "Perluas sidebar" })).toBeVisible();
    await sidebar.getByRole("button", { name: "Perluas sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("heading", { name: "Kelas Anda" })).toBeVisible();
    await expect(page.locator("[data-workspace]")).toHaveCSS("background-color", "rgb(11, 18, 32)");
    await page.screenshot({
      path: testInfo.outputPath("classes-dark-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Gunakan tema terang" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(sidebar).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({
      path: testInfo.outputPath("classes-light-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
  });

  test("drawer mobile mengikuti tema dan melepas fokus serta scroll lock setelah ditutup atau diresize", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const trigger = page.getByRole("button", { name: "Buka navigasi" });
    const navigation = page.getByRole("dialog", { name: "Navigasi Dexa Assessment" });
    await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
    await trigger.click();
    await expect(navigation).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(navigation.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.screenshot({
      path: testInfo.outputPath("sidebar-dark-mobile.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(navigation).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await page.getByRole("button", { name: "Gunakan tema terang" }).click();
    await trigger.click();
    await expect(navigation).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("sidebar-light-mobile.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 960 });
    await expect(navigation).not.toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await expect(page.locator("[data-workspace-sidebar]")).toBeVisible();
    await page
      .locator("[data-workspace-sidebar]")
      .getByRole("link", { name: "Pengaturan Akun" })
      .click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("sidebar mahasiswa mempertahankan menu sesuai peran dalam kedua tema", async ({ page }) => {
    await login(page, "mhs_a@test.local");
    const sidebar = page.locator("[data-workspace-sidebar]");
    await expect(sidebar.getByRole("link", { name: "Riwayat Nilai" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Koreksi & Asesmen AI" })).toHaveCount(0);
    await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
    await expect(page.locator("[data-workspace]")).toHaveCSS("background-color", "rgb(11, 18, 32)");
    await sidebar.getByRole("button", { name: "Ciutkan sidebar" }).click();
    await sidebar.getByRole("link", { name: "Riwayat Nilai" }).click();
    await expect(page).toHaveURL(/\/grades$/);
    await expect(sidebar.getByRole("link", { name: "Riwayat Nilai" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.getByRole("button", { name: "Gunakan tema terang" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("halaman ruang kerja dosen konsisten pada tema terang dan gelap tanpa overflow", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page);
    for (const theme of ["light", "dark"] as const) {
      if (theme === "dark") await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
      for (const route of [
        "classes",
        "assignments",
        "rubrics",
        "analytics",
        "settings",
        "grading",
        "docs",
      ]) {
        await page.goto(`/${route}`);
        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.locator("#main-content h1")).toHaveCSS(
          "color",
          theme === "dark" ? "rgb(241, 245, 249)" : "rgb(17, 24, 39)",
        );
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 960 });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            `${route} ${theme} ${width}px`,
          ).toBe(false);
          await page.screenshot({
            path: testInfo.outputPath(`${route}-${theme}-${width}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
    expect(errors).toEqual([]);
  });

  test("dialog kelas, menu kartu, dan pilihan formulir mengikuti tema serta navigasi yang benar", async ({
    page,
  }, testInfo) => {
    await login(page);
    const classId = newTaskPath.split("/")[2];
    for (const theme of ["light", "dark"] as const) {
      if (theme === "dark") await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
      const background = theme === "dark" ? "rgb(21, 34, 56)" : "rgb(255, 255, 255)";
      await page.goto("/classes");
      const createClass = page
        .getByRole("button", { name: "Buat Kelas Baru", exact: true })
        .first();
      await createClass.click();
      const dialog = page.getByRole("dialog", { name: "Buat Kelas Baru", exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS("background-color", background);
      await page.screenshot({
        path: testInfo.outputPath(`class-dialog-${theme}.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(createClass).toBeFocused();
      await page
        .getByRole("button", { name: "Menu kelas Analisis dan Perancangan Sistem", exact: true })
        .click();
      const menu = page.locator("[data-slot=dropdown-menu-content]");
      await expect(menu).toBeVisible();
      await expect(menu).toHaveCSS("background-color", background);
      await menu.getByRole("menuitem", { name: "Lihat tugas", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/classes/${classId}/assignments$`));
      await page.goto("/classes");
      await page
        .getByRole("link", { name: "Lihat tugas Analisis dan Perancangan Sistem", exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`/classes/${classId}/assignments$`));
      await page.goto(newTaskPath);
      await page.locator("#submissionType").click();
      const select = page.locator("[data-slot=select-content]");
      await expect(select).toBeVisible();
      await expect(select).toHaveCSS("background-color", background);
      await page.screenshot({
        path: testInfo.outputPath(`assignment-select-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(select).not.toBeVisible();
    }
  });

  test("tema pengaturan tersimpan dan tidak menawarkan penyimpanan preferensi yang belum tersedia", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings");
    const dark = page.getByRole("button", { name: "Gelap", exact: true });
    const light = page.getByRole("button", { name: "Terang", exact: true });
    await dark.click();
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await light.click();
    await expect(light).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Simpan Perubahan" })).toHaveCount(0);
    await expect(page.getByText("Pengaturan berikut belum tersedia untuk diubah.")).toBeVisible();
  });

  test("analitik dan riwayat nilai mempertahankan angka nol tanpa angka contoh", async ({
    page,
  }) => {
    await login(page, emptyTeacherEmail);
    await page.goto("/analytics");
    await expect(page.locator("[data-metric-value]")).toHaveText(["0", "0", "0", "0"]);
    await expect(page.getByText("89%", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Memenuhi Standar Unggul", { exact: true })).toHaveCount(0);
    await page.goto("/rubrics");
    await expect(page.locator("#main-content h1")).toHaveText("Belum Ada Kelas Kuliah");
    await page.context().clearCookies();
    await login(page, emptyStudentEmail);
    await page.goto("/grades");
    await expect(page.locator("[data-metric-value]")).toHaveText(["0", "0"]);
    await expect(
      page.getByText("Belum ada nilai resmi yang disahkan oleh dosen pengampu."),
    ).toBeVisible();
    await expect(page.getByText("3.88", { exact: true })).toHaveCount(0);
    await expect(page.getByText("91.4", { exact: true })).toHaveCount(0);
  });

  test("halaman mahasiswa dan modal tugas tetap terbaca pada layar kecil", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page, "mhs_a@test.local");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
    for (const route of ["grades", "copilot", "assignments", "settings", "classes"]) {
      await page.goto(`/${route}`);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator("#main-content h1")).toHaveCSS("color", "rgb(241, 245, 249)");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        route,
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`student-${route}-dark.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.context().clearCookies();
    await login(page);
    await page.goto("/assignments");
    const trigger = page.getByRole("button", { name: "Buat tugas", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Buat Tugas Baru", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("background-color", "rgb(21, 34, 56)");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    expect(errors).toEqual([]);
  });
});
