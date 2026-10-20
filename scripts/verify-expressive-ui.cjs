// UI integration checks use explicit local fixture data, never production records.
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const { chromium } = require("playwright");
const { expect } = require("@playwright/test");
const http = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("fs");
const due = (d) => new Date(Date.now() + d * 86400000).toISOString();
const classes = [
  {
    id: "rpl",
    name: "Rekayasa Perangkat Lunak",
    subject: "RPL · Semester 5",
    description: "Dari kebutuhan pengguna ke rancangan sistem.",
    enrollmentKey: "RPL2026",
    _count: { enrollments: 32, assignments: 4 },
  },
  {
    id: "data",
    name: "Sistem Basis Data",
    subject: "Basis Data · Semester 3",
    description: "Memahami data untuk kebutuhan nyata.",
    enrollmentKey: "DBS2026",
    _count: { enrollments: 28, assignments: 3 },
  },
  {
    id: "ux",
    name: "Interaksi Manusia & Komputer",
    subject: "Desain · Semester 5",
    enrollmentKey: "IMK2026",
    _count: { enrollments: 30, assignments: 5 },
  },
];
const tasks = [
  {
    id: "a1",
    title: "Analisis kebutuhan sistem",
    dueDate: due(1),
    status: "PUBLISHED",
    submissionType: "ANY",
    classId: "rpl",
    instructions: "Jelaskan kebutuhan pengguna.",
    maxScore: 100,
    class: { name: classes[0].name },
    submissions: [],
  },
  {
    id: "a2",
    title: "Normalisasi basis data",
    dueDate: due(3),
    status: "PUBLISHED",
    submissionType: "ANY",
    classId: "data",
    maxScore: 100,
    instructions: "Susun tabel.",
    class: { name: classes[1].name },
    submissions: [{ id: "s4" }],
  },
];
const queue = ["Nadia Putri", "Rizky Pratama", "Alya Maharani", "Dimas Saputra"].map((name, i) => ({
  id: "s" + i,
  createdAt: due(-1),
  user: { name },
  assignment: {
    id: "a" + ((i % 2) + 1),
    title: tasks[i % 2].title,
    classId: classes[i % 2].id,
    class: { name: classes[i % 2].name },
  },
}));
const enriched = classes.map((c) => ({
  ...c,
  assignments: tasks.filter((t) => t.classId === c.id),
}));
const overview = {
  role: "DOSEN",
  classes: enriched,
  enrollments: enriched.map((c) => ({ id: c.id, class: c })),
  rubrics: [],
};
const analytics = {
  classesCount: 3,
  assignmentsCount: 12,
  submissionsCount: 60,
  gradesCount: 50,
  releasedCount: 1,
  distribution: [
    { label: "85–100", count: 1 },
    { label: "70–<85", count: 0 },
    { label: "55–<70", count: 0 },
    { label: "<55", count: 0 },
  ],
  gradeRows: [
    {
      id: "g1",
      student: "Nadia Putri",
      className: classes[0].name,
      assignment: tasks[0].title,
      score: 90,
      maxScore: 100,
      releasedAt: due(0),
    },
  ],
};
let frontend, backend, browser;
const errors = [];
let studyCalls = 0;
let studyFail = false;
(async () => {
  backend = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/ai/study") {
      let body = "";
      for await (const c of req) body += c;
      const b = JSON.parse(body);
      if (!b.messages.some((m) => m.role === "user")) throw Error("missing user");
      studyCalls++;
      if (studyFail) {
        res.statusCode = 503;
        res.end(JSON.stringify({ detail: "Layanan AI uji sedang tidak tersedia." }));
        return;
      }
      res.end(
        JSON.stringify({
          answer:
            "Mulailah dari kebutuhan pengguna. Hubungkan setiap kebutuhan dengan keputusan rancangan, lalu periksa kriteria rubrik.",
        }),
      );
      return;
    }
    const data =
      req.url === "/dashboard"
        ? {
            dosenData: { classes, pending: 12, released: 48, queue },
            studentData: {
              enrollments: classes.map((c) => ({ id: c.id, class: c })),
              tasks,
              grades: [],
            },
          }
        : req.url === "/assignments-overview"
          ? overview
          : req.url === "/analytics"
            ? analytics
            : req.url === "/classes"
              ? classes
              : req.url === "/grading-hub"
                ? []
                : {};
    res.end(JSON.stringify(data));
  });
  await new Promise((r) => backend.listen(3001, "127.0.0.1", r));
  const log = fs.openSync("/tmp/dexa-revision-server.log", "w");
  frontend = spawn(
    process.execPath,
    ["../../node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1"],
    {
      cwd: root + "/apps/frontend",
      env: { ...process.env, BACKEND_URL: "http://127.0.0.1:3001" },
      stdio: ["ignore", log, log],
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3000")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    timezoneId: "Asia/Jakarta",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  async function check(name, full = true) {
    await page.waitForTimeout(500);
    const w = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
    if (w[1] > w[0] + 1) throw Error(name + " overflow " + w);
    await page.screenshot({ path: "/tmp/dexa-v2-" + name + ".png", fullPage: full });
    console.log("PASS layout", name, w);
  }
  await page.goto("http://127.0.0.1:3000");
  await expect(page.locator(".deferred-demo")).toHaveAttribute("data-demo-loaded", "false");
  const moving = page.locator(".hero-world .dex-body-bounce");
  const one = await moving.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(160);
  if (one === (await moving.evaluate((e) => getComputedStyle(e).transform)))
    throw Error("mascot not moving");
  await check("landing-desktop", false);
  if (process.env.CAPTURE_MOTION) {
    for (let frame = 0; frame < 18; frame++) {
      await page
        .locator(".hero-world")
        .screenshot({
          path: "/tmp/dexa-motion-" + String(frame).padStart(2, "0") + ".png",
          animations: "allow",
        });
      await page.waitForTimeout(75);
    }
  }
  await page.getByRole("button", { name: "Jeda animasi" }).click();
  await page.waitForTimeout(30);
  const paused = await moving.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(180);
  if (paused !== (await moving.evaluate((e) => getComputedStyle(e).transform)))
    throw Error("pause does not work");
  await page.getByRole("button", { name: "Putar animasi" }).click();
  await page.locator("#fitur").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await expect(page.locator(".motion-feature-card").first()).toHaveAttribute("data-seen", "true");
  await page.getByRole("button", { name: "03 Nilai akhir, keputusan Anda." }).click();
  await expect(page.locator(".tour-step-card h3")).toHaveText("Rilis umpan balik");
  await page.getByRole("button", { name: "Saya mahasiswa" }).click();
  await expect(page.locator(".roles-copy .bounce-button")).toHaveAttribute(
    "href",
    "/register?role=MAHASISWA",
  );
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await expect(page.locator(".deferred-demo")).toHaveAttribute("data-demo-loaded", "true");
  await page.locator("#demo-score").fill("92");
  await page.getByRole("button", { name: "Setujui & rilis (simulasi)" }).click();
  await expect(page.locator(".playground-head .motion-badge")).toHaveText("Nilai dirilis");
  await page.getByRole("button", { name: "Ulangi simulasi" }).click();
  await expect(page.locator("#demo-score")).toHaveValue("85");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await page.locator(".motion-nav").getByText("Jelajahi fitur").click();
  await expect(page.getByRole("button", { name: "Buka menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await check("landing-mobile", false);
  const reduced = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const rp = await reduced.newPage();
  await rp.goto("http://127.0.0.1:3000");
  if (
    (await rp
      .locator(".hero-world .dex-body-bounce")
      .evaluate((e) => getComputedStyle(e).animationName)) !== "none"
  )
    throw Error("reduced motion ignored");
  await reduced.close();
  const token = (role) =>
    Buffer.from("{}").toString("base64url") +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: "demo",
        name: role === "DOSEN" ? "Ihsan Pratama" : "Nadia Putri",
        email: "demo@example.com",
        role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".test";
  await ctx.addCookies([
    { name: "dexa_session", value: token("DOSEN"), domain: "127.0.0.1", path: "/" },
  ]);
  await ctx.addInitScript(() => sessionStorage.setItem("dexa_session_active", "1"));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("http://127.0.0.1:3000/dashboard");
  await check("dashboard-desktop");
  if ((await page.locator(".dashboard-tool").count()) !== 6) throw Error("features missing");
  await page.getByRole("textbox", { name: "Cari mahasiswa atau tugas" }).fill("Nadia");
  await expect(page.locator(".dashboard-queue>a")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Cari mahasiswa atau tugas" }).fill("zzzz");
  await expect(page.getByText("Belum ada hasil yang cocok.")).toBeVisible();
  await page.getByRole("textbox", { name: "Cari mahasiswa atau tugas" }).clear();
  await page.getByRole("combobox", { name: "Filter kelas antrean" }).selectOption("data");
  await expect(page.locator(".dashboard-queue>a")).toHaveCount(2);
  await page.getByRole("combobox", { name: "Filter kelas antrean" }).selectOption("all");
  await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
  if (
    Math.abs(
      await page.locator(".workspace-sidebar").evaluate((e) => e.getBoundingClientRect().top),
    ) > 1
  )
    throw Error("sidebar scroll");
  await page.getByRole("button", { name: "Ciutkan sidebar" }).click();
  await page.waitForTimeout(250);
  if (
    (await page.locator(".workspace-sidebar").evaluate((e) => e.getBoundingClientRect().width)) !==
    78
  )
    throw Error("sidebar collapse");
  await page.getByRole("button", { name: "Perluas sidebar" }).click();
  await page.goto("http://127.0.0.1:3000/calendar");
  await check("calendar-desktop");
  const day = String(new Date(tasks[0].dueDate).getDate());
  await page
    .locator(".calendar-days>button.has-task")
    .filter({ has: page.locator("span", { hasText: new RegExp("^" + day + "$") }) })
    .click();
  await expect(page.locator(".calendar-agenda>a")).toHaveCount(1);
  const monthTitle = await page.locator(".calendar-toolbar h2").innerText();
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  if (monthTitle === (await page.locator(".calendar-toolbar h2").innerText()))
    throw Error("month navigation");
  await page.goto("http://127.0.0.1:3000/analytics");
  await check("analytics-desktop");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Unduh CSV" }).click(),
  ]);
  await download.saveAs("/tmp/dexa-report-check.csv");
  if (!fs.readFileSync("/tmp/dexa-report-check.csv", "utf8").includes("Nadia Putri"))
    throw Error("CSV missing real row");
  await page.goto("http://127.0.0.1:3000/copilot");
  await check("copilot-desktop");
  await page.locator("#study-assignment").selectOption("a1");
  await page
    .getByRole("button", { name: "Bantu saya memahami kriteria rubrik tugas ini." })
    .click();
  await page.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(page.locator(".study-message-assistant")).toContainText(
    "Mulailah dari kebutuhan pengguna",
  );
  if (studyCalls !== 1) throw Error("chat did not call backend");
  studyFail = true;
  await page.locator("#study-question").fill("Bagaimana selanjutnya?");
  await page.getByRole("button", { name: "Kirim pertanyaan" }).click();
  await expect(page.locator(".study-error")).toContainText("Layanan AI uji sedang tidak tersedia");
  await expect(page.locator("#study-question")).toHaveValue("Bagaimana selanjutnya?");
  studyFail = false;
  await page.getByRole("button", { name: "Mulai percakapan baru" }).click();
  await expect(page.locator(".study-message")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of [
    ["dashboard", "dashboard-mobile"],
    ["calendar", "calendar-mobile"],
    ["copilot", "copilot-mobile"],
    ["analytics", "analytics-mobile"],
  ]) {
    await page.goto("http://127.0.0.1:3000/" + route);
    await check(name);
  }
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page.locator("dialog").getByRole("link", { name: "Kalender tugas" }).click();
  await page.waitForURL("**/calendar");
  if (await page.locator("dialog").evaluate((e) => e.open)) throw Error("drawer open");
  await ctx.addCookies([
    { name: "dexa_session", value: token("MAHASISWA"), domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("http://127.0.0.1:3000/dashboard");
  await check("student-mobile");
  await page.getByRole("button", { name: "Belum dikumpulkan", exact: true }).click();
  await expect(page.locator(".student-task-path>a")).toHaveCount(1);
  await page.getByRole("button", { name: "Terkumpul", exact: true }).click();
  await expect(page.locator(".student-task-path>a")).toHaveCount(1);
  await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
  await check("student-dark");
  await page.getByRole("button", { name: "Gunakan tema terang" }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("http://127.0.0.1:3000/dashboard");
  await check("tablet");
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(
    "ALL UI CHECKS PASSED — motion, pause, reduced motion, deferred loading, role/tour interaction, score simulation, feature navigation, filtering, calendar, CSV, study request + failure, responsive and dark theme. API responses use local fixtures.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (frontend) frontend.kill();
    if (backend) backend.close();
  });
