import Link from "next/link";
<<<<<<< HEAD
import { useCallback, useEffect, useState } from "react";
=======
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
import {
  ArrowUpRight,
  ArrowRight,
<<<<<<< HEAD
  ShieldCheck,
  Check,
  Copy,
  FileText,
  Cpu,
  BarChart3,
  Sliders,
  CheckCircle2,
  Menu,
  X,
  User,
  GraduationCap,
  MousePointer2,
} from "lucide-react";
import "./landing.css";

/* ─── DeXa Brand Logo Component (Exact Authentic Image from User) ─── */

export function DexaLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/dexa-logo.png"
      alt="Dexa Assessment Logo"
      width={size}
      height={size}
      className={`rounded-xl object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/* ─── Rubric Mock Data ─── */

const RUBRIC = [
  { name: "Keamanan Query", weight: 40, score: 40 },
  { name: "Penanganan Error", weight: 30, score: 15 },
  { name: "Struktur Kode", weight: 20, score: 20 },
  { name: "Dokumentasi", weight: 10, score: 10 },
];

const AI_SCORE = 85;
const AI_FEEDBACK =
  "Implementasi prepared statement sudah aman dari SQL Injection (poin penuh). Penanganan error masih bersifat umum (-15 poin).";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#hitl", label: "Human-in-the-Loop" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#fitur", label: "Fitur" },
  { href: "#demo-section", label: "Demo" },
];

const STEPS = [
  {
    num: "01",
    title: "Desain Rubrik",
    desc: "Susun kriteria penilaian dan bobot nilai secara terstruktur sebagai acuan mutlak evaluasi.",
  },
  {
    num: "02",
    title: "Kumpul Berkas",
    desc: "Unggah dokumen jawaban mahasiswa (PDF, Word) maupun teks langsung dengan proses cepat.",
  },
  {
    num: "03",
    title: "Analisis Kognitif",
    desc: "AI menganalisis kesesuaian berkas dengan rubrik dan menghasilkan draft skor rekomendasi.",
  },
  {
    num: "04",
    title: "Validasi & Rilis",
    desc: "Tinjau draft AI, lakukan penyesuaian skor jika diperlukan, lalu sahkan nilai akhir secara resmi.",
  },
];

const FEATURES = [
  {
    icon: <Sliders size={22} />,
    title: "Desain Rubrik Dinamis",
    desc: "Penyusunan kriteria penilaian berbobot interaktif dengan kalkulasi akumulasi otomatis tepat 100%.",
  },
  {
    icon: <Cpu size={22} />,
    title: "Analisis Kognitif AI",
    desc: "Ekstraksi teks cerdas dan analisis mendalam berbasis LLM terhadap setiap butir kriteria penugasan.",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Validasi & Otoritas Penuh",
    desc: "Prinsip Human-in-the-Loop memastikan keputusan akhir, revisi narasi, dan skor selalu di bawah kendali Anda.",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Analitik & Transparansi",
    desc: "Pantau performa kelas dan berikan catatan umpan balik yang konstruktif dan terarah bagi mahasiswa.",
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<"dosen" | "mhs" | null>(null);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [isScrolled, setIsScrolled] = useState(false);

  // Interactive review panel states
  const [isEditing, setIsEditing] = useState(false);
  const [score, setScore] = useState(AI_SCORE);
  const [isReleased, setIsReleased] = useState(false);

  // 1. Initial mount / page refresh scroll restoration
  useEffect(() => {
    // Disable automatic browser scroll restoration that might reset or conflict with hash
    const prevRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const resetRestoration = () => {
      window.history.scrollRestoration = prevRestoration;
    };

    const rawTarget =
      window.location.hash ||
      (typeof window !== "undefined" ? sessionStorage.getItem("dexa_active_section") : null);

    if (rawTarget && rawTarget !== "#home" && rawTarget !== "#") {
      const cleanId = rawTarget.replace("#", "");
      setActiveSection(cleanId);

      const restoreScroll = () => {
        const el = document.getElementById(cleanId);
        if (el) {
          el.scrollIntoView({ behavior: "instant" as ScrollBehavior });
          return true;
        }
        return false;
      };

      // Attempt immediately
      restoreScroll();

      // Retry once layout has settled
      const raf = requestAnimationFrame(() => {
        restoreScroll();
      });
      const t1 = setTimeout(restoreScroll, 50);
      const t2 = setTimeout(restoreScroll, 150);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        resetRestoration();
      };
    }
    return resetRestoration;
  }, []);

  // 2. Active section detection & scroll position persistence (ScrollSpy)
  useEffect(() => {
    const sectionIds = ["home", "hitl", "cara-kerja", "fitur", "demo-section"];
    let ticking = false;
    let rafId = 0;
    let lastSection: string | null = null;
    let disposed = false;

    const checkScrollState = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    const updateActiveSection = () => {
      ticking = false;
      // Never touch history once the user has left the landing route
      if (disposed || window.location.pathname !== "/") return;

      const windowHeight = window.innerHeight;
      const navOffset = 90;

      let current = "home";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // If element top is within reasonable view range and bottom is below navbar
        if (rect.top <= windowHeight * 0.45 && rect.bottom > navOffset) {
          current = id;
        }
      }

      if (current === lastSection) return;
      lastSection = current;

      // Side effects run outside of React's state updater (no setState-in-render)
      const hash = current === "home" ? "" : `#${current}`;
      try {
        if (current !== "home") {
          sessionStorage.setItem("dexa_active_section", `#${current}`);
        } else {
          sessionStorage.removeItem("dexa_active_section");
        }

        const currentHash = window.location.hash;
        if ((hash && currentHash !== hash) || (!hash && currentHash)) {
          window.history.replaceState(window.history.state, "", hash || window.location.pathname);
        }
      } catch {}

      setActiveSection(current);
    };

    const handleScroll = () => {
      checkScrollState();
      if (!ticking) {
        rafId = window.requestAnimationFrame(updateActiveSection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    checkScrollState();
    updateActiveSection();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Navigation smooth scroll handler
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "#home") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      try {
        sessionStorage.removeItem("dexa_active_section");
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {}
      setActiveSection("home");
      setMenuOpen(false);
      return;
    }
    if (href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
        const sectionId = href.replace("#", "");
        setActiveSection(sectionId);
        try {
          sessionStorage.setItem("dexa_active_section", href);
          window.history.replaceState(window.history.state, "", href);
        } catch {}
        setMenuOpen(false);
      }
    }
  }, []);

  const scrollToTop = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      sessionStorage.removeItem("dexa_active_section");
      window.history.replaceState(window.history.state, "", window.location.pathname);
    } catch {}
    setActiveSection("home");
    setMenuOpen(false);
  }, []);

  // Scroll reveal observer for elements below
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    const elements = document.querySelectorAll(".lp-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const copyToClipboard = useCallback(async (text: string, who: "dosen" | "mhs") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(who);
      window.setTimeout(() => setCopied((c) => (c === who ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }, []);

  const delta = score - AI_SCORE;
  const deltaLabel =
    delta === 0 ? "Sama dengan rekomendasi AI" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} poin dari draft AI`;

  return (
    <div className="lp">
      {/* ─── NAVBAR ─── */}
      <header className={`lp-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="lp-container lp-nav__inner">
          <a href="#home" onClick={scrollToTop} className="lp-brand">
            <DexaLogo size={42} />
            <span className="lp-brand__name">Dexa Assessment</span>
          </a>

          <nav className="lp-nav__links" aria-label="Navigasi Utama">
            {NAV_LINKS.map((link) => {
              const linkId = link.href.replace("#", "");
              const isActive = activeSection === linkId;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`lp-nav__link ${isActive ? "is-active" : ""}`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="lp-nav__actions">
            <Link href="/login" className="lp-btn lp-btn--ghost lp-btn--sm lp-nav__login">
              Masuk
            </Link>
            <Link href="/register" className="lp-btn lp-btn--primary lp-btn--sm">
              Daftar Sekarang
            </Link>
            <button
              type="button"
              className="lp-nav__toggle"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
=======
  FileText,
  ListChecks,
  Check,
  BookOpen,
  GraduationCap,
} from "lucide-react";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-20 max-w-[1280px] items-center justify-between gap-4 px-6 lg:px-10">
          <Link href="/" aria-label="Dexa Assessment beranda" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              d.
            </span>
            <span className="dexa-wordmark">
              dexa<span className="text-primary">.</span>
            </span>
            <span className="hidden border-l pl-3 text-xs tracking-wide text-muted-foreground sm:block">
              ASSESSMENT
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-3 text-sm sm:gap-7">
            <a
              href="#alur"
              className="hidden text-muted-foreground hover:text-foreground md:inline"
            >
              Cara kerja
            </a>
            <a
              href="#peran"
              className="hidden text-muted-foreground hover:text-foreground md:inline"
            >
              Untuk siapa
            </a>
            <details className="relative md:hidden">
              <summary className="min-h-11 cursor-pointer py-3 text-sm">Menu</summary>
              <div className="absolute right-0 top-12 z-30 w-44 rounded-lg border bg-card p-2">
                <a href="#alur" className="block rounded-md px-3 py-3 hover:bg-muted">
                  Cara kerja
                </a>
                <a href="#peran" className="block rounded-md px-3 py-3 hover:bg-muted">
                  Untuk siapa
                </a>
              </div>
            </details>
            <Link href="/login" className="dexa-link">
              Masuk <ArrowUpRight size={15} />
            </Link>
          </nav>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
        </div>

        {menuOpen && (
          <div className="lp-mobile-menu">
            <nav>
              {NAV_LINKS.map((link) => {
                const linkId = link.href.replace("#", "");
                const isActive = activeSection === linkId;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={isActive ? "is-active" : ""}
                  >
                    {link.label}
                  </a>
                );
              })}
              <Link href="/login" className="lp-btn lp-btn--secondary" onClick={() => setMenuOpen(false)}>
                Masuk
              </Link>
              <Link href="/register" className="lp-btn lp-btn--primary" onClick={() => setMenuOpen(false)}>
                Daftar Sekarang
              </Link>
            </nav>
          </div>
        )}
      </header>
<<<<<<< HEAD

      <main>
        {/* ─── HERO SECTION ─── */}
        <section id="home" className="lp-hero">
          {/* Subtle Dot Grid Canvas (5-8% opacity) */}
          <div className="lp-hero__bg-grid" aria-hidden="true" />

          {/* Ambient Multi-Layered Emerald Kinetic Atmosphere */}
          <div className="lp-hero-ambient" aria-hidden="true">
            {/* Base persistent soft emerald glow (always visible, anchor atmosphere) */}
            <div className="lp-ambient-base" />

            {/* Core expanding/contracting soft emerald aura */}
            <div className="lp-ambient-core" />

            {/* Soft breathing halo ring */}
            <div className="lp-ambient-ring" />

            {/* Organic drifting soft translucent green ambient shapes */}
            <div className="lp-ambient-blob lp-blob--1" />
            <div className="lp-ambient-blob lp-blob--2" />
            <div className="lp-ambient-blob lp-blob--3" />
            <div className="lp-ambient-blob lp-blob--4" />
            <div className="lp-ambient-blob lp-blob--5" />

            {/* Subtle floating ambient light particles around edges */}
            <div className="lp-ambient-particle lp-particle--1" />
            <div className="lp-ambient-particle lp-particle--2" />
            <div className="lp-ambient-particle lp-particle--3" />
            <div className="lp-ambient-particle lp-particle--4" />
            <div className="lp-ambient-particle lp-particle--5" />
            <div className="lp-ambient-particle lp-particle--6" />
            <div className="lp-ambient-particle lp-particle--7" />
          </div>

          {/* Understated Micro Accents (Linear / Vercel Aesthetic) */}
          <div className="lp-hero-accents" aria-hidden="true">
            {/* Left Crosshairs & Arc */}
            <span className="lp-crosshair" style={{ top: "40%", left: "12%" }}>
              +
            </span>
            <span className="lp-crosshair" style={{ top: "58%", left: "19%" }}>
              +
            </span>
            <svg
              className="lp-accent-arc"
              style={{ top: "62%", left: "15%", width: 68, height: 42 }}
              viewBox="0 0 68 42"
              fill="none"
            >
              <path
                d="M 6 36 C 24 36, 50 26, 56 6"
                stroke="rgba(148, 163, 184, 0.45)"
                strokeWidth="1"
                strokeDasharray="2.5 3"
              />
            </svg>

            {/* Right Crosshair & Dot */}
            <span className="lp-crosshair" style={{ top: "25%", right: "12%" }}>
              +
            </span>
            <span className="lp-accent-dot" style={{ top: "25.6%", right: "9.6%" }} />

            {/* Right Delicate Dashed Schematic Connector Line */}
            <svg
              className="lp-accent-connector"
              viewBox="0 0 150 260"
              fill="none"
              style={{ top: "30%", right: "3.5%", width: 140, height: 260 }}
            >
              <path
                d="M 120 0 V 75 Q 120 95 100 95 H 45 Q 25 95 25 115 V 185 Q 25 205 45 205 H 125"
                stroke="rgba(148, 163, 184, 0.45)"
                strokeWidth="1"
                strokeDasharray="3 3.5"
              />
            </svg>
          </div>

          <div className="lp-container lp-hero__content">
            {/* 1. Top Pill Badge */}
            <div className="lp-hero-pill lp-hero-animate">
              <span className="lp-hero-pill__sparkle">✨</span>
              <span>AI Assessment Copilot</span>
            </div>

            {/* 2. Main Headline */}
            <h1 className="lp-h1 lp-hero-animate">
              Koreksi Tugas Lebih Cepat <br />
              <span className="lp-h1__tone">dengan Bantuan AI.</span>
            </h1>

            {/* 3. Sub-headline */}
            <p className="lp-lead lp-hero-animate-d1">
              Platform manajemen tugas &amp; evaluasi akademik cerdas yang membantu menganalisis jawaban mahasiswa
              secara objektif via arsitektur <strong>Human-in-the-Loop</strong>.
            </p>

            {/* 4. CTAs */}
            <div className="lp-hero__ctas lp-hero-animate-d2">
              <Link href="#demo-section" className="lp-btn lp-btn--dark">
                Daftar Sekarang
                <span className="lp-btn__arrow">→</span>
              </Link>
              <a href="#cara-kerja" className="lp-btn lp-btn--outline">
                Lihat Cara Kerja
              </a>
            </div>

            {/* 5. UI Preview - Anchored at the bottom with subtle multi-layered ambient shadow, partially clipped */}
            <div className="lp-hero-workspace-wrapper lp-hero-animate-d3">
              <div className="lp-hero-workspace">
                <div className="lp-ws-topbar">
                  <div className="lp-ws-dots">
                    <div className="lp-ws-dot" />
                    <div className="lp-ws-dot" />
                    <div className="lp-ws-dot" />
                  </div>
                  <div className="lp-ws-title">
                    <FileText size={15} className="text-[#03633e]" />
                    <span>Studio Penilaian · Tugas Basis Data</span>
                  </div>
                  <span className="lp-chip lp-chip--wait">Menunggu Validasi</span>
                </div>

                <div className="lp-ws-content">
                  {/* Left Pane: Student Submission */}
                  <div className="lp-ws-pane lp-ws-pane--left">
                    <div className="lp-ws-pane-head">
                      <span>Lembar Jawaban Mahasiswa</span>
                      <span className="lp-ws-pane-sub">Format Dokumen</span>
                    </div>

                    <div className="lp-doc-card">
                      <div className="lp-doc-icon-wrap">
                        <FileText size={22} style={{ color: "var(--lp-brand)" }} />
                        <span className="lp-ripple-pulse" title="Status Ekstraksi Aktif" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="lp-doc-name">jawaban_mahasiswa.pdf</div>
                        <div className="lp-doc-meta">
                          <span className="lp-dot-online" />
                          Teks berhasil diekstrak otomatis
                        </div>
                      </div>
                    </div>

                    <div className="lp-doc-snippet">
                      <p style={{ fontWeight: 650, color: "var(--lp-ink)", marginBottom: 8 }}>Implementasi Fungsi Login</p>
                      <p>
                        Query otentikasi menggunakan prepared statement sehingga input pengguna dipisahkan secara ketat
                        dari struktur query database:
                      </p>
                      <div className="lp-code-preview">
                        {"$stmt = $pdo->prepare('SELECT id, password FROM users WHERE email = ?');\n$stmt->execute([$email]);"}
                      </div>
                    </div>
                  </div>

                  {/* Right Pane: AI Evaluation Draft */}
                  <div className="lp-ws-pane lp-ws-pane--right">
                    <div className="lp-ws-pane-head">
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Sparkles size={15} style={{ color: "var(--lp-brand)" }} />
                        <span>Draft Rekomendasi AI</span>
                      </div>
                      <span className="lp-chip lp-chip--draft">Draft AI</span>
                    </div>

                    {/* Rubric List */}
                    <div className="lp-rubric-list">
                      {RUBRIC.map((item, idx) => (
                        <div
                          key={item.name}
                          className={`lp-rubric-item ${idx === 0 ? "lp-rubric-item--active" : ""}`}
                        >
                          <div className="lp-rubric-header">
                            <div className="lp-rubric-label-wrap">
                              {idx === 0 && (
                                <span className="lp-rubric-check-pulse">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                              )}
                              <span>{item.name} ({item.weight}%)</span>
                            </div>
                            <span style={{ fontWeight: 700 }}>{item.score}/{item.weight}</span>
                          </div>
                          <div className="lp-rubric-bar">
                            <div
                              className="lp-rubric-fill"
                              style={{ width: `${(item.score / item.weight) * 100}%` }}
                            />
                          </div>

                          {/* Subtle Interaction Cue: Mouse Cursor hover state & faint pulsing ripple */}
                          {idx === 0 && (
                            <div className="lp-ws-cursor-cue" title="Hover Review Penilai">
                              <span className="lp-ws-cursor-ripple" />
                              <MousePointer2 size={15} className="lp-ws-cursor-arrow" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="lp-score-summary">
                      <span style={{ fontSize: 13.5, color: "var(--lp-muted)", fontWeight: 600 }}>
                        Skor Rekomendasi
                      </span>
                      <span className="lp-score-val">
                        {AI_SCORE}<small>/100</small>
                      </span>
                    </div>

                    <div className="lp-feedback-box">
                      {AI_FEEDBACK}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle section transition divider */}
        <div className="lp-section-divider" aria-hidden="true" />

        {/* ─── HUMAN-IN-THE-LOOP SECTION ─── */}
        <section id="hitl" className="lp-section lp-hitl-section">
          {/* Subtle ambient glow behind validation workspace */}
          <div className="lp-hitl-ambient" aria-hidden="true" />
          <span id="tentang" className="sr-only" aria-hidden="true" />
          <div className="lp-container">
            <div className="lp-hitl-grid">
              <div className="lp-reveal lp-reveal--left">
                <span className="lp-runner">Filosofi Sistem</span>
                <h2 className="lp-h2">
                  Pemberdayaan, <br />
                  <span className="lp-h1__tone">Bukan Penggantian.</span>
                </h2>
                <p className="lp-subtext">
                  Dexa Assessment dirancang dengan prinsip <strong>Human-in-the-Loop</strong>. AI bekerja membaca,
                  mengekstrak dokumen, dan menganalisis kecocokan jawaban dengan rubrik, namun keputusan akhir,
                  empati, dan validasi nilai tetap 100% di tangan Anda.
                </p>

                <ul className="lp-check-list">
                  <li className="lp-check-item">
                    <span className="lp-check-icon"><Check size={13} strokeWidth={3} /></span>
                    Menghindari bias penilaian otomatis (Zero AI-Slop)
                  </li>
                  <li className="lp-check-item">
                    <span className="lp-check-icon"><Check size={13} strokeWidth={3} /></span>
                    Transparansi dasar penilaian per kriteria rubrik
                  </li>
                  <li className="lp-check-item">
                    <span className="lp-check-icon"><Check size={13} strokeWidth={3} /></span>
                    Kontrol manual penuh terhadap skor dan umpan balik
                  </li>
                </ul>

                <Link href="#demo-section" className="lp-btn lp-btn--primary">
                  Coba Interaksi Sandbox
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Interactive Validation Card */}
              <div className="lp-reveal lp-reveal--right lp-delay-1">
                <div className="lp-review-card">
                  <div className="lp-review-head">
                    <div>
                      <div className="lp-review-title">Lembar Jawaban Mahasiswa</div>
                      <div style={{ fontSize: 12, color: "var(--lp-muted)", marginTop: 2 }}>
                        Tugas 01 - Basis Data
                      </div>
                    </div>
                    <span className={`lp-chip ${isReleased ? "lp-chip--final" : "lp-chip--wait"}`}>
                      {isReleased ? "Nilai Resmi Dirilis" : "Menunggu Validasi"}
                    </span>
                  </div>

                  <div className="lp-review-score-area">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lp-muted)" }}>
                        Nilai Hasil Validasi
                      </div>
                      <div style={{ fontSize: 12, color: "var(--lp-muted)", marginTop: 2 }}>
                        {deltaLabel}
                      </div>
                    </div>
                    <div className="lp-review-score-num">
                      {score}<small>/100</small>
                    </div>
                  </div>

                  <div className="lp-feedback-box">
                    {AI_FEEDBACK}
                  </div>

                  {/* Manual Adjustment Slider */}
                  {isEditing && (
                    <div className="lp-slider-box">
                      <div className="lp-slider-top">
                        <span>Sesuaikan Nilai Manual</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{score} / 100</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={score}
                        onChange={(e) => {
                          setScore(Number(e.target.value));
                          setIsReleased(false);
                        }}
                        className="lp-slider-input"
                      />
                      <div className="lp-slider-delta">
                        Geser untuk menyesuaikan skor sesuai kebijakan penilai.
                      </div>
                    </div>
                  )}

                  <div className="lp-review-actions">
                    <button
                      type="button"
                      className="lp-btn lp-btn--secondary"
                      onClick={() => {
                        setIsEditing((v) => !v);
                        setIsReleased(false);
                      }}
                    >
                      <Sliders size={15} />
                      {isEditing ? "Tutup Slider" : "Edit Manual"}
                    </button>
                    <button
                      type="button"
                      className="lp-btn lp-btn--primary"
                      disabled={isReleased}
                      onClick={() => {
                        setIsReleased(true);
                        setIsEditing(false);
                      }}
                    >
                      {isReleased ? (
                        <>
                          <CheckCircle2 size={16} />
                          Nilai Disahkan
                        </>
                      ) : (
                        "Setujui & Rilis Nilai"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CARA KERJA (HOW IT WORKS / ALUR PRAKTIS) ─── */}
        <section id="cara-kerja" className="lp-section lp-workflow-section">
          {/* Ambient Drifting Emerald Glow in Background */}
          <div className="lp-workflow-glow" aria-hidden="true" />

          {/* Ultra-faint dot grid with micro '+' crosshairs */}
          <div className="lp-workflow-bg-grid" aria-hidden="true" />
          <div className="lp-workflow-accents" aria-hidden="true">
            <span className="lp-crosshair" style={{ top: "18%", left: "10%" }}>+</span>
            <span className="lp-crosshair" style={{ top: "45%", right: "8%" }}>+</span>
            <span className="lp-crosshair" style={{ bottom: "16%", left: "8%" }}>+</span>
          </div>

          <div className="lp-container">
            <div className="lp-section-head lp-reveal lp-reveal--up">
              <span className="lp-runner">• ALUR PRAKTIS</span>
              <h2 className="lp-h2">Bagaimana Sistem Bekerja</h2>
              <p className="lp-subtext">
                Empat langkah sederhana dari penyusunan kriteria hingga publikasi nilai resmi.
              </p>
            </div>

            <div className="lp-workflow-wrapper">
              {/* Natural 2D Dashed Trail with Live Kinetic Motion Particles (01 -> 02 -> 03 -> 04) */}
              <svg
                className="lp-workflow-svg-trail"
                viewBox="0 0 980 640"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <filter id="glow-particle" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 01 -> 02: Straight & Level from Step 01 right to Step 02 left */}
                <path
                  id="trail-seg-1"
                  d="M 462 150 L 518 150"
                  className="lp-trail-path"
                />
                <circle cx="462" cy="150" r="5" className="lp-trail-node" />
                <circle cx="518" cy="150" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 01 -> 02 */}
                <circle r="4" fill="#10B981" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 462 150 L 518 150" />
                </circle>

                {/* 02 -> 03: Logical, Clean Stepped Channel from Step 02 down into Step 03 */}
                <path
                  id="trail-seg-2"
                  d="M 518 230 H 496 Q 490 230 490 242 V 310 Q 490 322 484 322 H 462"
                  className="lp-trail-path"
                />
                <circle cx="518" cy="230" r="5" className="lp-trail-node" />
                <circle cx="462" cy="322" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 02 -> 03 */}
                <circle r="4" fill="#10B981" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion
                    dur="3.2s"
                    repeatCount="indefinite"
                    path="M 518 230 H 496 Q 490 230 490 242 V 310 Q 490 322 484 322 H 462"
                  />
                </circle>

                {/* 03 -> 04: Straight & Level from Step 03 right across to Step 04 left */}
                <path
                  id="trail-seg-3"
                  d="M 462 405 L 518 405"
                  className="lp-trail-path"
                />
                <circle cx="462" cy="405" r="5" className="lp-trail-node" />
                <circle cx="518" cy="405" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 03 -> 04 */}
                <circle r="4" fill="#10B981" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 462 405 L 518 405" />
                </circle>
              </svg>

              {/* Staggered 2-Column Grid */}
              <div className="lp-workflow-columns">
                {/* Column 1: Step 01 & Step 03 */}
                <div className="lp-workflow-col lp-workflow-col--left">
                  {/* Step 01 */}
                  <div className="lp-wf-card lp-reveal lp-reveal--scale lp-delay-1">
                    <span className="lp-wf-num">01</span>
                    <h3 className="lp-wf-title">Desain Rubrik</h3>
                    <p className="lp-wf-desc">
                      Susun kriteria penilaian dan bobot nilai secara terstruktur sebagai acuan mutlak evaluasi.
                    </p>
                  </div>

                  {/* Step 03: Completely unified, clean 2D card with no arrows or icons */}
                  <div className="lp-wf-card lp-reveal lp-reveal--scale lp-delay-3">
                    <span className="lp-wf-num">03</span>
                    <h3 className="lp-wf-title">Analisis Kognitif</h3>
                    <p className="lp-wf-desc">
                      AI menganalisis kesesuaian berkas dengan rubrik dan menghasilkan draft skor rekomendasi.
                    </p>
                  </div>
                </div>

                {/* Column 2: Step 02 & Step 04 (Staggered Down) */}
                <div className="lp-workflow-col lp-workflow-col--right">
                  {/* Step 02 */}
                  <div className="lp-wf-card lp-reveal lp-reveal--scale lp-delay-2">
                    <span className="lp-wf-num">02</span>
                    <h3 className="lp-wf-title">Kumpul Berkas</h3>
                    <p className="lp-wf-desc">
                      Unggah dokumen jawaban mahasiswa (PDF, Word) maupun teks langsung dengan proses cepat.
                    </p>
                  </div>

                  {/* Step 04 */}
                  <div className="lp-wf-card lp-reveal lp-reveal--scale lp-delay-4">
                    <span className="lp-wf-num">04</span>
                    <h3 className="lp-wf-title">Validasi &amp; Rilis</h3>
                    <p className="lp-wf-desc">
                      Tinjau draft AI, lakukan penyesuaian skor jika diperlukan, lalu sahkan nilai akhir secara resmi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle section transition divider */}
        <div className="lp-section-divider" aria-hidden="true" />

        {/* ─── KEUNGGULAN (FEATURES) ─── */}
        <section id="fitur" className="lp-section lp-features-section">
          {/* Ambient soft glow */}
          <div className="lp-features-ambient" aria-hidden="true" />
          <div className="lp-container">
            <div className="lp-section-head lp-reveal lp-reveal--up">
              <span className="lp-runner">Keunggulan</span>
              <h2 className="lp-h2">Fitur Utama Platform</h2>
              <p className="lp-subtext">
                Dirancang untuk memberikan kemudahan manajemen tugas dengan akurasi penilaian tinggi.
              </p>
            </div>

            <div className="lp-features-grid">
              {FEATURES.map((feat, idx) => (
                <div
                  key={feat.title}
                  className={`lp-feature-card lp-reveal lp-reveal--scale lp-delay-${idx + 1}`}
                >
                  <div className="lp-feature-icon">{feat.icon}</div>
                  <h3 className="lp-feature-title">{feat.title}</h3>
                  <p className="lp-feature-desc">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle section transition divider */}
        <div className="lp-section-divider" aria-hidden="true" />

        {/* ─── SANDBOX DEMO SECTION ─── */}
        <section id="demo-section" className="lp-section lp-section--soft lp-demo-section">
          {/* Ambient soft glow */}
          <div className="lp-demo-ambient" aria-hidden="true" />
          <div className="lp-container">
            <div className="lp-section-head lp-reveal lp-reveal--up">
              <span className="lp-runner">Sandbox Demo</span>
              <h2 className="lp-h2">Siap Mencoba?</h2>
              <p className="lp-subtext">
                Gunakan kredensial sandbox instan berikut untuk menjelajahi platform langsung tanpa perlu registrasi.
              </p>
            </div>

            <div className="lp-demo-cards">
              {/* Dosen Card */}
              <div className="lp-demo-card lp-reveal lp-reveal--left lp-delay-1">
                <div className="lp-demo-card-head">
                  <div className="lp-demo-role">
                    <GraduationCap size={20} style={{ color: "var(--lp-brand)" }} />
                    <span>Akun Dosen</span>
                  </div>
                  <button
                    type="button"
                    className={`lp-copy-btn ${copied === "dosen" ? "is-copied" : ""}`}
                    onClick={() => copyToClipboard("dosen.demo@example.com", "dosen")}
                  >
                    {copied === "dosen" ? <Check size={13} /> : <Copy size={13} />}
                    {copied === "dosen" ? "Disalin" : "Salin Email"}
                  </button>
                </div>

                <div className="lp-cred-list">
                  <div className="lp-cred-row">
                    <span className="lp-cred-label">Email</span>
                    <span className="lp-cred-val">dosen.demo@example.com</span>
                  </div>
                  <div className="lp-cred-row">
                    <span className="lp-cred-label">Password</span>
                    <span className="lp-cred-val">dosen123</span>
                  </div>
                </div>

                <Link href="/login" className="lp-btn lp-btn--primary">
                  Masuk Sebagai Dosen
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Mahasiswa Card */}
              <div className="lp-demo-card lp-reveal lp-reveal--right lp-delay-2">
                <div className="lp-demo-card-head">
                  <div className="lp-demo-role">
                    <User size={20} style={{ color: "var(--lp-brand)" }} />
                    <span>Akun Mahasiswa</span>
                  </div>
                  <button
                    type="button"
                    className={`lp-copy-btn ${copied === "mhs" ? "is-copied" : ""}`}
                    onClick={() => copyToClipboard("mahasiswa.demo@example.com", "mhs")}
                  >
                    {copied === "mhs" ? <Check size={13} /> : <Copy size={13} />}
                    {copied === "mhs" ? "Disalin" : "Salin Email"}
                  </button>
                </div>

                <div className="lp-cred-list">
                  <div className="lp-cred-row">
                    <span className="lp-cred-label">Email</span>
                    <span className="lp-cred-val">mahasiswa.demo@example.com</span>
                  </div>
                  <div className="lp-cred-row">
                    <span className="lp-cred-label">Password</span>
                    <span className="lp-cred-val">mhs123</span>
                  </div>
                </div>

                <Link href="/login" className="lp-btn lp-btn--secondary">
                  Masuk Sebagai Mahasiswa
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <div>
            <div className="lp-brand">
              <DexaLogo size={32} />
              <span className="lp-brand__name">Dexa Assessment</span>
            </div>
            <div className="lp-footer__copy">
              Platform Penilaian Akademik Cerdas · © 2026. All rights reserved.
            </div>
          </div>

          <div className="lp-footer__links">
            <a href="#">Privasi</a>
            <a href="#">Syarat Ketentuan</a>
            <a href="#">Bantuan</a>
          </div>
=======
      <main id="main-content">
        <section className="mx-auto grid max-w-[1280px] gap-12 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10 lg:py-24">
          <div>
            <p className="dexa-eyebrow mb-7 text-primary">Ruang kerja penilaian akademik</p>
            <h1 className="max-w-xl text-[44px] font-semibold leading-[1.12] tracking-[-.055em] sm:text-[60px]">
              Lebih fokus pada
              <br className="hidden sm:block" /> proses belajar.
              <br />
              <span className="text-primary">
                Bukan tumpukan
                <br className="hidden sm:block" /> koreksi.
              </span>
            </h1>
            <p className="mt-7 max-w-[460px] text-base leading-7 text-muted-foreground">
              Kelola tugas, tinjau jawaban dengan bantuan AI, dan berikan feedback yang berarti.
              Keputusan nilai tetap ada di tangan dosen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=DOSEN" className="dexa-link dexa-link-primary">
                Mulai sebagai dosen <ArrowRight size={17} />
              </Link>
              <Link href="/login?role=MAHASISWA" className="dexa-link">
                Masuk mahasiswa
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Check size={15} className="text-primary" />
              AI membantu meninjau. Dosen menentukan hasil.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks size={17} className="text-primary" />
                Meja koreksi
              </div>
              <span className="rounded border px-2 py-1 text-[11px] text-muted-foreground">
                Ilustrasi alur
              </span>
            </div>
            <div className="border-b bg-muted/50 px-6 py-5">
              <p className="dexa-eyebrow text-muted-foreground">Pemrograman web · Tugas 03</p>
              <h2 className="mt-2 text-lg font-semibold">Memahami validasi data</h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText size={15} />
                  01 / Jawaban mahasiswa
                </p>
                <p className="border-l-2 border-border pl-4 text-sm leading-6">
                  “Validasi dilakukan sebelum data disimpan, agar format dan kelengkapan input
                  sesuai aturan.”
                </p>
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">02 / Saran AI</span>
                  <span className="text-[11px] font-medium">Draf · perlu ditinjau</span>
                </div>
                <p className="mt-2 text-sm leading-6">
                  Konsep utama sudah disebutkan. Periksa apakah jawaban juga menjelaskan validasi di
                  sisi server.
                </p>
              </div>
              <div className="flex gap-3 border-t pt-5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">03 / Keputusan dosen</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Tinjau saran, sesuaikan feedback, lalu rilis nilai saat sudah siap.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-3 text-[11px] leading-5 text-muted-foreground">
              Contoh untuk menjelaskan alur, bukan hasil penilaian mahasiswa.
            </div>
          </div>
        </section>
        <section id="alur" className="border-y bg-card">
          <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-10">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="dexa-eyebrow mb-3 text-primary">Dari tugas hingga feedback</p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Satu alur. Kendali yang jelas.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Pekerjaan tersusun, saran dapat diperiksa, dan nilai akhir diputuskan manusia.
              </p>
            </div>
            <ol className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Siapkan tugas & acuan",
                  text: "Atur instruksi, rubrik, dan bahan penilaian sebelum memeriksa jawaban.",
                },
                {
                  title: "Tinjau jawaban & saran",
                  text: "Baca pekerjaan mahasiswa dan bandingkan saran AI dengan kriteria penilaian.",
                },
                {
                  title: "Berikan keputusan & feedback",
                  text: "Sesuaikan nilai dan umpan balik, lalu rilis hasil yang sudah Anda periksa.",
                },
              ].map((step, i) => (
                <li key={step.title} className="border-t pt-5">
                  <span className="font-mono text-sm text-primary">0{i + 1}</span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="peran"
          className="mx-auto grid max-w-[1280px] gap-10 px-6 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10"
        >
          <div>
            <p className="dexa-eyebrow mb-4 text-primary">Dua peran, satu ruang belajar</p>
            <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
              Jelas bagi penilai.
              <br />
              Bermakna bagi mahasiswa.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Bantuan AI tetap perlu diperiksa. Dexa menempatkan tinjauan dosen sebagai bagian dari
              proses penilaian.
            </p>
          </div>
          <div className="divide-y border-y">
            {[
              {
                role: "Dosen",
                icon: BookOpen,
                text: "Kelola kelas dan rubrik, periksa pengumpulan, lalu tetapkan nilai akhir.",
                href: "/register?role=DOSEN",
                cta: "Buat ruang kerja",
              },
              {
                role: "Mahasiswa",
                icon: GraduationCap,
                text: "Temukan tugas, kumpulkan jawaban, dan baca feedback yang sudah dirilis dosen.",
                href: "/register?role=MAHASISWA",
                cta: "Daftar mahasiswa",
              },
            ].map(({ role, icon: Icon, text, href, cta }) => (
              <article key={role} className="flex gap-5 py-7">
                <Icon size={22} className="mt-1 shrink-0 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">{role}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  <Link
                    href={href}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    {cta}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 px-6 py-7 text-xs text-muted-foreground sm:flex-row lg:px-10">
          <p>
            <strong className="font-semibold text-foreground">Dexa Assessment</strong> · Ruang kerja
            penilaian akademik
          </p>
          <a href="#main-content" className="hover:text-foreground">
            Kembali ke atas ↑
          </a>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
        </div>
      </footer>
    </div>
  );
}
