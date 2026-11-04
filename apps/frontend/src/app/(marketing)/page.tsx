"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  FileText,
  GraduationCap,
  Menu,
  MousePointer2,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./landing.css";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

const _STEPS = [
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
  const [isNavReady, setIsNavReady] = useState(false);

  // Interactive review panel states
  const [isEditing, setIsEditing] = useState(false);
  const [score, setScore] = useState(AI_SCORE);
  const [isReleased, setIsReleased] = useState(false);

  // Motion design refs & states
  const heroRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLElement>(null);

  // Navigation lock refs (Bug 3)
  const isNavigatingRef = useRef(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const hardTimeoutRef = useRef<number | null>(null);
  const scrollTickingRef = useRef(false);

  const [heroInView, setHeroInView] = useState(true);
  const [workflowInView, setWorkflowInView] = useState(true);
  const [mockupAnimated, setMockupAnimated] = useState(false);
  const [mockupScore, setMockupScore] = useState(0);
  const [wfProgress, setWfProgress] = useState(0);

  // ─── BUG 2: Reload & fresh visit always open at top with Home active ───
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {}
    window.scrollTo(0, 0);
  }, []);

  // Release navigation lock helper (Bug 3)
  const releaseNavLock = useCallback(() => {
    isNavigatingRef.current = false;
    if (scrollIdleTimerRef.current !== null) {
      clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = null;
    }
    if (hardTimeoutRef.current !== null) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }, []);

  // Interrupt navigation lock on manual user scroll (wheel, touch, keydown)
  useEffect(() => {
    const handleUserInterrupt = () => {
      if (isNavigatingRef.current) {
        releaseNavLock();
      }
    };

    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchstart", handleUserInterrupt, { passive: true });
    window.addEventListener("touchmove", handleUserInterrupt, { passive: true });
    window.addEventListener("keydown", handleUserInterrupt, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchstart", handleUserInterrupt);
      window.removeEventListener("touchmove", handleUserInterrupt);
      window.removeEventListener("keydown", handleUserInterrupt);
    };
  }, [releaseNavLock]);

  // ─── BUG 1: Real geometry indicator updater ───
  const updateIndicator = useCallback(() => {
    if (!navLinksRef.current || !indicatorRef.current) return;
    const activeEl = navLinksRef.current.querySelector<HTMLElement>(
      `[data-section="${activeSection}"]`,
    );
    if (activeEl) {
      const left = activeEl.offsetLeft;
      const width = activeEl.offsetWidth;
      indicatorRef.current.style.setProperty("--lp-indicator-x", `${left}px`);
      indicatorRef.current.style.setProperty("--lp-indicator-w", `${width}px`);
      indicatorRef.current.style.opacity = "1";
    } else {
      indicatorRef.current.style.opacity = "0";
    }
  }, [activeSection]);

  // Bug 1: On first paint, place indicator with no transition, enable on next frame
  useIsomorphicLayoutEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(() => {
      setIsNavReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, [updateIndicator]);

  // Bug 1: Re-measure after document.fonts.ready
  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        updateIndicator();
      });
    }
  }, [updateIndicator]);

  // Bug 1: Re-measure on window resize & nav container resize via ResizeObserver
  useEffect(() => {
    const navEl = navLinksRef.current;
    if (!navEl) return;

    const handleResize = () => {
      updateIndicator();
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(handleResize);
      ro.observe(navEl);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [updateIndicator]);

  // Bug 1: Re-measure when header changes height on scroll (82px to 68px)
  useEffect(() => {
    void isScrolled;
    updateIndicator();
    const t = setTimeout(updateIndicator, 360);
    return () => clearTimeout(t);
  }, [isScrolled, updateIndicator]);

  // ─── BUG 3: Nav click handler with lock & smooth scroll ───
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      const targetId = href.replace("#", "");
      if (!targetId) return;

      // Set active item immediately without flicker
      setActiveSection(targetId);
      setMenuOpen(false);

      // Engage navigation lock
      isNavigatingRef.current = true;
      if (scrollIdleTimerRef.current !== null) clearTimeout(scrollIdleTimerRef.current);
      if (hardTimeoutRef.current !== null) clearTimeout(hardTimeoutRef.current);

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";

      if (targetId === "home") {
        window.scrollTo({ top: 0, behavior });
      } else {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior, block: "start" });
        }
      }

      if (prefersReduced) {
        releaseNavLock();
        return;
      }

      // Hard timeout safety net
      hardTimeoutRef.current = window.setTimeout(releaseNavLock, 1200);

      // scrollend event listener
      const onScrollEnd = () => {
        releaseNavLock();
        window.removeEventListener("scrollend", onScrollEnd);
      };
      window.addEventListener("scrollend", onScrollEnd, { once: true });
    },
    [releaseNavLock],
  );

  const scrollToTop = useCallback(
    (e: React.MouseEvent) => {
      handleNavClick(e as unknown as React.MouseEvent<HTMLAnchorElement>, "#home");
    },
    [handleNavClick],
  );

  // ─── BUG 3: Tuned ScrollSpy IntersectionObserver & Scroll Tracking ───
  useEffect(() => {
    const sectionIds = ["home", "hitl", "cara-kerja", "fitur", "demo-section"];
    const headerLine = 80;

    const evaluateActiveSection = () => {
      if (isNavigatingRef.current) return;

      if (window.scrollY < 40) {
        setActiveSection("home");
        return;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
        setActiveSection("demo-section");
        return;
      }

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= headerLine && rect.bottom > headerLine) {
          setActiveSection(id);
          break;
        }
      }
    };

    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));

      if (isNavigatingRef.current) {
        if (scrollIdleTimerRef.current !== null) {
          clearTimeout(scrollIdleTimerRef.current);
        }
        scrollIdleTimerRef.current = window.setTimeout(releaseNavLock, 120);
        return;
      }

      if (!scrollTickingRef.current) {
        scrollTickingRef.current = true;
        requestAnimationFrame(() => {
          evaluateActiveSection();
          scrollTickingRef.current = false;
        });
      }
    };

    const observer = new IntersectionObserver(
      () => {
        evaluateActiveSection();
      },
      {
        rootMargin: "-80px 0px -50% 0px",
        threshold: 0,
      },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    evaluateActiveSection();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [releaseNavLock]);

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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const elements = document.querySelectorAll(".lp-reveal");
    elements.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Viewport Observer for Hero & Workflow to pause looping animations
  useEffect(() => {
    const heroEl = heroRef.current;
    const workflowEl = workflowRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === heroEl) {
            setHeroInView(entry.isIntersecting);
          } else if (entry.target === workflowEl) {
            setWorkflowInView(entry.isIntersecting);
          }
        }
      },
      { threshold: 0 },
    );

    if (heroEl) observer.observe(heroEl);
    if (workflowEl) observer.observe(workflowEl);

    return () => observer.disconnect();
  }, []);

  // Hero Ambient Parallax (Item 1: 0.15x scroll speed)
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    let rafId = 0;
    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          if (scrollY <= 1400) {
            heroEl.style.setProperty("--hero-parallax", `${scrollY * 0.15}px`);
          }
          rafId = 0;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Cursor-reactive dot grid (Item 2)
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const isFine = window.matchMedia("(pointer: fine)").matches;
    if (!isFine) return;

    let rafId = 0;
    let targetX = -999;
    let targetY = -999;

    const onMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 768) return;
      const rect = heroEl.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          heroEl.style.setProperty("--mx", `${targetX}px`);
          heroEl.style.setProperty("--my", `${targetY}px`);
          rafId = 0;
        });
      }
    };

    const onMouseLeave = () => {
      heroEl.style.setProperty("--mx", "-999px");
      heroEl.style.setProperty("--my", "-999px");
    };

    heroEl.addEventListener("mousemove", onMouseMove);
    heroEl.addEventListener("mouseleave", onMouseLeave);

    return () => {
      heroEl.removeEventListener("mousemove", onMouseMove);
      heroEl.removeEventListener("mouseleave", onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Hero Mockup entrance & score counter (Item 6: runs once)
  useEffect(() => {
    const mockupEl = mockupRef.current;
    if (!mockupEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMockupAnimated(true);
            observer.disconnect();

            // Count from 0 to 85 over 900ms
            const start = performance.now();
            const duration = 900;
            const target = 85;

            const frame = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - (1 - progress) ** 3;
              setMockupScore(Math.round(ease * target));
              if (progress < 1) {
                requestAnimationFrame(frame);
              }
            };
            requestAnimationFrame(frame);
            break;
          }
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(mockupEl);
    return () => observer.disconnect();
  }, []);

  // Workflow scroll progress (Item 8)
  useEffect(() => {
    const wfEl = workflowRef.current;
    if (!wfEl) return;

    let rafId = 0;
    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const rect = wfEl.getBoundingClientRect();
          const winH = window.innerHeight;
          const progress = Math.min(Math.max((winH * 0.75 - rect.top) / (rect.height * 0.7), 0), 1);
          setWfProgress(progress);
          rafId = 0;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const seg1Progress = Math.min(Math.max((wfProgress - 0.05) / 0.25, 0), 1);
  const seg2Progress = Math.min(Math.max((wfProgress - 0.3) / 0.35, 0), 1);
  const seg3Progress = Math.min(Math.max((wfProgress - 0.65) / 0.25, 0), 1);

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
    delta === 0
      ? "Sama dengan rekomendasi AI"
      : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} poin dari draft AI`;

  return (
    <div className="lp">
      {/* ─── NAVBAR ─── */}
      <header className={`lp-nav ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="lp-container lp-nav__inner">
          <Link href="#home" onClick={scrollToTop} className="lp-brand">
            <DexaLogo size={42} />
            <span className="lp-brand__name">Dexa Assessment</span>
          </Link>

          <nav className="lp-nav__links" ref={navLinksRef} aria-label="Navigasi Utama">
            <span
              ref={indicatorRef}
              className={`lp-nav__indicator ${isNavReady ? "is-ready" : ""}`}
              aria-hidden="true"
            />
            {NAV_LINKS.map((link) => {
              const linkId = link.href.replace("#", "");
              const isActive = activeSection === linkId;
              return (
                <a
                  key={link.href}
                  data-section={linkId}
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
              <Link
                href="/login"
                className="lp-btn lp-btn--secondary"
                onClick={() => setMenuOpen(false)}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="lp-btn lp-btn--primary"
                onClick={() => setMenuOpen(false)}
              >
                Daftar Sekarang
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ─── HERO SECTION ─── */}
        <section id="home" ref={heroRef} className={`lp-hero ${heroInView ? "" : "is-paused"}`}>
          {/* Subtle Dot Grid Canvas (5-8% opacity) */}
          <div className="lp-hero__bg-grid" aria-hidden="true" />

          {/* Cursor-Reactive Emerald Dot Grid (Item 2) */}
          <div className="lp-hero__cursor-grid" aria-hidden="true" />

          {/* Ambient Two Drifting Emerald Blobs with Scroll Parallax (Item 1) */}
          <div className="lp-hero-ambient" aria-hidden="true">
            <div className="lp-ambient-blob lp-ambient-blob--1" />
            <div className="lp-ambient-blob lp-ambient-blob--2" />
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
              aria-hidden="true"
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
              aria-hidden="true"
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
            {/* 1. Top Pill Badge (Item 4: 8px pulsing dot, emoji removed) */}
            <div className="lp-hero-pill lp-hero-animate">
              <span className="lp-hero-pill__status" aria-hidden="true">
                <span className="lp-hero-pill__dot" />
                <span className="lp-hero-pill__ring" />
              </span>
              <span>AI Assessment Copilot</span>
            </div>

            {/* 2. Main Headline (Item 3: Word-by-word clip entrance with green underline on Cepat) */}
            <h1 className="lp-h1">
              <span className="lp-h1__line">
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "0ms" }}>
                    Koreksi
                  </span>
                </span>{" "}
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "70ms" }}>
                    Tugas
                  </span>
                </span>{" "}
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "140ms" }}>
                    Lebih
                  </span>
                </span>{" "}
                <span className="lp-word-clip lp-word-clip--target">
                  <span className="lp-word" style={{ animationDelay: "210ms" }}>
                    Cepat
                  </span>
                  <span className="lp-word-underline" aria-hidden="true" />
                </span>
              </span>
              <br />
              <span className="lp-h1__line lp-h1__tone">
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "280ms" }}>
                    dengan
                  </span>
                </span>{" "}
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "350ms" }}>
                    Bantuan
                  </span>
                </span>{" "}
                <span className="lp-word-clip">
                  <span className="lp-word" style={{ animationDelay: "420ms" }}>
                    AI.
                  </span>
                </span>
              </span>
            </h1>

            {/* 3. Sub-headline */}
            <p className="lp-lead lp-hero-animate-d1">
              Platform manajemen tugas &amp; evaluasi akademik cerdas yang membantu menganalisis
              jawaban mahasiswa secara objektif via arsitektur <strong>Human-in-the-Loop</strong>.
            </p>

            {/* 4. CTAs (Item 5) */}
            <div className="lp-hero__ctas lp-hero-animate-d2">
              <Link href="/register" className="lp-btn lp-btn--dark">
                <span className="lp-btn__sheen" aria-hidden="true" />
                <span>Daftar Sekarang</span>
                <span className="lp-btn__arrow">→</span>
              </Link>
              <a href="#cara-kerja" className="lp-btn lp-btn--outline">
                Lihat Cara Kerja
              </a>
            </div>

            {/* 5. UI Preview (Item 6: entrance, sequence bar fill, tabular counter) */}
            <div className="lp-hero-workspace-wrapper lp-hero-animate-d3">
              <div
                ref={mockupRef}
                className={`lp-hero-workspace ${mockupAnimated ? "is-animated" : ""}`}
              >
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
                  <span className="lp-chip lp-chip--wait">
                    <span className="lp-chip__yellow-dot" aria-hidden="true" />
                    Menunggu Validasi
                  </span>
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
                      <p style={{ fontWeight: 650, color: "var(--lp-ink)", marginBottom: 8 }}>
                        Implementasi Fungsi Login
                      </p>
                      <p>
                        Query otentikasi menggunakan prepared statement sehingga input pengguna
                        dipisahkan secara ketat dari struktur query database:
                      </p>
                      <div className="lp-code-preview">
                        {
                          "$stmt = $pdo->prepare('SELECT id, password FROM users WHERE email = ?');\n$stmt->execute([$email]);"
                        }
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
                              <span>
                                {item.name} ({item.weight}%)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700 }}>
                              {item.score}/{item.weight}
                            </span>
                          </div>
                          <div className="lp-rubric-bar">
                            <div
                              className="lp-rubric-fill"
                              style={
                                {
                                  "--target-scale": item.score / item.weight,
                                } as React.CSSProperties
                              }
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
                      <span className="lp-score-val lp-tnum">
                        {mockupScore}
                        <small>/100</small>
                      </span>
                    </div>

                    <div className="lp-feedback-box">{AI_FEEDBACK}</div>
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
              <div className="lp-reveal lp-stagger-1">
                <span className="lp-runner">Filosofi Sistem</span>
                <h2 className="lp-h2">
                  Pemberdayaan, <br />
                  <span className="lp-h1__tone">Bukan Penggantian.</span>
                </h2>
                <p className="lp-subtext">
                  Dexa Assessment dirancang dengan prinsip <strong>Human-in-the-Loop</strong>. AI
                  bekerja membaca, mengekstrak dokumen, dan menganalisis kecocokan jawaban dengan
                  rubrik, namun keputusan akhir, empati, dan validasi nilai tetap 100% di tangan
                  Anda.
                </p>

                <ul className="lp-check-list">
                  <li className="lp-check-item">
                    <span className="lp-check-icon">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    Menghindari bias penilaian otomatis (Zero AI-Slop)
                  </li>
                  <li className="lp-check-item">
                    <span className="lp-check-icon">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    Transparansi dasar penilaian per kriteria rubrik
                  </li>
                  <li className="lp-check-item">
                    <span className="lp-check-icon">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    Kontrol manual penuh terhadap skor dan umpan balik
                  </li>
                </ul>

                <Link href="#demo-section" className="lp-btn lp-btn--primary">
                  Coba Interaksi Sandbox
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Interactive Validation Card */}
              <div className="lp-reveal lp-stagger-2">
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
                      {score}
                      <small>/100</small>
                    </div>
                  </div>

                  <div className="lp-feedback-box">{AI_FEEDBACK}</div>

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

        {/* ─── CARA KERJA (HOW IT WORKS / ALUR PRAKTIS) (Item 8) ─── */}
        <section
          id="cara-kerja"
          ref={workflowRef}
          className={`lp-section lp-workflow-section ${workflowInView ? "" : "is-paused"}`}
        >
          {/* Ambient Drifting Emerald Glow in Background */}
          <div className="lp-workflow-glow" aria-hidden="true" />

          {/* Ultra-faint dot grid with micro '+' crosshairs */}
          <div className="lp-workflow-bg-grid" aria-hidden="true" />
          <div className="lp-workflow-accents" aria-hidden="true">
            <span className="lp-crosshair" style={{ top: "18%", left: "10%" }}>
              +
            </span>
            <span className="lp-crosshair" style={{ top: "45%", right: "8%" }}>
              +
            </span>
            <span className="lp-crosshair" style={{ bottom: "16%", left: "8%" }}>
              +
            </span>
          </div>

          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
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
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
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
                  style={{
                    strokeDasharray: 56,
                    strokeDashoffset: Math.max(0, 56 * (1 - seg1Progress)),
                  }}
                />
                <circle cx="462" cy="150" r="5" className="lp-trail-node" />
                <circle cx="518" cy="150" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 01 -> 02: 1 particle, slowed */}
                <circle r="3.5" fill="#00c86d" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion dur="3.4s" repeatCount="indefinite" path="M 462 150 L 518 150" />
                </circle>

                {/* 02 -> 03: Logical, Clean Stepped Channel from Step 02 down into Step 03 */}
                <path
                  id="trail-seg-2"
                  d="M 518 230 H 496 Q 490 230 490 242 V 310 Q 490 322 484 322 H 462"
                  className="lp-trail-path"
                  style={{
                    strokeDasharray: 180,
                    strokeDashoffset: Math.max(0, 180 * (1 - seg2Progress)),
                  }}
                />
                <circle cx="518" cy="230" r="5" className="lp-trail-node" />
                <circle cx="462" cy="322" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 02 -> 03: 1 particle, slowed */}
                <circle r="3.5" fill="#00c86d" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion
                    dur="4.4s"
                    repeatCount="indefinite"
                    path="M 518 230 H 496 Q 490 230 490 242 V 310 Q 490 322 484 322 H 462"
                  />
                </circle>

                {/* 03 -> 04: Straight & Level from Step 03 right across to Step 04 left */}
                <path
                  id="trail-seg-3"
                  d="M 462 405 L 518 405"
                  className="lp-trail-path"
                  style={{
                    strokeDasharray: 56,
                    strokeDashoffset: Math.max(0, 56 * (1 - seg3Progress)),
                  }}
                />
                <circle cx="462" cy="405" r="5" className="lp-trail-node" />
                <circle cx="518" cy="405" r="5" className="lp-trail-node" />

                {/* Animated Flowing Trail Particle on 03 -> 04: 1 particle, slowed */}
                <circle r="3.5" fill="#00c86d" filter="url(#glow-particle)" opacity="0.95">
                  <animateMotion dur="3.4s" repeatCount="indefinite" path="M 462 405 L 518 405" />
                </circle>
              </svg>

              {/* Staggered 2-Column Grid */}
              <div className="lp-workflow-columns">
                {/* Column 1: Step 01 & Step 03 */}
                <div className="lp-workflow-col lp-workflow-col--left">
                  {/* Step 01 */}
                  <div className="lp-wf-card lp-reveal lp-stagger-1">
                    <div className={`lp-wf-num-circle ${wfProgress >= 0.05 ? "is-reached" : ""}`}>
                      01
                    </div>
                    <h3 className="lp-wf-title">Desain Rubrik</h3>
                    <p className="lp-wf-desc">
                      Susun kriteria penilaian dan bobot nilai secara terstruktur sebagai acuan
                      mutlak evaluasi.
                    </p>
                  </div>

                  {/* Step 03 */}
                  <div className="lp-wf-card lp-reveal lp-stagger-3">
                    <div className={`lp-wf-num-circle ${wfProgress >= 0.65 ? "is-reached" : ""}`}>
                      03
                    </div>
                    <h3 className="lp-wf-title">Analisis Kognitif</h3>
                    <p className="lp-wf-desc">
                      AI menganalisis kesesuaian berkas dengan rubrik dan menghasilkan draft skor
                      rekomendasi.
                    </p>
                  </div>
                </div>

                {/* Column 2: Step 02 & Step 04 (Staggered Down) */}
                <div className="lp-workflow-col lp-workflow-col--right">
                  {/* Step 02 */}
                  <div className="lp-wf-card lp-reveal lp-stagger-2">
                    <div className={`lp-wf-num-circle ${wfProgress >= 0.3 ? "is-reached" : ""}`}>
                      02
                    </div>
                    <h3 className="lp-wf-title">Kumpul Berkas</h3>
                    <p className="lp-wf-desc">
                      Unggah dokumen jawaban mahasiswa (PDF, Word) maupun teks langsung dengan
                      proses cepat.
                    </p>
                  </div>

                  {/* Step 04 */}
                  <div className="lp-wf-card lp-reveal lp-stagger-4">
                    <div className={`lp-wf-num-circle ${wfProgress >= 0.9 ? "is-reached" : ""}`}>
                      04
                    </div>
                    <h3 className="lp-wf-title">Validasi &amp; Rilis</h3>
                    <p className="lp-wf-desc">
                      Tinjau draft AI, lakukan penyesuaian skor jika diperlukan, lalu sahkan nilai
                      akhir secara resmi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle section transition divider */}
        <div className="lp-section-divider" aria-hidden="true" />

        {/* ─── KEUNGGULAN (FEATURES) (Item 9) ─── */}
        <section id="fitur" className="lp-section lp-features-section">
          {/* Ambient soft glow */}
          <div className="lp-features-ambient" aria-hidden="true" />
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <span className="lp-runner">Keunggulan</span>
              <h2 className="lp-h2">Fitur Utama Platform</h2>
              <p className="lp-subtext">
                Dirancang untuk memberikan kemudahan manajemen tugas dengan akurasi penilaian
                tinggi.
              </p>
            </div>

            <div className="lp-features-grid">
              {FEATURES.map((feat, idx) => (
                <div key={feat.title} className={`lp-feature-card lp-reveal lp-stagger-${idx + 1}`}>
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
            <div className="lp-section-head lp-reveal">
              <span className="lp-runner">Sandbox Demo</span>
              <h2 className="lp-h2">Siap Mencoba?</h2>
              <p className="lp-subtext">
                Gunakan kredensial sandbox instan berikut untuk menjelajahi platform langsung tanpa
                perlu registrasi.
              </p>
            </div>

            <div className="lp-demo-cards">
              {/* Dosen Card */}
              <div className="lp-demo-card lp-reveal lp-stagger-1">
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
              <div className="lp-demo-card lp-reveal lp-stagger-2">
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
            <a href="#home">Privasi</a>
            <a href="#home">Syarat Ketentuan</a>
            <a href="#home">Bantuan</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
