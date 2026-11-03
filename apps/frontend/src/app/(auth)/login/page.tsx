"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthAlert, AuthField } from "@/components/auth/auth-field";
import { getErrorMessage } from "@/shared/utils/api-error";

const DEMO = {
  DOSEN: { email: "dosen.demo@example.com", password: "Dosen@12345" },
  MAHASISWA: { email: "mahasiswa.demo@example.com", password: "Mhs@12345" },
} as const;

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const sessionEnded = searchParams.get("reason") === "session_ended";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error"))
      setError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
    const role = searchParams.get("role")?.toUpperCase();
    if (searchParams.get("demo") === "true" && (role === "DOSEN" || role === "MAHASISWA")) {
      setEmail(DEMO[role].email);
      setPassword(DEMO[role].password);
    }
  }, [searchParams]);

  const fillDemo = (role: keyof typeof DEMO) => {
    setEmail(DEMO[role].email);
    setPassword(DEMO[role].password);
    setError("");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(getErrorMessage(data, "Email atau kata sandi tidak cocok. Silakan coba lagi."));
        setLoading(false);
        return;
      }
      if (rememberMe) localStorage.setItem("dexa_remember_me", "true");
      else localStorage.removeItem("dexa_remember_me");
      sessionStorage.setItem("dexa_session_active", "1");

      const callbackUrl = searchParams.get("callbackUrl");
      const safe =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//") &&
        !callbackUrl.includes(":");
      window.location.assign(safe ? callbackUrl : "/dashboard");
    } catch {
      setError("Server tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Masuk ke ruang kerja</h2>
        <p className="text-sm text-muted-foreground">
          Gunakan email dan kata sandi akun Dexa Anda.
        </p>
      </div>

      {registered && (
        <AuthAlert tone="success" title="Akun berhasil dibuat">
          Masukkan kata sandi Anda untuk masuk.
        </AuthAlert>
      )}
      {sessionEnded && (
        <AuthAlert tone="info" title="Sesi berakhir">
          Anda keluar dari sesi sebelumnya. Silakan masuk kembali.
        </AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@kampus.ac.id"
        />
        <AuthField
          id="password"
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Lupa kata sandi? Hubungi admin program studi untuk mengatur ulang."
        />

        <label htmlFor="remember-me" className="flex items-start gap-2.5 text-sm">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            Ingat saya di perangkat ini
            <span className="block text-xs text-muted-foreground">
              Jika tidak dicentang, sesi berakhir saat tab ditutup.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {loading ? "Memeriksa…" : "Masuk"}
        </button>
      </form>

      <div className="space-y-2 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">
          Akun demo (opsional, hanya tersedia jika data demo dipasang di server):
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemo("DOSEN")}
            className="dexa-link min-h-10 px-3 py-2 text-sm"
          >
            Isi akun dosen
          </button>
          <button
            type="button"
            onClick={() => fillDemo("MAHASISWA")}
            className="dexa-link min-h-10 px-3 py-2 text-sm"
          >
            Isi akun mahasiswa
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-primary underline underline-offset-4">
          Daftar
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
