"use client";

import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  ListChecks,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import "./landing.css";

const criteria = [
  { title: "Ketepatan analisis", score: 34, max: 40 },
  { title: "Bukti & argumentasi", score: 26, max: 30 },
  { title: "Struktur penulisan", score: 17, max: 20 },
  { title: "Referensi", score: 8, max: 10 },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [score, setScore] = useState(85);
  const [released, setReleased] = useState(false);
  return (
    <div className="dexa-landing">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="Dexa Assessment — Beranda">
          <Image src="/dexa-logo.png" width={36} height={36} alt="" />
          <span>
            dexa<span className="brand-dot">.</span>
          </span>
          <small>ASSESSMENT</small>
        </Link>
        <nav
          className={menuOpen ? "landing-nav is-open" : "landing-nav"}
          aria-label="Navigasi beranda"
        >
          {[
            ["#cara-kerja", "Cara kerja"],
            ["#fitur", "Untuk kelas Anda"],
            ["#demo", "Coba interaksi"],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <Link href="/login" className="mobile-signin">
            Masuk ke akun <ArrowRight size={15} />
          </Link>
        </nav>
        <Link href="/login" className="landing-signin">
          Masuk ke akun <ArrowRight size={15} />
        </Link>
        <button
          type="button"
          className="landing-menu"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="landing-kicker">
              <span /> RUANG MENGAJAR YANG LEBIH TERARAH
            </p>
            <h1>
              Lebih dekat
              <br />
              dengan{" "}
              <span>
                proses
                <br className="desktop-break" /> belajar.
              </span>
            </h1>
            <p className="hero-description">
              Tugas tertata. Penilaian terbantu. Beri ruang lebih untuk memahami mahasiswa, dengan
              AI yang bekerja di bawah arahan Anda.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="landing-button">
                Mulai ruang mengajar <ArrowRight size={18} />
              </Link>
              <a href="#demo" className="landing-text-link">
                Lihat cara kerjanya <ArrowDown size={15} />
              </a>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={17} />
              <span>AI memberi saran. Dosen menentukan nilai.</span>
            </div>
          </div>
          <div
            className="hero-product"
            role="img"
            aria-label="Ilustrasi alur penilaian Dexa, menggunakan data contoh"
          >
            <div className="product-window">
              <div className="product-window-top">
                <span className="window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>RUANG MENGAJAR / KOREKSI</span>
                <span className="sample-label">CONTOH</span>
              </div>
              <div className="product-class">
                <div className="product-icon">
                  <BookOpen size={23} strokeWidth={1.5} />
                </div>
                <div>
                  <small>REKAYASA PERANGKAT LUNAK</small>
                  <h2>Memahami, lalu menilai.</h2>
                </div>
              </div>
              <div className="product-assignment">
                <div>
                  <span className="product-subject">TUGAS 04</span>
                  <h3>Analisis kebutuhan sistem</h3>
                  <p>Nadia Putri · PDF · 4 halaman</p>
                </div>
                <FileText size={30} strokeWidth={1.2} />
              </div>
              <div className="product-review">
                <div className="product-review-title">
                  <h4>Rubrik penilaian</h4>
                  <span className="draft-label">Draft saran AI</span>
                </div>
                {criteria.map((c) => (
                  <div key={c.title} className="product-criterion">
                    <span>{c.title}</span>
                    <span className="criterion-bar">
                      <i style={{ width: `${(c.score / c.max) * 100}%` }} />
                    </span>
                    <strong>
                      {c.score}
                      <small> / {c.max}</small>
                    </strong>
                  </div>
                ))}
                <div className="product-score">
                  <span>
                    Rekomendasi skor<small>Menunggu tinjauan dosen</small>
                  </span>
                  <strong>
                    85<span>/100</span>
                  </strong>
                </div>
              </div>
              <div className="product-bottom">
                <span>
                  <span className="status-dot" /> Belum dirilis ke mahasiswa
                </span>
                <span>
                  Tinjau jawaban <ArrowRight size={14} />
                </span>
              </div>
            </div>
            <div className="product-note">
              <CheckCircle2 size={19} />
              <span>
                Setiap nilai punya alasan.
                <br />
                <strong>Setiap keputusan tetap milik Anda.</strong>
              </span>
            </div>
          </div>
        </section>
        <div className="landing-principles">
          <span>
            <BookOpen size={18} /> Kelas & tugas dalam satu ruang
          </span>
          <span>
            <ListChecks size={18} /> Rubrik sesuai kebutuhan Anda
          </span>
          <span>
            <Users size={18} /> Dosen selalu memegang kendali
          </span>
        </div>
        <section id="cara-kerja" className="landing-section">
          <div className="section-heading">
            <p className="landing-kicker">01 / ALUR YANG JELAS</p>
            <h2>
              Dari tugas pertama
              <br />
              ke umpan balik yang berarti.
            </h2>
            <p>
              Tiga langkah yang saling terhubung, agar Anda tahu apa yang perlu dilakukan
              berikutnya.
            </p>
          </div>
          <div className="workflow-grid">
            {[
              {
                n: "01",
                icon: BookOpen,
                title: "Siapkan ruang belajar.",
                text: "Buat kelas, bagikan kode, lalu susun tugas dan kriteria penilaiannya.",
                tag: "Kelas → Tugas → Rubrik",
              },
              {
                n: "02",
                icon: FileText,
                title: "Baca bersama asisten.",
                text: "Mahasiswa mengumpulkan jawaban. AI membantu menyiapkan saran skor dan umpan balik sesuai rubrik.",
                tag: "Jawaban → Saran AI",
              },
              {
                n: "03",
                icon: CheckCircle2,
                title: "Putuskan dengan yakin.",
                text: "Periksa hasil, sesuaikan bila perlu, lalu rilis nilai resmi dan catatan untuk mahasiswa.",
                tag: "Tinjauan Anda → Nilai resmi",
              },
            ].map(({ n, icon: Icon, title, text, tag }) => (
              <article key={n}>
                <div className="workflow-top">
                  <Icon size={26} strokeWidth={1.5} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <small>{tag}</small>
              </article>
            ))}
          </div>
        </section>
        <section id="fitur" className="landing-section audience-section">
          <div>
            <p className="landing-kicker">02 / DUA PERAN, SATU RUANG</p>
            <h2>
              Mengajar lebih terarah.
              <br />
              Belajar lebih dipahami.
            </h2>
          </div>
          <div className="audience-grid">
            <article>
              <span className="audience-tag">UNTUK DOSEN</span>
              <h3>
                Gambaran kelas.
                <br />
                Perhatian pada setiap jawaban.
              </h3>
              <p>
                Pantau antrean koreksi, gunakan rubrik berbobot, dan tinjau rekomendasi AI sebelum
                merilis nilai.
              </p>
              <Link href="/register?role=DOSEN">
                Buat akun dosen <ArrowRight size={16} />
              </Link>
            </article>
            <article>
              <span className="audience-tag">UNTUK MAHASISWA</span>
              <h3>
                Tahu apa yang dikerjakan.
                <br />
                Paham apa yang diperbaiki.
              </h3>
              <p>
                Gabung dengan kode kelas, kumpulkan PDF, Word, atau teks, lalu baca nilai dan
                catatan resmi dosen.
              </p>
              <Link href="/register?role=MAHASISWA">
                Buat akun mahasiswa <ArrowRight size={16} />
              </Link>
            </article>
          </div>
        </section>
        <section id="demo" className="landing-section demo-section">
          <div>
            <p className="landing-kicker">03 / COBA SENDIRI</p>
            <h2>
              Saran AI adalah
              <br />
              awal percakapan.
            </h2>
            <p>
              Anda dapat mengubah skor sebelum merilisnya. Coba interaksi di samping untuk melihat
              bedanya.
            </p>
            <span className="demo-disclaimer">
              Simulasi UI dengan data contoh.
              <br />
              Tidak menyimpan atau merilis nilai sungguhan.
            </span>
          </div>
          <div className="interactive-review">
            <div className="product-review-title">
              <h3>Analisis kebutuhan sistem</h3>
              <span className={released ? "final-label" : "draft-label"}>
                {released ? "Nilai resmi" : "Draft saran AI"}
              </span>
            </div>
            <p className="demo-feedback">
              Analisis sudah terstruktur. Perkuat hubungan antara kebutuhan pengguna dan keputusan
              rancangan dengan contoh yang lebih spesifik.
            </p>
            <label htmlFor="demo-score">
              {released ? "Nilai yang dirilis" : "Skor setelah tinjauan Anda"}
            </label>
            <div className="demo-score-input">
              <input
                id="demo-score"
                type="number"
                min="0"
                max="100"
                disabled={released}
                value={score}
                onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value))))}
              />
              <span>/ 100</span>
            </div>
            <div role="status" className="demo-status">
              {released
                ? "Simulasi: nilai dan umpan balik kini tersedia bagi mahasiswa."
                : "Belum terlihat oleh mahasiswa. Periksa dan sesuaikan skornya."}
            </div>
            <button
              type="button"
              className="landing-button"
              onClick={() => {
                if (released) {
                  setScore(85);
                  setReleased(false);
                } else setReleased(true);
              }}
            >
              {released ? "Ulangi simulasi" : "Setujui & rilis (simulasi)"}
              {released ? <ArrowRight size={16} /> : <Check size={16} />}
            </button>
          </div>
        </section>
        <section className="landing-cta">
          <p className="landing-kicker">MULAI DARI SATU KELAS</p>
          <h2>
            Ruang mengajar Anda
            <br />
            berikutnya, mulai di sini.
          </h2>
          <Link href="/register" className="landing-button">
            Buat akun <ArrowRight size={18} />
          </Link>
          <Link href="/login?role=DOSEN&demo=true" className="cta-demo">
            Sudah ada data demo? Coba akun dosen →
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/" className="landing-brand">
          <span>dexa.</span>
        </Link>
        <p>Teknologi membantu. Pendidik memutuskan.</p>
        <span>Dexa Assessment © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
