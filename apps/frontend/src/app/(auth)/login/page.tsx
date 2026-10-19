"use client";

import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fillDemo = useCallback((nextRole: "DOSEN" | "MAHASISWA") => {
    setRole(nextRole);
    setEmail(nextRole === "DOSEN" ? "dosen.demo@example.com" : "mahasiswa.demo@example.com");
    setPassword(nextRole === "DOSEN" ? "Dosen@12345" : "Mhs@12345");
    setError("");
  }, []);
  useEffect(() => {
    const nextRole = params.get("role")?.toUpperCase() === "MAHASISWA" ? "MAHASISWA" : "DOSEN";
    setRole(nextRole);
    if (params.get("demo") === "true") fillDemo(nextRole);
    if (params.get("email")) setEmail(params.get("email") || "");
    if (params.get("error"))
      setError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
  }, [params, fillDemo]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setError(data.error || "Email atau kata sandi tidak cocok. Silakan coba lagi.");
        setLoading(false);
        return;
      }
      if (rememberMe) localStorage.setItem("dexa_remember_me", "true");
      else localStorage.removeItem("dexa_remember_me");
      sessionStorage.setItem("dexa_session_active", "1");
      const callback = params.get("callbackUrl");
      window.location.assign(
        callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/dashboard",
      );
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi Anda dan coba lagi.");
      setLoading(false);
    }
  }
  const input =
    "w-full rounded-lg border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/60";
  return (
    <div className="auth-form space-y-6">
      <header>
        <p className="workspace-eyebrow">RUANG MENGAJAR & BELAJAR</p>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">
          Selamat datang kembali.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Masuk untuk melanjutkan aktivitas kelas Anda.
        </p>
      </header>
      {params.get("registered") === "true" && (
        <p
          role="status"
          className="rounded-lg border bg-secondary p-3 text-sm text-secondary-foreground"
        >
          Akun berhasil dibuat. Silakan masuk.
        </p>
      )}
      {params.get("reason") === "session_ended" && (
        <p
          role="status"
          className="rounded-lg border bg-secondary p-3 text-sm text-secondary-foreground"
        >
          Sesi sebelumnya telah berakhir. Silakan masuk kembali.
        </p>
      )}
      <fieldset>
        <legend className="mb-2 text-xs font-medium">Ruang Anda</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted p-1">
          {(
            [
              ["DOSEN", "Dosen"],
              ["MAHASISWA", "Mahasiswa"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={`rounded-md px-4 py-2.5 text-xs font-medium ${role === value ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-medium">
            Alamat email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@kampus.ac.id"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-xs font-medium">
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <label className="flex min-h-6 items-center gap-2.5 text-xs text-muted-foreground">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Ingat sesi saya di perangkat ini
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Masuk ke ruang {role === "DOSEN" ? "mengajar" : "belajar"}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Baru di Dexa?{" "}
        <Link
          href={`/register?role=${role}`}
          className="font-semibold text-primary underline underline-offset-4"
        >
          Buat akun
        </Link>
      </p>
      <details className="rounded-lg border bg-card px-4 py-3">
        <summary className="text-xs font-medium text-muted-foreground">
          Ingin mencoba akun demo?
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Isi kredensial akun contoh. Akun harus sudah tersedia di server.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillDemo("DOSEN")}
            className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
          >
            Demo Dosen
          </button>
          <button
            type="button"
            onClick={() => fillDemo("MAHASISWA")}
            className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
          >
            Demo Mahasiswa
          </button>
        </div>
      </details>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat halaman masuk...</p>}>
      <LoginForm />
    </Suspense>
  );
}
