"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Sparkles,
  School,
  User,
  Zap,
  Lock,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    const demoParam = searchParams.get("demo");

    if (roleParam?.toLowerCase() === "mahasiswa") {
      setRole("MAHASISWA");
      if (demoParam === "true") {
        setEmail("mahasiswa.demo@example.com");
        setPassword("Mhs@12345");
      }
    } else if (roleParam?.toLowerCase() === "dosen") {
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

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      // Use NextAuth client-side signIn for robust redirect and callbackUrl handling
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Email atau kata sandi tidak cocok.");
        setLoading(false);
      } else if (result?.ok) {
        // Success! Redirect to callbackUrl or dashboard
        const callbackUrl = searchParams.get("callbackUrl");
        router.push(callbackUrl || "/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Gagal menghubungi server autentikasi. Silakan coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center space-y-1 pb-2">
        <h2 className="text-2xl font-display font-extrabold text-[#111827] tracking-tight">
          Portal Masuk
        </h2>
        <p className="text-xs text-[#6B7280]">
          Autentikasi aman ke platform akademik SV UNS
        </p>
      </div>

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
            className="w-full px-4 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:ring-2 focus:ring-[#1E4D3B]/20 transition-all shadow-xs"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="password" className="font-bold text-[#111827]">
              Kata Sandi
            </label>
            <button
              type="button"
              className="text-[#1E4D3B] hover:underline text-[11px] font-semibold"
              onClick={() => alert("Silakan hubungi administrator IT Sekolah Vokasi UNS untuk reset kata sandi.")}
            >
              Lupa sandi?
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-4 pr-11 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] focus:ring-2 focus:ring-[#1E4D3B]/20 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="remember-me"
            type="checkbox"
            defaultChecked
            className="w-4 h-4 rounded text-[#1E4D3B] focus:ring-[#1E4D3B]/20 cursor-pointer"
          />
          <label htmlFor="remember-me" className="text-xs text-[#4B5563] cursor-pointer select-none">
            Ingat sesi saya di perangkat ini
          </label>
        </div>

        {/* Submit Button (Forest Green Pill) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 mt-2 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-70 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Mengautentikasi Sesi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Portal Akademik</span>
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5E7EB]" />
        </div>
        <span className="relative px-3 bg-white text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider font-semibold">
          atau masuk via
        </span>
      </div>

      {/* SSO Campus Integration */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => alert("SSO Google Workspace UNS terintegrasi. Silakan masuk via form di atas untuk demo.")}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-bold text-[#374151] transition cursor-pointer"
        >
          <Building2 size={15} className="text-[#1E4D3B]" />
          <span>Workspace UNS</span>
        </button>
        <button
          type="button"
          onClick={() => alert("SSO Akademik UNS terintegrasi. Silakan masuk via form di atas untuk demo.")}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-bold text-[#374151] transition cursor-pointer"
        >
          <School size={15} className="text-[#F59E0B]" />
          <span>SSO Akademik</span>
        </button>
      </div>

      {/* Security badge */}
      <div className="pt-2 flex items-center justify-center gap-1.5 text-center text-[#6B7280] font-mono text-[10px]">
        <Lock size={12} className="text-emerald-600" />
        <span>256-bit Enkripsi Akademik & AI Safety Guardrails</span>
      </div>

      <div className="text-center pt-1">
        <Link href="/register" className="text-xs font-medium text-[#4B5563] hover:text-[#1E4D3B] transition-colors">
          Belum punya akun? <strong className="text-[#1E4D3B] underline underline-offset-4">Daftar sekarang</strong>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center flex flex-col items-center justify-center space-y-4"><Loader2 size={32} className="animate-spin text-[#1E4D3B]" /><span className="text-xs font-mono text-[#6B7280]">Memuat Portal Masuk...</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
