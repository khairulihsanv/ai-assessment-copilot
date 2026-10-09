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
  Zap,
  Lock,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const registered = searchParams.get("registered") === "true";
  const sessionEnded = searchParams.get("reason") === "session_ended";

  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
=======
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function fillDemo(role: string) {
    setEmail(role === "DOSEN" ? "dosen.demo@example.com" : "mahasiswa.demo@example.com");
    setPassword(role === "DOSEN" ? "Dosen@12345" : "Mhs@12345");
    setError("");
  }
  useEffect(() => {
<<<<<<< HEAD
    const roleParam = searchParams.get("role");
    const demoParam = searchParams.get("demo");
    const emailParam = searchParams.get("email");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (roleParam?.toUpperCase() === "MAHASISWA") {
      setRole("MAHASISWA");
      if (demoParam === "true") {
        setEmail("mahasiswa.demo@example.com");
        setPassword("Mhs@12345");
      }
    } else if (roleParam?.toUpperCase() === "DOSEN") {
      setRole("DOSEN");
      if (demoParam === "true") {
        setEmail("dosen.demo@example.com");
        setPassword("Dosen@12345");
      }
    }
  }, [searchParams]);

  const handleFillDemo = (targetRole: "DOSEN" | "MAHASISWA") => {
    setRole(targetRole);
    if (targetRole === "DOSEN") {
      setEmail("dosen.demo@example.com");
      setPassword("Dosen@12345");
    } else {
      setEmail("mahasiswa.demo@example.com");
      setPassword("Mhs@12345");
    }
    setError("");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use NextAuth client-side signIn
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError("Email atau kata sandi tidak cocok. Silakan coba lagi.");
        setLoading(false);
      } else if (result?.ok) {
        // Save preference for session guard
        if (rememberMe) {
          localStorage.setItem("dexa_remember_me", "true");
        } else {
          localStorage.removeItem("dexa_remember_me");
        }
        sessionStorage.setItem("dexa_session_active", "1");

        // Success! Redirect to target or dashboard
        const callbackUrl = searchParams.get("callbackUrl");
        window.location.assign(callbackUrl || "/dashboard");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("Gagal menghubungi server autentikasi. Silakan periksa koneksi Anda.");
=======
    if (params.get("demo") === "true")
      fillDemo(params.get("role")?.toUpperCase() === "DOSEN" ? "DOSEN" : "MAHASISWA");
  }, [params]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", { redirect: false, email, password });
      if (result?.ok) {
        const callback = params.get("callbackUrl");
        window.location.assign(
          callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/dashboard",
        );
      } else {
        setError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
        setLoading(false);
      }
    } catch {
      setError("Tidak dapat menghubungi server. Silakan coba lagi.");
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
      setLoading(false);
    }
  }
  return (
<<<<<<< HEAD
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center space-y-1 pb-2">
        <h2 className="text-2xl font-display font-extrabold text-[#111827] tracking-tight">
          Portal Masuk
        </h2>
        <p className="text-xs text-[#6B7280]">
          Autentikasi aman ke platform akademik SV UNS
        </p>
      </div>

      {/* ─── REGISTRATION SUCCESS BANNER ─── */}
      {registered && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-xs">Pendaftaran Akun Berhasil!</span>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Akun Anda telah terdaftar. Silakan masukkan kata sandi untuk masuk ke Dashboard.
          </p>
        </div>
      )}

      {/* ─── SESSION ENDED / AUTO LOGOUT BANNER ─── */}
      {sessionEnded && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-amber-600 flex-shrink-0" />
            <span className="font-bold text-xs">Sesi Otomatis Berakhir</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Anda telah keluar dari website sebelumnya. Sesi login telah otomatis dibersihkan demi keamanan data akademik Anda. Silakan masuk kembali.
          </p>
        </div>
      )}

      {/* ─── SANDBOX DEMO LOGIN BOX (Soft Mint Container) ─── */}
      <div className="p-4 rounded-3xl bg-[#E2EFE9] border border-[#C5DDD1] space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E4D3B] uppercase tracking-wider">
            <Zap size={15} className="fill-[#1E4D3B]" />
            <span>Sandbox Demo Login</span>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-white text-[#1E4D3B] font-bold shadow-2xs">
            1-Klik Uji
          </span>
        </div>
        <p className="text-xs text-[#374151]">
          Pilih akun simulasi instan untuk menguji fitur Dosen atau Mahasiswa:
        </p>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleFillDemo("DOSEN")}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-white hover:bg-emerald-50 text-xs font-bold text-[#1E4D3B] transition-all shadow-xs cursor-pointer"
          >
            <School size={15} />
            <span>Demo Dosen</span>
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo("MAHASISWA")}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-xs font-bold text-slate-950 transition-all shadow-xs cursor-pointer"
          >
            <User size={15} />
            <span>Demo Mhs</span>
          </button>
        </div>
      </div>

      {/* ─── ROLE TOGGLE ─── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[#6B7280] block uppercase tracking-wider">
          Masuk Sebagai
        </label>
        <div className="flex p-1 bg-[#F3F4F6] rounded-full border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setRole("DOSEN")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              role === "DOSEN"
                ? "bg-[#1E4D3B] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <School size={15} />
            <span>Dosen / Penilai</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("MAHASISWA")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              role === "MAHASISWA"
                ? "bg-[#1E4D3B] text-white shadow-xs"
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

      {/* ─── LOGIN FORM ─── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="email" className="font-bold text-[#111827]">
              Email Kampus Terdaftar
            </label>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              {role === "DOSEN" ? "@staff.uns.ac.id" : "@student.uns.ac.id"}
            </span>
          </div>
=======
    <div>
      <p className="dexa-eyebrow text-primary">Selamat datang kembali</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Masuk ke ruang kerja</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Lanjutkan tugas dan penilaian Anda di Dexa Assessment.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={loading}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@kampus.ac.id"
            className="w-full border px-3 py-3"
          />
        </div>
<<<<<<< HEAD

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="password" className="font-bold text-[#111827]">
              Kata Sandi
            </label>
            <button
              type="button"
              className="text-[#1E4D3B] hover:underline text-[11px] font-semibold"
              onClick={() => alert("Silakan hubungi administrator untuk reset kata sandi.")}
            >
              Lupa sandi?
            </button>
          </div>
          <div className="relative flex items-center">
=======
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Kata sandi
          </label>
          <div className="relative">
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border py-3 pl-3 pr-12"
            />
            <button
              type="button"
<<<<<<< HEAD
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
=======
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={show}
              onClick={() => setShow(!show)}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
<<<<<<< HEAD

        {/* Remember me & Auto-logout preference */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-2">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#1E4D3B] focus:ring-[#1E4D3B]/20 cursor-pointer accent-[#1E4D3B]"
            />
            <label htmlFor="remember-me" className="text-xs text-[#374151] cursor-pointer select-none font-medium">
              Ingat sesi saya di perangkat ini
            </label>
          </div>
          <p className="text-[10px] text-[#6B7280] pl-6 leading-relaxed">
            Jika tidak dicentang, sesi otomatis berakhir ketika Anda keluar dari website demi keamanan akun.
          </p>
        </div>

        {/* Submit Button (Forest Green Pill) */}
=======
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
        <button
          type="submit"
          disabled={loading}
          className="dexa-link dexa-link-primary w-full disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Sedang masuk…
            </>
          ) : (
            <>
              Masuk <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <details className="mt-5 text-sm">
        <summary className="min-h-10 py-2 text-muted-foreground">Lupa kata sandi?</summary>
        <p className="pb-3 text-sm leading-6 text-muted-foreground">
          Hubungi pengelola aplikasi untuk bantuan pemulihan akun. Pemulihan mandiri belum tersedia.
        </p>
      </details>
      <div className="mt-5 border-t pt-6 text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          className="font-semibold text-primary underline underline-offset-4"
          href={`/register?role=${params.get("role")?.toUpperCase() === "MAHASISWA" ? "MAHASISWA" : "DOSEN"}`}
        >
          Daftar sekarang
        </Link>
      </div>
      <details className="mt-6 rounded-lg border bg-muted/40 px-4 text-sm">
        <summary className="py-3 font-medium">Coba akun demo</summary>
        <p className="pb-3 text-xs leading-5 text-muted-foreground">
          Isi kredensial akun contoh, lalu tekan Masuk. Akun demo harus tersedia pada lingkungan
          aplikasi ini.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border bg-card px-3 text-xs font-medium hover:bg-muted"
            type="button"
            onClick={() => fillDemo("DOSEN")}
          >
            Isi demo dosen
          </button>
          <button
            className="rounded-lg border bg-card px-3 text-xs font-medium hover:bg-muted"
            type="button"
            onClick={() => fillDemo("MAHASISWA")}
          >
            Isi demo mahasiswa
          </button>
        </div>
      </details>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Memuat formulir masuk…
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
