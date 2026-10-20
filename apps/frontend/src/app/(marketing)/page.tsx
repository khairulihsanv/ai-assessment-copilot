"use client";

import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Menu,
  Pause,
  Play,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DexMascot } from "@/components/brand/dex-mascot";
import { FeatureIcon, type FeatureIconName } from "@/components/brand/feature-icon";
import { PageMotion } from "@/components/motion/page-motion";
import "./landing.css";

const ReviewDemo = dynamic(() => import("@/components/features/lazy-review-demo"), {
  loading: () => (
    <div className="demo-placeholder" role="status">
      Menyiapkan ruang tinjauan…
    </div>
  ),
});
const features: {
  name: FeatureIconName;
  title: string;
  description: string;
  tag: string;
  tone: "blue" | "lime" | "peach" | "lilac";
  href: string;
}[] = [
  {
    name: "class",
    title: "Kelas, tanpa tercecer.",
    description: "Buat ruang kuliah dan ajak mahasiswa bergabung dengan kode kelas.",
    tag: "KELAS & ANGGOTA",
    tone: "blue",
    href: "/classes",
  },
  {
    name: "task",
    title: "Tugas punya tempat.",
    description: "Instruksi, tenggat, dan jawaban PDF, Word, atau teks tersusun bersama.",
    tag: "PENUGASAN",
    tone: "peach",
    href: "/assignments",
  },
  {
    name: "rubric",
    title: "Jelas cara menilainya.",
    description: "Susun kriteria dan bobot rubrik. Gunakan kembali untuk tugas berikutnya.",
    tag: "RUBRIK BERBOBOT",
    tone: "lilac",
    href: "/rubrics",
  },
  {
    name: "review",
    title: "Koreksi bersama AI.",
    description: "Tinjau rekomendasi skor dan umpan balik, sesuaikan, lalu rilis sendiri.",
    tag: "TINJAUAN DOSEN",
    tone: "lime",
    href: "/grading",
  },
  {
    name: "copilot",
    title: "Ada teman berpikir.",
    description: "Diskusikan konsep dan rubrik bersama Study Copilot sebelum melanjutkan tugas.",
    tag: "STUDY COPILOT",
    tone: "blue",
    href: "/copilot",
  },
  {
    name: "calendar",
    title: "Tenggat lebih terlihat.",
    description: "Lihat agenda tugas dan perkembangan penilaian dari satu dashboard.",
    tag: "KALENDER & LAPORAN",
    tone: "peach",
    href: "/calendar",
  },
];
function DeferredDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="deferred-demo" data-demo-loaded={ready}>
      {ready ? (
        <ReviewDemo />
      ) : (
        <div className="demo-placeholder">
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <button
            type="button"
            className="bounce-button bounce-secondary"
            onClick={() => setReady(true)}
          >
            Buka simulasi <Play size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function LandingPage() {
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [role, setRole] = useState<"dosen" | "mahasiswa">("dosen");
  const [step, setStep] = useState(0);
  const tour = [
    {
      title: "Mulai dari kelas Anda.",
      text: "Bagikan kode kelas, susun instruksi tugas, dan tetapkan rubrik penilaian.",
      label: "Siapkan kelas",
      icon: "class" as const,
    },
    {
      title: "Bantu membaca setiap jawaban.",
      text: "Mahasiswa mengumpulkan berkas. AI menyiapkan saran sesuai kriteria yang Anda tentukan.",
      label: "Tinjau saran AI",
      icon: "review" as const,
    },
    {
      title: "Nilai akhir, keputusan Anda.",
      text: "Baca jawaban dan saran, ubah bila perlu, lalu rilis nilai ke mahasiswa.",
      label: "Rilis umpan balik",
      icon: "grade" as const,
    },
  ];
  return (
    <div className={`motion-landing ${paused ? "motion-paused" : ""}`}>
      <PageMotion />
      <header className="motion-header">
        <Link href="/" className="motion-brand" aria-label="Dexa Assessment — Beranda">
          <Image src="/dexa-logo.png" width={36} height={36} alt="" />
          <strong>
            dexa<span>.</span>
          </strong>
          <span className="brand-divider" />
          <small>ruang belajar bersama</small>
        </Link>
        <nav className={`motion-nav ${menu ? "is-open" : ""}`} aria-label="Navigasi beranda">
          {[
            ["#fitur", "Jelajahi fitur"],
            ["#cara-kerja", "Cara kerja"],
            ["#demo", "Coba dulu"],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="motion-header-actions">
          <button
            type="button"
            className="motion-control"
            aria-label={paused ? "Putar animasi" : "Jeda animasi"}
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <Link href="/login" className="bounce-button bounce-small bounce-secondary">
            Masuk <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            className="motion-menu"
            aria-label={menu ? "Tutup menu" : "Buka menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main-content">
        <section className="motion-hero">
          <div className="hero-message">
            <span className="motion-eyebrow">
              <span className="eyebrow-dot" />
              Teman baru untuk kelas Anda
            </span>
            <h1>
              Bikin kelas
              <br />
              lebih{" "}
              <span className="hero-word">
                hidup.
                <svg viewBox="0 0 300 18" aria-hidden="true">
                  <path
                    d="M5 11Q145-2 290 10M30 17Q150 5 263 15"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>
            <p>
              Lebih sedikit waktu untuk pekerjaan berulang.
              <br className="desktop-only" /> Lebih banyak ruang untuk belajar, memahami,
              <br className="desktop-only" /> dan memberi umpan balik yang berarti.
            </p>
            <div className="hero-ctas">
              <Link href="/register" className="bounce-button">
                Mulai petualangan kelas <ArrowRight size={19} />
              </Link>
              <a href="#demo" className="hero-watch">
                <span>
                  <Play size={13} fill="currentColor" />
                </span>
                Coba cara kerjanya
              </a>
            </div>
            <div className="hero-reassurance">
              <span className="avatar-stack" aria-hidden="true">
                <i>
                  <BookOpen size={16} />
                </i>
                <i>
                  <GraduationCap size={17} />
                </i>
                <i>
                  <Users size={16} />
                </i>
              </span>
              <p>
                Untuk dosen. Untuk mahasiswa.
                <br />
                <strong>Dibangun untuk belajar bersama.</strong>
              </p>
            </div>
          </div>
          <div className="hero-world">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-spark spark-one">✦</div>
            <div className="hero-spark spark-two">✳</div>
            <span className="hero-hello">
              Hai, aku Dex! <span>↘</span>
            </span>
            <DexMascot />
            <div className="world-card world-card-task">
              <FeatureIcon name="task" tone="peach" />
              <div>
                <strong>Tugas terkumpul!</strong>
                <span>Satu langkah lebih dekat.</span>
              </div>
              <span className="little-check">
                <Check size={14} />
              </span>
            </div>
            <div className="world-card world-card-grade">
              <span className="grade-orb">
                <Check size={22} />
              </span>
              <div>
                <strong>Umpan balik, lebih berarti.</strong>
                <span>Dengan keputusan dosen.</span>
              </div>
            </div>
            <div className="hero-ground">
              <span />
              <span />
              <span />
            </div>
            <span className="hero-example">Ilustrasi alur belajar</span>
          </div>
          <a href="#fitur" className="scroll-cue">
            <ArrowDown size={15} /> Ada banyak yang bisa kamu lakukan
          </a>
        </section>
        <section className="motion-value-strip" aria-label="Prinsip Dexa">
          <span>
            <FeatureIcon name="class" />
            Kelas tertata
          </span>
          <span>
            <FeatureIcon name="review" tone="lime" />
            Koreksi terbantu
          </span>
          <span>
            <FeatureIcon name="shield" tone="lilac" />
            Dosen tetap memutuskan
          </span>
        </section>
        <section id="fitur" className="motion-section features-section">
          <div className="section-intro" data-reveal>
            <span className="motion-eyebrow">BUKAN CUMA DASHBOARD</span>
            <h2>
              Semua teman kerja kelas.
              <br />
              <span>Dalam satu tempat.</span>
            </h2>
            <p>
              Dari tugas pertama sampai umpan balik terakhir.
              <br />
              Pilih fitur untuk mengenal ruang kerjanya.
            </p>
          </div>
          <div className="motion-feature-grid">
            {features.map((f, i) => (
              <a
                key={f.name}
                href={`/login?callbackUrl=${encodeURIComponent(f.href)}${f.name === "copilot" ? "&role=MAHASISWA" : ""}`}
                className={`motion-feature-card feature-card-${f.tone}`}
                data-reveal
                style={{ "--reveal-delay": `${(i % 3) * 70}ms` } as React.CSSProperties}
              >
                <FeatureIcon name={f.name} tone={f.tone} />
                <span className="feature-tag">{f.tag}</span>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
                <span className="feature-link">
                  Jelajahi fitur <ArrowRight size={17} />
                </span>
              </a>
            ))}
          </div>
        </section>
        <section id="cara-kerja" className="motion-section tour-section">
          <div className="tour-visual" data-reveal>
            <span className="tour-window-label">
              <span />
              <span />
              <span /> RUANG MENGAJAR
            </span>
            <div className="tour-step-card" key={step}>
              <FeatureIcon
                name={tour[step]?.icon || "class"}
                tone={step === 1 ? "peach" : step === 2 ? "lime" : "blue"}
              />
              <small>LANGKAH 0{step + 1}</small>
              <h3>{tour[step]?.label}</h3>
              <div className="tour-sheet">
                <span />
                <span />
                <span />
              </div>
              <span className="tour-complete">
                <Check size={16} />{" "}
                {step === 0
                  ? "Kelas siap dimulai"
                  : step === 1
                    ? "Draft siap ditinjau"
                    : "Siap dilihat mahasiswa"}
              </span>
            </div>
            <div
              className="tour-progress"
              role="progressbar"
              aria-label="Langkah alur penilaian"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={3}
            >
              {tour.map((t, i) => (
                <span key={t.label} className={i <= step ? "is-done" : ""} />
              ))}
            </div>
          </div>
          <div className="tour-content" data-reveal>
            <span className="motion-eyebrow">SELANGKAH DEMI SELANGKAH</span>
            <h2>
              Sederhana di depan.
              <br />
              Bermakna di belakang.
            </h2>
            <div className="tour-steps">
              {tour.map((t, i) => (
                <button
                  type="button"
                  key={t.title}
                  className={i === step ? "is-active" : ""}
                  aria-pressed={i === step}
                  onClick={() => setStep(i)}
                >
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.text}</p>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="motion-section two-roles" data-reveal>
          <div className="roles-copy">
            <span className="motion-eyebrow">DUA PERAN. SATU TUJUAN.</span>
            <h2>
              Belajar itu
              <br />
              kerja <span>bersama.</span>
            </h2>
            <fieldset className="role-switch">
              <legend className="sr-only">Pilih peran</legend>
              {(["dosen", "mahasiswa"] as const).map((r) => (
                <button type="button" key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
                  {r === "dosen" ? "Saya dosen" : "Saya mahasiswa"}
                </button>
              ))}
            </fieldset>
            <p>
              {role === "dosen"
                ? "Siapkan kelas, tentukan rubrik, tinjau jawaban, lalu rilis nilai. Asisten AI membantu tanpa mengambil alih keputusan Anda."
                : "Tahu apa yang perlu dikerjakan, kapan dikumpulkan, dan bagian yang bisa diperbaiki. Ada Study Copilot untuk berdiskusi."}
            </p>
            <Link
              href={`/register?role=${role.toUpperCase()}`}
              className="bounce-button bounce-secondary"
            >
              Masuk ke ruang {role === "dosen" ? "mengajar" : "belajar"} <ArrowRight size={17} />
            </Link>
          </div>
          <div className={`role-illustration role-${role}`}>
            <DexMascot pose="wave" />
            <span className="role-note">
              <Sparkles size={18} />
              {role === "dosen"
                ? "Lebih banyak waktu untuk memahami."
                : "Satu pertanyaan bisa membuka banyak ide."}
            </span>
          </div>
        </section>
        <section id="demo" className="motion-section motion-demo-section">
          <div data-reveal>
            <span className="motion-eyebrow">GILIRAN ANDA MENCOBA</span>
            <h2>
              Saran AI.
              <br />
              <span>Sentuhan Anda.</span>
            </h2>
            <p>
              Skor rekomendasi bisa diubah. Umpan balik bisa diperbaiki. Coba tinjau dan rilis nilai
              di simulasi ini.
            </p>
            <div className="demo-promise">
              <FeatureIcon name="shield" tone="lime" />
              <span>
                AI membantu membaca.
                <br />
                <strong>Anda yang menentukan.</strong>
              </span>
            </div>
          </div>
          <DeferredDemo />
        </section>
        <section className="motion-final" data-reveal>
          <span className="final-doodle doodle-one">✳</span>
          <span className="final-doodle doodle-two">✦</span>
          <span className="motion-eyebrow">KELAS BERIKUTNYA, CERITA BARU.</span>
          <h2>
            Siap bikin kemajuan
            <br />
            kecil yang berarti?
          </h2>
          <Link href="/register" className="bounce-button bounce-lime">
            Yuk, mulai dari satu kelas <ArrowRight size={18} />
          </Link>
          <p>
            Sudah punya akun? <Link href="/login">Lanjutkan perjalananmu →</Link>
          </p>
        </section>
      </main>
      <footer className="motion-footer">
        <Link href="/" className="motion-brand">
          <strong>
            dexa<span>.</span>
          </strong>
        </Link>
        <p>Teknologi membantu. Pendidik memutuskan.</p>
        <span>© {new Date().getFullYear()} Dexa Assessment</span>
      </footer>
    </div>
  );
}
