import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { AppearancePreferences } from "@/components/features/appearance-preferences";
import { auth } from "@/server/auth/auth";

export const metadata = { title: "Pengaturan Akun — AI Assessment Copilot" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isDosen = session.user.role === "DOSEN";
  const unavailablePreferences = isDosen
    ? [
        "Notifikasi penyerahan tugas baru",
        "Preferensi peringatan confidence AI",
        "Sinkronisasi SIAKAD",
      ]
    : ["Notifikasi tugas dan nilai", "Sinkronisasi SIAKAD"];

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Akun Anda</p>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          <Settings className="shrink-0 text-primary" size={26} />
          Pengaturan Akun
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informasi profil dan tampilan ruang kerja Anda.
        </p>
      </div>
      <section
        aria-label="Profil akun"
        className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-secondary-foreground"
        >
          {session.user.name?.slice(0, 2).toUpperCase() || "US"}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{session.user.name}</h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">{session.user.email}</p>
          <p className="mt-2 text-xs font-medium text-primary">{isDosen ? "Dosen" : "Mahasiswa"}</p>
        </div>
      </section>
      <AppearancePreferences />
      <section
        aria-labelledby="other-preferences-heading"
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="other-preferences-heading" className="text-lg font-semibold text-foreground">
          Preferensi lainnya
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pengaturan berikut belum tersedia untuk diubah.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {unavailablePreferences.map((label) => (
            <li
              key={label}
              className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm"
            >
              <span className="text-foreground">{label}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Belum tersedia
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
