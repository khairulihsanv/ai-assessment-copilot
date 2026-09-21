"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, Loader2, GraduationCap, BookOpen } from "lucide-react";
import { registerAction } from "@/lib/actions/auth-actions";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await registerAction(formData);
      if (!result.success) {
        setError(result.error ?? "Terjadi kesalahan saat mendaftar");
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Pastikan koneksi database aktif.");
      setLoading(false);
    }
  }

  return (
    <div className="animate-[fade-in_0.3s_ease-out]">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-primary-500)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="font-display text-xl font-bold" style={{ color: "var(--text-primary)" }}>Dexa Assessment</span>
      </div>

      <h2 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Daftar Akun
      </h2>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Buat akun baru untuk mulai menggunakan platform
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-lg text-sm font-medium"
          style={{ background: "oklch(0.95 0.05 25)", color: "var(--color-danger-600)", border: "1px solid oklch(0.85 0.1 25)" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Daftar Sebagai
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole("DOSEN")}
              className="p-4 rounded-xl text-left transition-all duration-200 border-2"
              style={{
                borderColor: selectedRole === "DOSEN" ? "var(--color-primary-500)" : "var(--border)",
                background: selectedRole === "DOSEN" ? "var(--color-primary-50)" : "var(--input-bg)",
              }}
            >
              <GraduationCap size={24} className="mb-2" style={{ color: selectedRole === "DOSEN" ? "var(--color-primary-500)" : "var(--text-muted)" }} />
              <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Dosen</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Buat kelas & nilai tugas</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("MAHASISWA")}
              className="p-4 rounded-xl text-left transition-all duration-200 border-2"
              style={{
                borderColor: selectedRole === "MAHASISWA" ? "var(--color-primary-500)" : "var(--border)",
                background: selectedRole === "MAHASISWA" ? "var(--color-primary-50)" : "var(--input-bg)",
              }}
            >
              <BookOpen size={24} className="mb-2" style={{ color: selectedRole === "MAHASISWA" ? "var(--color-primary-500)" : "var(--text-muted)" }} />
              <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Mahasiswa</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Gabung kelas & submit tugas</div>
            </button>
          </div>
          <input type="hidden" name="role" value={selectedRole} />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Nama Lengkap
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Nama lengkap Anda"
            className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
            style={{
              background: "var(--input-bg)",
              border: "1.5px solid var(--input-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="email@contoh.com"
            className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
            style={{
              background: "var(--input-bg)",
              border: "1.5px solid var(--input-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Minimal 8 karakter, huruf kapital, angka, & simbol"
              className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none pr-12"
              style={{
                background: "var(--input-bg)",
                border: "1.5px solid var(--input-border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Konfirmasi Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            placeholder="Ulangi password Anda"
            className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
            style={{
              background: "var(--input-bg)",
              border: "1.5px solid var(--input-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedRole}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--color-primary-500)" }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <UserPlus size={18} />
          )}
          {loading ? "Membuat akun..." : "Daftar"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--color-primary-500)" }}>
          Masuk
        </Link>
      </p>
    </div>
  );
}
