"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/actions/auth-actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await loginAction(formData);
      if (!result.success) {
        setError(result.error ?? "Terjadi kesalahan");
        setLoading(false);
      }
      // If success, loginAction calls redirect() which throws NEXT_REDIRECT
    } catch (err) {
      // NEXT_REDIRECT throws an error — that's expected behavior
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        router.push("/dashboard");
        return;
      }
      setError("Terjadi kesalahan. Silakan coba lagi.");
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
        <span className="font-display text-xl font-bold text-primary-content">AI Assessment Copilot</span>
      </div>

      <h2 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Masuk
      </h2>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Masuk ke akun Anda untuk melanjutkan
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-lg text-sm font-medium"
          style={{ background: "oklch(0.95 0.05 25)", color: "var(--color-danger-600)", border: "1px solid oklch(0.85 0.1 25)" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="Minimal 6 karakter"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--color-primary-500)" }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <LogIn size={18} />
          )}
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold hover:underline" style={{ color: "var(--color-primary-500)" }}>
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
