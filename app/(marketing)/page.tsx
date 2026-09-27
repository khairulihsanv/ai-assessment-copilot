"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  School,
  User,
  Copy,
  Check,
  RotateCw,
  Activity,
  Layers,
  FileCheck,
  Cpu,
  BookOpen,
  Calendar,
  ExternalLink,
  ChevronRight,
  Award,
  Upload,
  Star,
  Users,
  PlayCircle
} from "lucide-react";

export default function LandingPage() {
  const [copiedDosen, setCopiedDosen] = useState(false);
  const [copiedMhs, setCopiedMhs] = useState(false);

  const copyToClipboard = (text: string, isDosen: boolean) => {
    navigator.clipboard.writeText(text);
    if (isDosen) {
      setCopiedDosen(true);
      setTimeout(() => setCopiedDosen(false), 2000);
    } else {
      setCopiedMhs(true);
      setTimeout(() => setCopiedMhs(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#1E4D3B] selection:text-white font-sans">
      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-extrabold text-[#111827] leading-none tracking-tight">
                Dexa Assessment
              </span>
              <span className="text-[10px] font-mono text-[#1E4D3B] uppercase font-bold tracking-wider mt-0.5">
                Sekolah Vokasi UNS
              </span>
            </div>
          </Link>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#fitur" className="text-sm font-semibold text-[#4B5563] hover:text-[#1E4D3B] transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="text-sm font-semibold text-[#4B5563] hover:text-[#1E4D3B] transition-colors">
              Cara Kerja
            </a>
            <a href="#tentang" className="text-sm font-semibold text-[#4B5563] hover:text-[#1E4D3B] transition-colors">
              Human-in-the-Loop
            </a>
            <a href="#demo-section" className="text-sm font-semibold text-[#4B5563] hover:text-[#1E4D3B] transition-colors">
              Demo
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-[#111827] hover:text-[#1E4D3B] transition-colors hidden sm:block"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#111827] text-white text-sm font-bold hover:bg-[#1E4D3B] transition-all shadow-sm active:scale-95"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── HERO SECTION ─── */}
        <section className="pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden relative">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E2EFE9]/40 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
            
            {/* Social Proof Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-[#E5E7EB] shadow-sm mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${i === 1 ? 'bg-[#1E4D3B]' : i === 2 ? 'bg-[#4B5563]' : 'bg-[#111827]'}`}>
                    <User size={12} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#E5E7EB] pl-3">
                <Star size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-xs font-bold text-[#374151]">
                  Meningkatkan efisiensi dosen 80%
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#111827] max-w-4xl leading-[1.1] mb-6">
              Koreksi Tugas Lebih Cepat <br className="hidden md:block" />
              <span className="text-[#1E4D3B]">
                dengan Bantuan AI.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-[#4B5563] max-w-2xl leading-relaxed mb-10 font-medium">
              Platform manajemen tugas & evaluasi cerdas yang membantu Anda menganalisis jawaban mahasiswa secara objektif via arsitektur <span className="text-[#111827] font-bold border-b-2 border-[#E2EFE9]">Human-in-the-Loop</span>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
              <Link
                href="#demo-section"
                className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-[#1E4D3B] text-white text-base font-bold hover:bg-[#15392C] shadow-lg shadow-[#1E4D3B]/20 transition-all active:scale-95"
              >
                Mulai Sekarang Gratis
              </Link>
              <a
                href="#cara-kerja"
                className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-white text-[#111827] text-base font-bold border-2 border-[#E5E7EB] hover:border-[#111827] hover:bg-[#F9FAFB] transition-all active:scale-95 gap-2"
              >
                <PlayCircle size={20} />
                Lihat Demo
              </a>
            </div>

            {/* ─── HERO GRAPHIC (Bento Box Style, mimicking the Dribbble puzzle feel but with UI) ─── */}
            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 h-auto md:h-[500px]">
              
              {/* Large Main Feature (Forest Green) */}
              <div className="md:col-span-2 md:row-span-2 rounded-[2.5rem] bg-[#1E4D3B] p-8 md:p-12 relative overflow-hidden flex flex-col justify-between text-left group">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold mb-6 border border-white/10">
                    <Sparkles size={14} className="text-[#E2EFE9]" />
                    AI Grading Assistant
                  </div>
                  <h3 className="text-3xl md:text-5xl font-display font-extrabold text-white leading-tight max-w-md">
                    Learn Happy, <br />
                    <span className="text-[#E2EFE9]">Grow Bright</span>
                  </h3>
                </div>
                
                {/* Mock UI snippet floating */}
                <div className="absolute -bottom-6 -right-6 md:right-8 md:bottom-8 w-[80%] md:w-[320px] bg-white rounded-3xl p-5 shadow-2xl border border-white/20 transform group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#E2EFE9] flex items-center justify-center text-[#1E4D3B]">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="font-bold text-sm text-[#111827]">Tugas 01 - Basis Data</div>
                    </div>
                    <span className="text-xs font-bold text-[#1E4D3B] bg-[#E2EFE9] px-2 py-1 rounded-full">Selesai</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-[#1E4D3B] w-[85%] rounded-full"></div>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between font-medium">
                      <span>Akurasi Rubrik</span>
                      <span className="text-[#111827] font-bold">85/100</span>
                    </div>
                  </div>
                </div>

                {/* Decorative background shapes */}
                <svg className="absolute top-0 right-0 w-[400px] h-[400px] text-white/5 transform translate-x-1/4 -translate-y-1/4" viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="50" />
                </svg>
              </div>

              {/* Top Right Box (Warm Cream) */}
              <div className="rounded-[2.5rem] bg-[#F4F3ED] p-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#B45309] mb-4">
                  <Cpu size={32} />
                </div>
                <h4 className="text-xl font-display font-extrabold text-[#111827] mb-2">Analisis Instan</h4>
                <p className="text-sm text-[#4B5563] font-medium">Evaluasi ratusan baris kode dalam hitungan detik.</p>
              </div>

              {/* Bottom Right Box (Soft Mint) */}
              <div className="rounded-[2.5rem] bg-[#E2EFE9] p-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1E4D3B] mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-xl font-display font-extrabold text-[#111827] mb-2">100% Terkendali</h4>
                <p className="text-sm text-[#4B5563] font-medium">Nilai final selalu membutuhkan persetujuan Anda.</p>
              </div>

            </div>
          </div>
        </section>

        {/* ─── TRUSTED BY SECTION ─── */}
        <section className="py-12 border-y border-[#E5E7EB] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-bold tracking-widest text-[#6B7280] uppercase mb-8">
              Dipercaya oleh institusi yang mengedepankan kualitas pendidikan
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-display font-extrabold text-xl text-[#111827]">
                <School size={28} />
                Sekolah Vokasi UNS
              </div>
              <div className="flex items-center gap-2 font-display font-extrabold text-xl text-[#111827]">
                <Layers size={28} />
                D3 Teknik Informatika
              </div>
              <div className="flex items-center gap-2 font-display font-extrabold text-xl text-[#111827]">
                <BookOpen size={28} />
                Prodi Terapan
              </div>
            </div>
          </div>
        </section>

        {/* ─── ABOUT / SPLIT FEATURE SECTION ─── */}
        <section id="tentang" className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Content */}
              <div className="space-y-8 max-w-lg">
                <div>
                  <span className="font-mono text-xs font-bold tracking-wider text-[#1E4D3B] uppercase mb-4 block">
                    Tentang Sistem
                  </span>
                  <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-[#111827] leading-[1.1]">
                    Pemberdayaan <br />
                    <span className="text-[#1E4D3B]">Bukan Penggantian.</span>
                  </h2>
                </div>
                <p className="text-lg text-[#4B5563] leading-relaxed font-medium">
                  Dexa Assessment dirancang dengan filosofi <strong className="text-[#111827]">Human-in-the-Loop</strong>. Sistem ini membaca, menganalisis, dan mencocokkan jawaban dengan rubrik, namun <strong className="text-[#111827]">keputusan akhir, empati, dan konteks pedagogis</strong> tetap menjadi otoritas mutlak seorang dosen.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center flex-shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="font-bold text-[#111827]">Menghindari bias "AI Slop"</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center flex-shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="font-bold text-[#111827]">Transparansi dasar penilaian yang jelas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center flex-shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="font-bold text-[#111827]">Dukungan multi-format (Kode, PDF, Teks)</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-[#111827] text-white text-base font-bold hover:bg-[#1E4D3B] transition-all"
                  >
                    Pelajari Lebih Lanjut
                  </Link>
                </div>
              </div>

              {/* Right Graphic */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#E2EFE9] to-[#F4F3ED] rounded-[3rem] transform rotate-3 scale-105 -z-10"></div>
                <div className="bg-white border border-[#E5E7EB] rounded-[3rem] p-8 shadow-xl relative overflow-hidden">
                  
                  {/* Decorative Header */}
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F4F3ED] flex items-center justify-center text-[#B45309]">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-[#111827]">Lembar Jawaban Budi</div>
                        <div className="text-xs text-gray-500 font-medium">NIM: V3922001</div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B] text-xs font-bold">
                      Menunggu Validasi
                    </div>
                  </div>

                  {/* Mock Content */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#111827]">Saran Nilai AI</span>
                        <span className="font-display font-extrabold text-xl text-[#1E4D3B]">85<span className="text-sm text-gray-400">/100</span></span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">
                        Berdasarkan rubrik, implementasi fungsi login sudah aman dari SQL Injection (Poin penuh). Namun penanganan error masih kurang spesifik (-15 poin).
                      </p>
                      <button className="w-full py-2.5 rounded-xl bg-[#1E4D3B] text-white text-xs font-bold">
                        Setujui & Rilis Nilai
                      </button>
                      <button className="w-full py-2.5 rounded-xl bg-white text-[#4B5563] text-xs font-bold border border-gray-200 mt-2 hover:bg-gray-50">
                        Edit Manual
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── CARA KERJA (ALUR TERSTRUKTUR) ─── */}
        <section id="cara-kerja" className="py-24 bg-white border-t border-[#E5E7EB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs font-bold tracking-wider text-[#1E4D3B] uppercase mb-4 block">
                Alur Praktis
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-[#111827] leading-tight">
                Bagaimana Sistem Bekerja
              </h2>
              <p className="text-lg text-[#4B5563] mt-4 font-medium">
                4 langkah sederhana dari pembuatan rubrik hingga perilisan nilai akhir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-8 rounded-[2rem] bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#1E4D3B]/30 transition-colors group">
                <span className="font-display font-extrabold text-4xl text-[#1E4D3B] opacity-50 group-hover:opacity-100 transition-opacity">01</span>
                <h4 className="font-display font-bold text-lg text-[#111827] mt-6 mb-3">Desain Rubrik</h4>
                <p className="text-sm text-[#4B5563] leading-relaxed font-medium">
                  Dosen menyusun kriteria penilaian dan bobot nilai secara terstruktur sebagai acuan mutlak.
                </p>
              </div>

              <div className="p-8 rounded-[2rem] bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#B45309]/30 transition-colors group">
                <span className="font-display font-extrabold text-4xl text-[#B45309] opacity-50 group-hover:opacity-100 transition-opacity">02</span>
                <h4 className="font-display font-bold text-lg text-[#111827] mt-6 mb-3">Kumpul Berkas</h4>
                <p className="text-sm text-[#4B5563] leading-relaxed font-medium">
                  Mahasiswa mengunggah jawaban, baik dalam format dokumen (PDF) maupun teks (Kode).
                </p>
              </div>

              <div className="p-8 rounded-[2rem] bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#DC2626]/30 transition-colors group">
                <span className="font-display font-extrabold text-4xl text-[#DC2626] opacity-50 group-hover:opacity-100 transition-opacity">03</span>
                <h4 className="font-display font-bold text-lg text-[#111827] mt-6 mb-3">Analisis Kognitif</h4>
                <p className="text-sm text-[#4B5563] leading-relaxed font-medium">
                  AI menguji jawaban terhadap rubrik dan menghasilkan draf nilai secara instan.
                </p>
              </div>

              <div className="p-8 rounded-[2rem] bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#2563EB]/30 transition-colors group">
                <span className="font-display font-extrabold text-4xl text-[#2563EB] opacity-50 group-hover:opacity-100 transition-opacity">04</span>
                <h4 className="font-display font-bold text-lg text-[#111827] mt-6 mb-3">Validasi & Rilis</h4>
                <p className="text-sm text-[#4B5563] leading-relaxed font-medium">
                  Dosen memeriksa draf AI, menyesuaikan skor bila perlu, dan mempublikasikan hasil.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES GRID ─── */}
        <section id="fitur" className="py-24 bg-[#FAFAFA] border-t border-[#E5E7EB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs font-bold tracking-wider text-[#1E4D3B] uppercase mb-4 block">
                Keunggulan
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-[#111827] leading-tight">
                Pelajaran Menarik <br />
                Dirancang untuk Memicu Rasa Ingin Tahu
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-white rounded-[2rem] p-6 text-center border border-[#E5E7EB] shadow-sm hover:shadow-xl transition-shadow group">
                <div className="w-full aspect-square rounded-3xl bg-[#F4F3ED] mb-6 flex items-center justify-center p-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <FileCheck size={64} className="text-[#B45309] relative z-10" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-bold text-[#111827] mb-2">Desain Rubrik</h3>
                <p className="text-sm text-[#4B5563] font-medium">Buat kriteria penilaian terstruktur.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-[2rem] p-6 text-center border border-[#E5E7EB] shadow-sm hover:shadow-xl transition-shadow group">
                <div className="w-full aspect-square rounded-3xl bg-[#E2EFE9] mb-6 flex items-center justify-center p-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <Cpu size={64} className="text-[#1E4D3B] relative z-10" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-bold text-[#111827] mb-2">Analisis Kognitif</h3>
                <p className="text-sm text-[#4B5563] font-medium">Evaluasi otomatis berbasis AI.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-[2rem] p-6 text-center border border-[#E5E7EB] shadow-sm hover:shadow-xl transition-shadow group">
                <div className="w-full aspect-square rounded-3xl bg-[#FEF2F2] mb-6 flex items-center justify-center p-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <CheckCircle2 size={64} className="text-[#DC2626] relative z-10" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-bold text-[#111827] mb-2">Validasi Dosen</h3>
                <p className="text-sm text-[#4B5563] font-medium">Tinjau dan sesuaikan nilai akhir.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-[2rem] p-6 text-center border border-[#E5E7EB] shadow-sm hover:shadow-xl transition-shadow group">
                <div className="w-full aspect-square rounded-3xl bg-[#EFF6FF] mb-6 flex items-center justify-center p-6 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <Activity size={64} className="text-[#2563EB] relative z-10" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-bold text-[#111827] mb-2">Analitik Kelas</h3>
                <p className="text-sm text-[#4B5563] font-medium">Pantau performa dan tren.</p>
              </div>

            </div>
          </div>
        </section>

        {/* ─── SANDBOX DEMO SECTION ─── */}
        <section id="demo-section" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#111827] rounded-[3rem] p-8 md:p-16 text-white text-center relative overflow-hidden shadow-2xl">
              
              {/* Background abstract */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1E4D3B] rounded-full blur-[120px] opacity-40 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
              
              <div className="relative z-10">
                <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6">
                  Siap Mencoba?
                </h2>
                <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
                  Gunakan kredensial sandbox instan berikut untuk menjelajahi fitur tanpa perlu registrasi.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
                  
                  {/* Dosen Card */}
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-[#E2EFE9] text-sm">Akun Dosen</span>
                      <button
                        onClick={() => copyToClipboard("dosen.demo@example.com", true)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        {copiedDosen ? <Check size={14} className="text-[#E2EFE9]" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="font-mono text-sm text-gray-300 space-y-2 mb-6">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span>Email</span>
                        <span className="text-white">dosen.demo@example.com</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span>Password</span>
                        <span className="text-white">dosen123</span>
                      </div>
                    </div>
                    <Link
                      href="/login"
                      className="block w-full py-3 rounded-full bg-[#1E4D3B] text-white text-center text-sm font-bold hover:bg-[#15392C] transition-colors"
                    >
                      Masuk Sebagai Dosen
                    </Link>
                  </div>

                  {/* Mahasiswa Card */}
                  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-[#F59E0B] text-sm">Akun Mahasiswa</span>
                      <button
                        onClick={() => copyToClipboard("mahasiswa.demo@example.com", false)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      >
                        {copiedMhs ? <Check size={14} className="text-[#F59E0B]" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="font-mono text-sm text-gray-300 space-y-2 mb-6">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                        <span>Email</span>
                        <span className="text-white">mahasiswa.demo@example.com</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span>Password</span>
                        <span className="text-white">mhs123</span>
                      </div>
                    </div>
                    <Link
                      href="/login"
                      className="block w-full py-3 rounded-full bg-white text-[#111827] text-center text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                      Masuk Sebagai Mahasiswa
                    </Link>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-[#E5E7EB] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-[#111827] block leading-tight">Dexa Assessment</span>
              <span className="text-xs text-gray-500 font-medium">© 2024 Sekolah Vokasi UNS</span>
            </div>
          </div>

          <div className="flex items-center gap-8 text-sm font-semibold text-[#4B5563]">
            <a href="#" className="hover:text-[#1E4D3B] transition-colors">Privasi</a>
            <a href="#" className="hover:text-[#1E4D3B] transition-colors">Syarat Ketentuan</a>
            <a href="#" className="hover:text-[#1E4D3B] transition-colors">Bantuan</a>
          </div>

        </div>
      </footer>
    </div>
  );
}

