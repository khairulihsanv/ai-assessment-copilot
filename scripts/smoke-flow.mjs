// Smoke test: the whole lecturer/student flow through the frontend's API routes.
// It CREATES accounts, a class and a graded submission, so run it only against a test stack:
//   BASE=http://localhost:3000 node scripts/smoke-flow.mjs
// The AI step uses the configured model (one draft).
// Plus negative checks for access control and validation.
const BASE = process.env.BASE || "http://localhost:3100";
const stamp = Date.now().toString(36);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

class Session {
  cookie = "";
  async req(method, path, body, headers = {}) {
    const init = { method, headers: { ...headers }, redirect: "manual" };
    if (this.cookie) init.headers.cookie = this.cookie;
    if (body !== undefined) {
      if (typeof body === "string" || body instanceof FormData) init.body = body;
      else {
        init.body = JSON.stringify(body);
        init.headers["content-type"] = "application/json";
      }
    }
    const res = await fetch(`${BASE}${path}`, init);
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) if (c.startsWith("dexa_session=")) this.cookie = c.split(";")[0];
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, location: res.headers.get("location") };
  }
}

async function account(name, email, role) {
  const s = new Session();
  const reg = await s.req("POST", "/api/auth/register", {
    name,
    email,
    password: "Rahasia@123",
    role,
  });
  check(`daftar ${role.toLowerCase()} ${email}`, reg.status === 201, `status ${reg.status}`);
  const login = await s.req("POST", "/api/auth/login", {
    email: email.toUpperCase(),
    password: "Rahasia@123",
  });
  check(
    `login ${role.toLowerCase()} (email huruf besar)`,
    login.status === 200 && !!s.cookie,
    `status ${login.status}`,
  );
  return s;
}

try {
  const dosen = await account("Dosen Uji", `dosen.${stamp}@example.com`, "DOSEN");
  const dup = await new Session().req("POST", "/api/auth/register", {
    name: "Ganda",
    email: `DOSEN.${stamp}@example.com`,
    password: "Rahasia@123",
    role: "MAHASISWA",
  });
  check(
    "daftar ulang dengan email sama ditolak",
    dup.status === 400,
    JSON.stringify(dup.data).slice(0, 90),
  );

  const cls = await dosen.req("POST", "/api/classes", {
    name: `Kelas Uji ${stamp}`,
    subject: "Basis Data",
    description: "Kelas uji alur",
  });
  const classId = cls.data?.id ?? cls.data?.class?.id;
  const key = cls.data?.enrollmentKey ?? cls.data?.class?.enrollmentKey;
  check(
    "dosen membuat kelas",
    cls.status === 201 && !!classId && !!key,
    `status ${cls.status}, kode ${key}`,
  );

  const badRubric = await dosen.req("POST", `/api/classes/${classId}/rubrics`, {
    title: "Salah",
    criteria: [{ label: "A", maxScore: 10, weight: 60 }],
  });
  check(
    "rubrik dengan bobot ≠ 100% ditolak",
    badRubric.status === 400 || badRubric.status === 422,
    `status ${badRubric.status}`,
  );

  const rubric = await dosen.req("POST", `/api/classes/${classId}/rubrics`, {
    title: "Rubrik Uji Normalisasi",
    criteria: [
      {
        label: "Pemahaman konsep",
        description: "Menjelaskan tujuan normalisasi dan anomali data.",
        maxScore: 10,
        weight: 50,
      },
      {
        label: "Penerapan bentuk normal",
        description: "Menerapkan 1NF sampai 3NF pada contoh tabel.",
        maxScore: 10,
        weight: 50,
      },
    ],
  });
  const rubricId = rubric.data?.id ?? rubric.data?.rubric?.id;
  check("dosen membuat rubrik", rubric.status === 201 && !!rubricId, `status ${rubric.status}`);

  const due = new Date(Date.now() + 7 * 864e5).toISOString();
  const asg = await dosen.req("POST", `/api/classes/${classId}/assignments`, {
    title: "Esai Normalisasi (uji)",
    instructions: "Jelaskan normalisasi dan terapkan 1NF-3NF.",
    submissionType: "ANY",
    dueDate: due,
    maxScore: 100,
    rubricId,
  });
  const assignmentId = asg.data?.id ?? asg.data?.assignment?.id;
  check("dosen membuat tugas", asg.status === 201 && !!assignmentId, `status ${asg.status}`);

  const mhs = await account("Mahasiswa Uji", `mhs.${stamp}@example.com`, "MAHASISWA");
  const outsider = await account("Orang Luar", `luar.${stamp}@example.com`, "MAHASISWA");

  const wrong = await mhs.req("POST", "/api/classes/join", { enrollmentKey: "SALAH999" });
  check(
    "gabung dengan kode salah ditolak",
    wrong.status === 404 || wrong.status === 400,
    `status ${wrong.status}`,
  );
  const join = await mhs.req("POST", "/api/classes/join", { enrollmentKey: key.toLowerCase() });
  check(
    "gabung kelas (kode huruf kecil)",
    join.status === 201 || join.status === 200,
    `status ${join.status} ${JSON.stringify(join.data).slice(0, 80)}`,
  );
  const again = await mhs.req("POST", "/api/classes/join", { enrollmentKey: key });
  check(
    "gabung dua kali ditolak",
    again.status === 400 || again.status === 409,
    `status ${again.status}`,
  );

  const peek = await outsider.req("GET", `/api/classes/${classId}/assignments/${assignmentId}`);
  check(
    "mahasiswa lain tidak bisa membuka tugas kelas orang",
    [401, 403, 404].includes(peek.status),
    `status ${peek.status}`,
  );

  const empty = await mhs.req(
    "POST",
    `/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    { content: "   " },
  );
  check(
    "jawaban kosong ditolak",
    empty.status === 400 || empty.status === 422,
    `status ${empty.status}`,
  );

  const answer =
    "Normalisasi basis data adalah proses menata tabel agar data tidak disimpan berulang-ulang sehingga tidak terjadi anomali saat data ditambah, diubah, atau dihapus.\n\n" +
    "Pada 1NF setiap kolom berisi nilai atomik. 2NF menghapus ketergantungan parsial pada kunci gabungan, dan 3NF menghapus ketergantungan transitif, misalnya nama dosen yang bergantung pada kode mata kuliah.";
  const sub = await mhs.req(
    "POST",
    `/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    { content: answer },
  );
  const submissionId = sub.data?.submission?.id ?? sub.data?.submissionId ?? sub.data?.id;
  check(
    "mahasiswa mengirim jawaban teks",
    sub.status === 201 && !!submissionId,
    `status ${sub.status}`,
  );

  const sneak = await mhs.req("GET", `/api/submissions/${submissionId}/grade/stream`);
  check(
    "mahasiswa tidak bisa memicu draf AI",
    [401, 403].includes(sneak.status),
    `status ${sneak.status}`,
  );
  const otherDosen = await account("Dosen Lain", `dosen2.${stamp}@example.com`, "DOSEN");
  const foreign = await otherDosen.req("GET", `/api/submissions/${submissionId}/grade/stream`);
  check(
    "dosen kelas lain tidak bisa memicu draf AI",
    [401, 403, 404].includes(foreign.status),
    `status ${foreign.status}`,
  );

  const t0 = Date.now();
  const stream = await dosen.req("GET", `/api/submissions/${submissionId}/grade/stream`);
  const text = typeof stream.data === "string" ? stream.data : JSON.stringify(stream.data);
  const doneChunk = text.split("event: done")[1];
  const evaluation = doneChunk
    ? JSON.parse(doneChunk.slice(doneChunk.indexOf("data:") + 5).trim()).aiEvaluation
    : null;
  check(
    "draf AI selesai lewat stream",
    !!evaluation,
    `${Math.round((Date.now() - t0) / 1000)} detik, total saran ${evaluation?.suggestedTotalScore}`,
  );

  const detail = await dosen.req("GET", `/api/classes/${classId}/assignments/${assignmentId}`);
  const subRow = (detail.data?.submissions ?? detail.data?.assignment?.submissions ?? []).find(
    (x) => x.id === submissionId,
  );
  const versionId = subRow?.activeVersionId;
  check("dosen melihat versi aktif jawaban", !!versionId, `status ${detail.status}`);
  const per = (evaluation?.perCriterionScore ?? []).map((pc) => ({
    criterionId: pc.criterionId,
    aiScore: pc.score,
    finalScore: pc.score,
    decision: "accepted",
    aiFeedback: pc.feedback,
    finalFeedback: pc.feedback,
  }));
  const total = evaluation?.suggestedTotalScore ?? 0;
  const fin = await dosen.req("POST", `/api/submissions/${submissionId}/finalize`, {
    expectedSubmissionVersionId: versionId,
    finalScore: total,
    finalFeedback: "Esai sudah baik, perjelas contoh 3NF.",
    isAIAssisted: true,
    editedFromAI: false,
    evaluationRunId: evaluation?.id,
    perCriterion: per,
  });
  check(
    "dosen merilis nilai",
    fin.status === 200 || fin.status === 201,
    `status ${fin.status} ${fin.status >= 400 ? JSON.stringify(fin.data).slice(0, 120) : ""}`,
  );

  const mhsFin = await mhs.req("POST", `/api/submissions/${submissionId}/finalize`, {
    expectedSubmissionVersionId: versionId,
    finalScore: 100,
    finalFeedback: "nilai sendiri",
  });
  check(
    "mahasiswa tidak bisa memberi nilai sendiri",
    [401, 403].includes(mhsFin.status),
    `status ${mhsFin.status}`,
  );

  const page = await mhs.req("GET", `/classes/${classId}/assignments/${assignmentId}/result`);
  const html = typeof page.data === "string" ? page.data : "";
  check(
    "mahasiswa melihat umpan balik dosen di halaman hasil",
    page.status === 200 && html.includes("perjelas contoh 3NF"),
    `status ${page.status}`,
  );

  const resubmit = await mhs.req(
    "POST",
    `/api/classes/${classId}/assignments/${assignmentId}/submissions`,
    { content: answer + " Tambahan setelah dinilai." },
  );
  check(
    "kirim ulang setelah nilai dirilis (perilaku dicatat)",
    true,
    `status ${resubmit.status} ${JSON.stringify(resubmit.data).slice(0, 110)}`,
  );

  const anon = await new Session().req("GET", "/dashboard");
  check(
    "tanpa login diarahkan ke halaman masuk",
    anon.status === 307 && (anon.location || "").includes("/login"),
    `status ${anon.status}`,
  );
} catch (e) {
  check("skrip berjalan tanpa error", false, e.stack?.slice(0, 300));
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} lolos`);
process.exitCode = failed.length ? 1 : 0;
