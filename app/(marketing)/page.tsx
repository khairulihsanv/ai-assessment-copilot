import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  Upload,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  BookOpen,
  Users,
  Brain,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Dexa Assessment — Modern LMS Collaboration Hub & Evaluasi Cerdas",
  description:
    "Dexa Assessment — Platform manajemen tugas & penilaian berbasis AI yang membantu dosen mengoreksi tugas lebih efisien dengan pendekatan Human-in-the-Loop.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "color-mix(in oklch, var(--surface) 85%, transparent)", borderColor: "var(--border)" }}>
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-primary-500)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Dexa Assessment
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--text-primary)" }}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--color-primary-500)" }}
            >
              Daftar Gratis
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        {/* ─── Hero Section ─── */}
        <section className="relative overflow-hidden pt-20 pb-28">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--color-primary-200), transparent 70%)" }} />
            <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, var(--color-ai-200), transparent 70%)" }} />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Tag */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 animate-[fade-in_0.5s_ease-out]"
                style={{ background: "var(--color-ai-100)", color: "var(--color-ai-700)", border: "1px solid var(--color-ai-200)" }}
              >
                <Sparkles size={14} />
                <span>AI-Powered Assessment Platform</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl font-bold leading-[1.1] mb-6 animate-[slide-up_0.6s_ease-out]" style={{ color: "var(--text-primary)" }}>
                Koreksi Tugas Lebih Cepat,{" "}
                <span className="text-gradient-primary">Keputusan Tetap di Tangan Dosen</span>
              </h1>

              <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto animate-[slide-up_0.7s_ease-out]" style={{ color: "var(--text-secondary)" }}>
                Platform manajemen tugas & penilaian yang menggunakan AI untuk membantu dosen menganalisis jawaban mahasiswa — bukan menggantikan, tapi mempercepat proses koreksi dengan <strong style={{ color: "var(--text-primary)" }}>pendekatan Human-in-the-Loop</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-[slide-up_0.8s_ease-out]">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: "var(--color-primary-500)" }}
                >
                  Mulai Sekarang
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#cara-kerja"
                  className="px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:opacity-80 flex items-center justify-center gap-2"
                  style={{ color: "var(--text-primary)", border: "1.5px solid var(--border)" }}
                >
                  Lihat Cara Kerja
                </Link>
              </div>
            </div>

            {/* Hero Preview */}
            <div className="mt-20 max-w-5xl mx-auto relative animate-[slide-up_1s_ease-out]">
              <div className="rounded-2xl overflow-hidden border shadow-xl" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}>
                {/* Mock browser bar */}
                <div className="h-10 flex items-center px-4 gap-2 border-b" style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.7 0.15 25)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.8 0.15 85)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.7 0.15 145)" }} />
                  </div>
                  <div className="flex-1 mx-4 h-6 rounded-md px-3 flex items-center text-xs" style={{ background: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                    ai-assessment-copilot.vercel.app/dashboard
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Kelas Aktif", value: "5", icon: BookOpen, color: "var(--color-primary-500)" },
                      { label: "Menunggu Review", value: "12", icon: Sparkles, color: "var(--color-ai-500)" },
                      { label: "Mahasiswa", value: "148", icon: Users, color: "var(--color-final-500)" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon size={16} style={{ color: stat.color }} />
                          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{stat.label}</span>
                        </div>
                        <span className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Mock submission rows */}
                  <div className="space-y-3">
                    {[
                      { name: "Ahmad Rizki", task: "Analisis Algoritma — Tugas 3", status: "AI_REVIEWED", statusColor: "var(--color-ai-500)" },
                      { name: "Siti Rahayu", task: "Basis Data — UTS", status: "GRADED", statusColor: "var(--color-final-500)" },
                      { name: "Budi Santoso", task: "Pemrograman Web — Tugas 5", status: "SUBMITTED", statusColor: "var(--color-warning-500)" },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--color-primary-400)" }}>
                            {row.name.split(" ").map(w => w[0]).join("")}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.name}</div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{row.task}</div>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{
                          background: `color-mix(in oklch, ${row.statusColor} 15%, transparent)`,
                          color: row.statusColor,
                        }}>
                          {row.status === "AI_REVIEWED" ? "✨ Siap Review" : row.status === "GRADED" ? "✓ Dinilai" : "⏳ Baru Masuk"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Problem → Solution ─── */}
        <section className="py-24 border-t" style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Mengapa Dexa Assessment?
              </h2>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                Dosen menghabiskan berjam-jam untuk mengoreksi tugas secara manual. Kami hadir untuk membantu — bukan menggantikan.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Koreksi 10x Lebih Cepat",
                  desc: "AI menganalisis jawaban dan memberikan saran nilai awal berdasarkan rubrik penilaian. Dosen tinggal review dan finalisasi.",
                  color: "var(--color-primary-500)",
                },
                {
                  icon: Shield,
                  title: "Kontrol Penuh di Dosen",
                  desc: "Pendekatan Human-in-the-Loop — AI hanya memberikan saran draft. Keputusan nilai akhir 100% di tangan dosen.",
                  color: "var(--color-final-500)",
                },
                {
                  icon: BarChart3,
                  title: "Feedback Konstruktif",
                  desc: "Setiap penilaian disertai feedback naratif per kriteria rubrik, membantu mahasiswa memahami area yang perlu diperbaiki.",
                  color: "var(--color-ai-500)",
                },
              ].map((feature) => (
                <div key={feature.title} className="p-8 rounded-2xl border transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg"
                  style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `color-mix(in oklch, ${feature.color} 15%, transparent)` }}
                  >
                    <feature.icon size={24} style={{ color: feature.color }} />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section id="cara-kerja" className="py-24 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Cara Kerja
              </h2>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                Empat langkah sederhana dari pembuatan kelas hingga penilaian final
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  icon: GraduationCap,
                  title: "Buat Kelas & Rubrik",
                  desc: "Dosen membuat kelas, menambahkan rubrik penilaian dengan kriteria & bobot, lalu membuat assignment.",
                  color: "var(--color-primary-500)",
                },
                {
                  step: "02",
                  icon: Upload,
                  title: "Mahasiswa Submit Tugas",
                  desc: "Mahasiswa mengerjakan dan submit tugas dalam bentuk teks, PDF, atau DOCX sebelum deadline.",
                  color: "var(--color-warning-500)",
                },
                {
                  step: "03",
                  icon: Brain,
                  title: "AI Analisis & Draft Nilai",
                  desc: "AI mengekstrak teks, menganalisis jawaban berdasarkan rubrik, dan menghasilkan draft skor + feedback per kriteria.",
                  color: "var(--color-ai-500)",
                },
                {
                  step: "04",
                  icon: CheckCircle2,
                  title: "Dosen Review & Finalisasi",
                  desc: "Dosen mereview saran AI, mengedit jika perlu, lalu memfinalisasi nilai. Mahasiswa melihat nilai final.",
                  color: "var(--color-final-500)",
                },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  <div className="p-6 rounded-2xl border h-full transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md"
                    style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
                  >
                    <div className="font-display text-5xl font-bold mb-4 opacity-10" style={{ color: item.color }}>
                      {item.step}
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: `color-mix(in oklch, ${item.color} 15%, transparent)` }}
                    >
                      <item.icon size={20} style={{ color: item.color }} />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {item.desc}
                    </p>
                  </div>
                  {/* Arrow between steps */}
                  {i < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 z-10" style={{ color: "var(--border-strong)" }}>
                      <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HITL Explanation ─── */}
        <section className="py-24 border-t" style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                  style={{ background: "var(--color-final-100)", color: "var(--color-final-600)" }}
                >
                  <Shield size={12} />
                  Human-in-the-Loop
                </div>
                <h2 className="font-display text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                  AI Sebagai Asisten, Bukan Pengganti
                </h2>
                <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                  Dalam pendekatan Human-in-the-Loop, AI berperan sebagai <strong>asisten</strong> yang membantu mempercepat proses — bukan mengambil keputusan. Setiap saran nilai dari AI hanya bersifat <strong>draft</strong> yang harus divalidasi oleh dosen sebelum dikirim ke mahasiswa.
                </p>
                <ul className="space-y-3">
                  {[
                    "Saran AI tidak pernah otomatis menjadi nilai final",
                    "Dosen bisa menerima, mengedit, atau menolak seluruh saran",
                    "Sistem mencatat apakah nilai final diubah dari saran AI (transparansi)",
                    "Mahasiswa hanya melihat nilai yang sudah difinalisasi dosen",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-final-500)" }} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Visual: AI Draft vs Final */}
              <div className="space-y-4">
                <div className="p-5 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--color-ai-400)", background: "color-mix(in oklch, var(--color-ai-100) 50%, var(--surface-elevated))" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} style={{ color: "var(--color-ai-500)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--color-ai-700)" }}>Saran AI (Draft)</span>
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex justify-between"><span>Pemahaman Konsep</span><span className="font-mono font-semibold">22/25</span></div>
                    <div className="flex justify-between"><span>Ketepatan Analisis</span><span className="font-mono font-semibold">18/25</span></div>
                    <div className="flex justify-between"><span>Penulisan & Struktur</span><span className="font-mono font-semibold">20/25</span></div>
                    <div className="flex justify-between"><span>Referensi</span><span className="font-mono font-semibold">22/25</span></div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold" style={{ borderColor: "var(--color-ai-300)", color: "var(--color-ai-700)" }}>
                      <span>Total Saran</span><span className="font-mono">82/100</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    <span>Dosen mengedit</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                <div className="p-5 rounded-xl border-2" style={{ borderColor: "var(--color-final-500)", background: "color-mix(in oklch, var(--color-final-100) 50%, var(--surface-elevated))" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} style={{ color: "var(--color-final-500)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--color-final-700)" }}>Nilai Final (Dosen)</span>
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex justify-between"><span>Pemahaman Konsep</span><span className="font-mono font-semibold">22/25</span></div>
                    <div className="flex justify-between"><span>Ketepatan Analisis</span><span className="font-mono font-semibold" style={{ color: "var(--color-danger-500)" }}>15/25 ✎</span></div>
                    <div className="flex justify-between"><span>Penulisan & Struktur</span><span className="font-mono font-semibold">20/25</span></div>
                    <div className="flex justify-between"><span>Referensi</span><span className="font-mono font-semibold">22/25</span></div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold" style={{ borderColor: "var(--color-final-400)", color: "var(--color-final-700)" }}>
                      <span>Total Final</span><span className="font-mono">79/100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Siap Mempercepat Proses Penilaian?
            </h2>
            <p className="text-lg mb-10" style={{ color: "var(--text-secondary)" }}>
              Daftar gratis dan mulai gunakan Dexa Assessment untuk kelas Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: "var(--color-primary-500)" }}
              >
                Daftar Sebagai Dosen
                <GraduationCap size={18} />
              </Link>
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:opacity-80 flex items-center justify-center gap-2"
                style={{ color: "var(--text-primary)", border: "1.5px solid var(--border)" }}
              >
                Daftar Sebagai Mahasiswa
                <BookOpen size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t py-8" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Dexa Assessment — Modern LMS Collaboration Hub</span>
          </div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()}. Human-in-the-Loop AI Assessment.
          </div>
        </div>
      </footer>
    </div>
  );
}
