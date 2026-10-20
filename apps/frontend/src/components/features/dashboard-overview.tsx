"use client";
import { ArrowRight, CalendarDays, Check, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DexMascot } from "@/components/brand/dex-mascot";
import { FeatureIcon, type FeatureIconName } from "@/components/brand/feature-icon";
import { formatRelativeTime } from "@/shared/utils";
import { ClassCard } from "./class-card";

export interface TeacherDashboardData {
  classes: {
    id: string;
    name: string;
    subject: string | null;
    _count: { enrollments: number; assignments: number };
  }[];
  pending: number;
  released: number;
  queue: {
    id: string;
    createdAt: string | Date;
    user: { name: string };
    assignment: { id: string; title: string; classId: string; class: { name: string } };
  }[];
}
export interface StudentDashboardData {
  enrollments: { id: string; class: { id: string; name: string } }[];
  tasks: {
    id: string;
    title: string;
    dueDate: string | Date;
    classId: string;
    class: { name: string };
    submissions: { id: string }[];
  }[];
  grades: {
    id: string;
    finalScore: number;
    submission: { assignment: { id: string; classId: string; title: string; maxScore: number } };
  }[];
}
export interface DashboardPayload {
  dosenData?: TeacherDashboardData;
  studentData?: StudentDashboardData;
  role: string;
}
const teacherTools: [string, string, FeatureIconName, string][] = [
  ["Kelas saya", "Atur ruang dan anggota", "class", "/classes"],
  ["Tugas", "Buat & bagikan penugasan", "task", "/assignments"],
  ["Rubrik", "Susun kriteria berbobot", "rubric", "/rubrics"],
  ["Koreksi AI", "Tinjau, sesuaikan, rilis", "review", "/grading"],
  ["Kalender tugas", "Lihat tenggat terdekat", "calendar", "/calendar"],
  ["Laporan kelas", "Rekap & ekspor data", "report", "/analytics"],
];
const studentTools: typeof teacherTools = [
  ["Kelas saya", "Ruang belajar Anda", "class", "/classes"],
  ["Tugas", "Kerjakan & kumpulkan", "task", "/assignments"],
  ["Nilai & umpan balik", "Baca catatan dosen", "grade", "/grades"],
  ["Study Copilot", "Diskusikan ide & rubrik", "copilot", "/copilot"],
  ["Kalender tugas", "Jangan lewatkan tenggat", "calendar", "/calendar"],
  ["Panduan", "Kenali cara kerja Dexa", "shield", "/docs"],
];
const tones = ["blue", "peach", "lilac", "lime", "blue", "peach"] as const;
function FeatureHub({ teacher }: { teacher: boolean }) {
  return (
    <section className="dashboard-feature-hub">
      <div className="dashboard-section-heading">
        <div>
          <p className="dashboard-kicker">RUANG KERJA ANDA</p>
          <h2>Mau mulai dari mana?</h2>
        </div>
        <span className="dashboard-help-text">Semua fitur, satu tempat.</span>
      </div>
      <div className="dashboard-tools">
        {(teacher ? teacherTools : studentTools).map(([title, description, icon, href], i) => (
          <Link key={href} href={href} className="dashboard-tool">
            <FeatureIcon name={icon} tone={tones[i]} />
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
            <ArrowRight size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}
function Welcome({ name, teacher, href }: { name: string; teacher: boolean; href: string }) {
  return (
    <header className="dashboard-welcome">
      <div>
        <span className="welcome-badge">
          <span />
          RUANG {teacher ? "MENGAJAR" : "BELAJAR"}
        </span>
        <h1>
          {teacher ? "Selamat mengajar" : "Halo"}, {name}.
        </h1>
        <p>
          {teacher
            ? "Ide besar dimulai dari kelas kecil. Mari buat kemajuan hari ini."
            : "Satu tugas, satu pemahaman baru. Lanjutkan langkah belajarmu."}
        </p>
        <Link href={href} className="bounce-button bounce-small">
          {teacher ? "Buat tugas baru" : "Lihat tugas saya"} <ArrowRight size={16} />
        </Link>
      </div>
      <div className="welcome-mascot">
        <span>{teacher ? "Kita mulai?" : "Kamu pasti bisa!"}</span>
        <DexMascot pose="wave" />
      </div>
    </header>
  );
}
function Metric({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: FeatureIconName;
  tone: "blue" | "lime" | "peach";
}) {
  return (
    <div className={`dashboard-stat dashboard-stat-${tone}`}>
      <div>
        <FeatureIcon name={icon} tone={tone} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
export function TeacherOverview({ name, data }: { name: string; data: TeacherDashboardData }) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const rows = data.queue.filter(
    (s) =>
      (classFilter === "all" || s.assignment.classId === classFilter) &&
      `${s.user.name} ${s.assignment.title}`
        .toLocaleLowerCase("id")
        .includes(search.toLocaleLowerCase("id")),
  );
  const progress =
    data.pending + data.released
      ? Math.round((data.released / (data.pending + data.released)) * 100)
      : 0;
  return (
    <div className="dashboard-v2">
      <Welcome
        name={name}
        teacher
        href={data.classes[0] ? `/classes/${data.classes[0].id}/assignments/new` : "/classes"}
      />
      <FeatureHub teacher />
      <section className="dashboard-stats" aria-label="Ringkasan pekerjaan">
        <Metric
          label="Perlu dikoreksi"
          value={data.pending}
          note="Pengumpulan menunggu nilai rilis"
          icon="review"
          tone="peach"
        />
        <Metric
          label="Nilai dirilis"
          value={data.released}
          note="Sudah bisa dibaca mahasiswa"
          icon="grade"
          tone="lime"
        />
        <Metric
          label="Kelas aktif"
          value={data.classes.length}
          note={`${data.classes.reduce((n, c) => n + c._count.enrollments, 0)} keanggotaan mahasiswa`}
          icon="class"
          tone="blue"
        />
      </section>
      <div className="dashboard-main-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>
                Antrean koreksi <span>{data.pending}</span>
              </h2>
              <p>Jawaban terbaru yang menunggu keputusan Anda.</p>
            </div>
            <Link href="/grading">
              Lihat semua <ArrowRight size={15} />
            </Link>
          </div>
          <div className="queue-controls">
            <label>
              <Search size={16} />
              <input
                aria-label="Cari mahasiswa atau tugas"
                placeholder="Cari mahasiswa atau tugas…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filter kelas antrean"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="all">Semua kelas</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {rows.length ? (
            <div className="dashboard-queue">
              {rows.map((s) => (
                <Link
                  key={s.id}
                  href={`/classes/${s.assignment.classId}/assignments/${s.assignment.id}/submissions/${s.id}`}
                >
                  <span className="queue-avatar">
                    {s.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{s.user.name}</strong>
                    <p>{s.assignment.title}</p>
                    <small>
                      {s.assignment.class.name} · {formatRelativeTime(s.createdAt)}
                    </small>
                  </div>
                  <span className="queue-status">Perlu ditinjau</span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <FeatureIcon name="review" tone="lime" />
              <h3>
                {data.queue.length ? "Belum ada hasil yang cocok." : "Antrean Anda sudah beres."}
              </h3>
              <p>
                {data.queue.length
                  ? "Coba kata kunci atau kelas lainnya."
                  : "Pengumpulan baru akan muncul di sini."}
              </p>
            </div>
          )}
        </section>
        <aside className="dashboard-rail">
          <section className="dashboard-progress-card">
            <FeatureIcon name="grade" tone="lime" />
            <h2>
              Sedikit demi sedikit,
              <br />
              kelas terus bergerak.
            </h2>
            <div className="dashboard-progress-number">
              <strong>{progress}%</strong>
              <span>pengumpulan sudah dirilis</span>
            </div>
            <div
              className="dashboard-progress-track"
              role="progressbar"
              aria-label="Proporsi pengumpulan yang sudah dirilis"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              {data.released} dari {data.pending + data.released} pengumpulan memiliki nilai rilis.
            </p>
            <Link href="/analytics">
              Lihat laporan <ArrowRight size={15} />
            </Link>
          </section>
          <Link href="/copilot" className="dashboard-copilot-card">
            <FeatureIcon name="copilot" tone="lilac" />
            <div>
              <strong>Butuh teman berpikir?</strong>
              <p>Diskusikan konsep dan rubrik bersama Study Copilot.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
      <section>
        <div className="dashboard-section-heading">
          <h2>Kelas yang Anda ampu</h2>
          <Link href="/classes">
            Kelola kelas <ArrowRight size={15} />
          </Link>
        </div>
        {data.classes.length ? (
          <div className="dashboard-course-grid">
            {data.classes.slice(0, 3).map((c) => (
              <ClassCard
                key={c.id}
                id={c.id}
                name={c.name}
                subject={c.subject}
                studentCount={c._count.enrollments}
                isDosen
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty dashboard-panel">
            <FeatureIcon name="class" />
            <h3>Ruang mengajar pertama Anda.</h3>
            <p>Buat kelas, bagikan kode, lalu mulai dari satu tugas.</p>
            <Link href="/classes" className="bounce-button bounce-small">
              Buat kelas <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
export function StudentOverview({ name, data }: { name: string; data: StudentDashboardData }) {
  const [filter, setFilter] = useState("all");
  const submitted = data.tasks.filter((t) => t.submissions.length).length;
  const progress = data.tasks.length ? Math.round((submitted / data.tasks.length) * 100) : 0;
  const tasks = data.tasks.filter(
    (t) => filter === "all" || (filter === "todo" ? !t.submissions.length : !!t.submissions.length),
  );
  return (
    <div className="dashboard-v2">
      <Welcome name={name} teacher={false} href="/assignments" />
      <FeatureHub teacher={false} />
      <section className="dashboard-stats" aria-label="Ringkasan belajar">
        <Metric
          label="Kelas diikuti"
          value={data.enrollments.length}
          note="Ruang belajar Anda saat ini"
          icon="class"
          tone="blue"
        />
        <Metric
          label="Belum dikumpulkan"
          value={data.tasks.length - submitted}
          note="Dari maksimal 6 tugas terdekat"
          icon="task"
          tone="peach"
        />
        <Metric
          label="Nilai dirilis"
          value={data.grades.length}
          note="Catatan resmi dari dosen"
          icon="grade"
          tone="lime"
        />
      </section>
      <div className="dashboard-main-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Langkah belajar berikutnya</h2>
              <p>Pilih tugas dan lanjutkan dari tempat terakhir.</p>
            </div>
            <Link href="/calendar" aria-label="Buka kalender tugas">
              <CalendarDays size={20} />
            </Link>
          </div>
          <div className="dashboard-filter-tabs">
            {[
              ["all", "Semua"],
              ["todo", "Belum dikumpulkan"],
              ["done", "Terkumpul"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id || "all")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="student-task-path">
            {tasks.length ? (
              tasks.map((t, i) => (
                <Link key={t.id} href={`/classes/${t.classId}/assignments/${t.id}`}>
                  <span className={`path-node ${t.submissions.length ? "path-done" : ""}`}>
                    {t.submissions.length ? <Check size={20} /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <small>{t.class.name}</small>
                    <strong>{t.title}</strong>
                    <p>
                      {t.submissions.length ? "Sudah dikumpulkan" : "Belum dikumpulkan"} ·{" "}
                      {formatRelativeTime(t.dueDate)}
                    </p>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))
            ) : (
              <div className="dashboard-empty">
                <FeatureIcon name="task" tone="lime" />
                <h3>
                  {data.tasks.length
                    ? "Tidak ada tugas pada filter ini."
                    : "Belum ada tugas terbit."}
                </h3>
                <p>
                  {data.tasks.length
                    ? "Coba lihat tab lainnya."
                    : "Tugas akan muncul setelah dibagikan dosen."}
                </p>
              </div>
            )}
          </div>
        </section>
        <aside className="dashboard-rail">
          <section className="dashboard-progress-card">
            <FeatureIcon name="grade" tone="lime" />
            <h2>
              Setiap langkah
              <br />
              tetap berarti.
            </h2>
            <div className="dashboard-progress-number">
              <strong>{progress}%</strong>
              <span>tugas ditampilkan sudah terkumpul</span>
            </div>
            <div
              className="dashboard-progress-track"
              role="progressbar"
              aria-label="Progres tugas yang ditampilkan"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              {submitted} dari {data.tasks.length} tugas pada ringkasan ini sudah dikumpulkan.
            </p>
          </section>
          <Link href="/copilot" className="dashboard-copilot-card">
            <FeatureIcon name="copilot" tone="lilac" />
            <div>
              <strong>Belajar nggak harus sendiri.</strong>
              <p>Tanya konsep atau pahami rubrik bersama Dex.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>Umpan balik terbaru</h2>
            <p>Nilai resmi dan catatan dari dosen.</p>
          </div>
          <Link href="/grades">
            Lihat nilai <ArrowRight size={15} />
          </Link>
        </div>
        {data.grades.length ? (
          <div className="released-grade-list">
            {data.grades.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                href={`/classes/${g.submission.assignment.classId}/assignments/${g.submission.assignment.id}/result`}
              >
                <FeatureIcon name="grade" tone="lime" />
                <strong>{g.submission.assignment.title}</strong>
                <span>
                  {g.finalScore}
                  <small>/{g.submission.assignment.maxScore}</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>Umpan balik akan tampil setelah dosen merilis nilai.</p>
          </div>
        )}
      </section>
    </div>
  );
}
