"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthAlert, AuthField } from "@/components/auth/auth-field";
import { registerAction } from "@/server/services/auth-actions";
import { cn } from "@/shared/utils";

type Role = "DOSEN" | "MAHASISWA";

const roleOptions: { value: Role; label: string; hint: string }[] = [
  { value: "DOSEN", label: "Dosen", hint: "Membuat kelas, rubrik, dan menilai" },
  { value: "MAHASISWA", label: "Mahasiswa", hint: "Bergabung ke kelas dan mengumpulkan tugas" },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<Role>("DOSEN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = searchParams.get("role")?.toUpperCase();
    if (r === "DOSEN" || r === "MAHASISWA") setRole(r);
  }, [searchParams]);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
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
      const result = await registerAction(formData);
      if (!result.success) {
        setError(result.error ?? "Pendaftaran gagal. Coba lagi.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      const target = `/login?registered=true&email=${encodeURIComponent(email.trim().toLowerCase())}`;
      setTimeout(() => router.push(target), 1200);
    } catch {
      setError("Server tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Buat akun</h2>
        <p className="text-sm text-muted-foreground">Satu akun untuk semua kelas Anda.</p>
      </div>

      {success && (
        <AuthAlert tone="success" title="Akun berhasil dibuat">
          Mengarahkan ke halaman masuk…
        </AuthAlert>
      )}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">Saya mendaftar sebagai</legend>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-sm",
                  role === opt.value
                    ? "border-primary bg-secondary"
                    : "border-input bg-card hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  {opt.label}
                </span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <AuthField
          id="name"
          label="Nama lengkap"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Minimal 6 karakter."
        />
        <AuthField
          id="confirmPassword"
          label="Ulangi kata sandi"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={mismatch ? "Kata sandi belum sama." : undefined}
        />

        <button
          type="submit"
          disabled={loading || success}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {loading ? "Mendaftarkan…" : "Daftar"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
