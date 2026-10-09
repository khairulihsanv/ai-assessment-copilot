"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  School,
  User,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { registerAction } from "@/lib/actions/auth-actions";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam?.toUpperCase() === "MAHASISWA") {
      setRole("MAHASISWA");
    } else if (roleParam?.toUpperCase() === "DOSEN") {
      setRole("DOSEN");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim().toLowerCase());
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);
    formData.append("role", role);

    try {
      // 1. Create account using Server Action
      const result = await registerAction(formData);

      if (!result.success) {
        setError(result.error ?? "Terjadi kesalahan saat mendaftar");
        setLoading(false);
        return;
      }

      // 2. Success: Sesuai permintaan, jangan auto-login.
      // Pengguna harus login secara manual di halaman login.
      setSuccess(true);
      setLoading(false);

      const targetLoginUrl = `/login?registered=true&email=${encodeURIComponent(
        email.trim().toLowerCase()
      )}&role=${role}`;

      setTimeout(() => {
        router.push(targetLoginUrl);
      }, 1500);
    } catch (err: unknown) {
      console.error("Register error:", err);
      setError("Gagal memproses pendaftaran. Periksa koneksi database Anda.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* ─── TITLE & DESCRIPTION ─── */}
      <div className="text-center space-y-1 pb-1">
        <h2 className="text-2xl font-display font-extrabold text-[#111827] tracking-tight">
          Buat Akun Akademik
        </h2>
        <p className="text-xs text-[#6B7280]">
          Bergabung dengan AI Assessment Copilot SV UNS
        </p>
      </div>

      {/* ─── AUTH MODE TABS ─── */}
      <div className="flex p-1 bg-[#F3F4F6] rounded-full border border-[#E5E7EB]">
        <Link
          href="/login"
          className="flex-1 py-2 text-center rounded-full text-xs font-bold text-[#6B7280] hover:text-[#111827] transition"
        >
          Masuk
        </Link>
        <button
          type="button"
          className="flex-1 py-2 text-center rounded-full text-xs font-extrabold transition bg-[#1E4D3B] text-white shadow-xs cursor-default"
        >
          Daftar Akun Baru
        </button>
      </div>

      {/* ─── ROLE TOGGLE ─── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[#6B7280] block uppercase tracking-wider">
          Peran Pengguna Akademik
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#F3F4F6] rounded-2xl border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setRole("DOSEN")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              role === "DOSEN"
                ? "bg-white text-[#1E4D3B] shadow-xs border border-[#C5DDD1]"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <School size={15} />
            <span>Dosen / Penilai</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("MAHASISWA")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              role === "MAHASISWA"
                ? "bg-white text-[#F59E0B] shadow-xs border border-amber-200"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <User size={15} />
            <span>Mahasiswa</span>
          </button>
        </div>
      </div>

      {/* ─── ERROR BANNER ─── */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* ─── SUCCESS BANNER ─── */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-xs">Pendaftaran Berhasil!</span>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Akun Anda telah berhasil dibuat. Sesuai kebijakan keamanan, silakan masuk menggunakan kredensial Anda. Mengalihkan ke portal masuk...
          </p>
          <div className="pt-1">
            <Link
              href={`/login?registered=true&email=${encodeURIComponent(
                email.trim().toLowerCase()
              )}&role=${role}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E4D3B] underline underline-offset-4"
            >
              <span>Lanjut ke Halaman Login Sekarang</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ─── REGISTER FORM ─── */}
      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label htmlFor="fullname" className="text-xs font-bold text-[#374151] block">
              Nama Lengkap & Gelar
            </label>
            <input
              id="fullname"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                role === "DOSEN"
                  ? "Contoh: Dr. Budi Santoso, S.T., M.Kom."
                  : "Contoh: Ahmad Rizki Pratama"
              }
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
            />
          </div>

          {/* NIP / NIM (Informational / Identity) */}
          <div className="space-y-1">
            <label htmlFor="identity" className="text-xs font-bold text-[#374151] block">
              {role === "DOSEN" ? "NIP / NIDN Dosen (Opsional)" : "NIM (Nomor Induk Mahasiswa) (Opsional)"}
            </label>
            <input
              id="identity"
              type="text"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={
                role === "DOSEN" ? "198403122010121001" : "M3122008"
              }
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="email" className="font-bold text-[#374151]">
                Email Kampus Terdaftar
              </label>
              <span className="font-mono text-[10px] text-[#6B7280]">
                {role === "DOSEN" ? "@staff.uns.ac.id" : "@student.uns.ac.id"}
              </span>
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                role === "DOSEN"
                  ? "nama.dosen@staff.uns.ac.id"
                  : "mhs.vokasi@student.uns.ac.id"
              }
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="password" className="font-bold text-[#374151]">
                Kata Sandi
              </label>
              <span className="text-[10px] text-[#6B7280]">Minimal 6 karakter</span>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-xs font-bold text-[#374151] block">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative flex items-center">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99] mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Mendaftarkan Akun...</span>
              </>
            ) : (
              <>
                <span>Registrasi Akun Baru</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Security badge */}
      <div className="pt-2 flex items-center justify-center gap-1.5 text-center text-[#6B7280] font-mono text-[10px]">
        <ShieldCheck size={14} className="text-[#1E4D3B]" />
        <span>256-bit Enkripsi Akademik & Dilindungi AI Safety Guardrails</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#6B7280]">Memuat Formulir Pendaftaran...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
