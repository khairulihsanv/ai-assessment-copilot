"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { registerAction } from "@/lib/actions/auth-actions";
import { signIn } from "next-auth/react";
function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<"DOSEN" | "MAHASISWA">("DOSEN");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRole(params.get("role")?.toUpperCase() === "MAHASISWA" ? "MAHASISWA" : "DOSEN");
  }, [params]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    data.set("role", role);
    try {
      const result = await registerAction(data);
      if (!result.success) {
        setError(result.error || "Pendaftaran belum berhasil.");
        setLoading(false);
        return;
      }
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
      setLoading(false);
    }
  }
  return (
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
          </div>
          <p id="password-hint" className="mt-2 text-xs leading-5 text-muted-foreground">
            Minimal 8 karakter, termasuk huruf kapital, angka, dan simbol.
          </p>
        </div>
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
