"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
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

=======
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { registerAction } from "@/lib/actions/auth-actions";
import { signIn } from "next-auth/react";
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
<<<<<<< HEAD
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
=======
  const [show, setShow] = useState(false);
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRole(params.get("role")?.toUpperCase() === "MAHASISWA" ? "MAHASISWA" : "DOSEN");
  }, [params]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
<<<<<<< HEAD

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim().toLowerCase());
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);
    formData.append("role", role);

    try {
      // 1. Create account using Server Action
      const result = await registerAction(formData);

=======
    const data = new FormData(event.currentTarget);
    data.set("role", role);
    try {
      const result = await registerAction(data);
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
      if (!result.success) {
        setError(result.error || "Pendaftaran belum berhasil.");
        setLoading(false);
        return;
      }
<<<<<<< HEAD

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
=======
      const login = await signIn("credentials", {
        redirect: false,
        email: data.get("email"),
        password: data.get("password"),
      });
      if (login?.ok) {
        window.location.assign("/dashboard");
      } else {
        setError("Akun berhasil dibuat. Silakan masuk melalui halaman Masuk.");
        setLoading(false);
      }
    } catch {
      setError("Pendaftaran belum berhasil. Periksa koneksi dan coba lagi.");
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
      setLoading(false);
    }
  }
  return (
<<<<<<< HEAD
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
=======
    <div>
      <p className="dexa-eyebrow text-primary">Mulai bersama Dexa</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Buat akun Anda</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Pilih peran untuk menyiapkan ruang kerja yang sesuai.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={loading}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Saya mendaftar sebagai</legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "DOSEN", label: "Dosen", icon: BookOpen },
                { value: "MAHASISWA", label: "Mahasiswa", icon: GraduationCap },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm ${role === value ? "border-primary bg-secondary font-semibold text-secondary-foreground" : "bg-card text-muted-foreground"}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="accent-primary"
                />
                <Icon size={16} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Nama lengkap
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Nama yang digunakan di kelas"
            className="w-full border px-3 py-3"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nama@kampus.ac.id"
            className="w-full border px-3 py-3"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="password-hint"
              className="w-full border py-3 pl-3 pr-12"
            />
            <button
              type="button"
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={show}
              onClick={() => setShow(!show)}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
          </div>
          <p id="password-hint" className="mt-2 text-xs leading-5 text-muted-foreground">
            Minimal 8 karakter, termasuk huruf kapital, angka, dan simbol.
          </p>
        </div>
<<<<<<< HEAD
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
=======
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
            Ulangi kata sandi
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full border px-3 py-3"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <button
          disabled={loading}
          type="submit"
          className="dexa-link dexa-link-primary w-full disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Membuat akun…
            </>
          ) : (
            <>
              Buat akun <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="mt-6 border-t pt-6 text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
          Masuk ke Dexa
        </Link>
      </p>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
    </div>
  );
}
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Memuat formulir pendaftaran…
        </p>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
