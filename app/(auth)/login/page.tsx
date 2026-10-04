"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function fillDemo(role: string) {
    setEmail(role === "DOSEN" ? "dosen.demo@example.com" : "mahasiswa.demo@example.com");
    setPassword(role === "DOSEN" ? "Dosen@12345" : "Mhs@12345");
    setError("");
  }
  useEffect(() => {
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
      setLoading(false);
    }
  }
  return (
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
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Kata sandi
          </label>
          <div className="relative">
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
              aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={show}
              onClick={() => setShow(!show)}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
