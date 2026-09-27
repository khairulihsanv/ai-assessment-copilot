import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Settings, User, Shield, Bell, Key, Save } from "lucide-react";

export const metadata = {
  title: "Pengaturan Akun — AI Assessment Copilot",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isDosen = session.user.role === "DOSEN";

  return (
    <div className="space-y-6 pb-12 max-w-4xl animate-in fade-in-50 duration-300">
      <div className="pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
            Preferensi Sistem
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
          <Settings className="text-[#1E4D3B]" size={28} />
          <span>Pengaturan Akun & Preferensi Evaluasi</span>
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Kelola profil pengguna, notifikasi evaluasi, dan konfigurasi AI Safety Guardrails
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-7 space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-[#F3F4F6]">
          <div className="w-14 h-14 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center font-display text-xl font-extrabold shadow-2xs">
            {session.user.name?.slice(0, 2).toUpperCase() || "US"}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827]">
              {session.user.name}
            </h2>
            <p className="text-xs text-[#6B7280] font-mono">{session.user.email}</p>
            <span className="font-mono text-[10px] font-bold px-3 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B] mt-1.5 inline-block">
              {isDosen ? "Peran: Dosen Pengampu / Penilai" : "Peran: Mahasiswa Vokasi"}
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <h3 className="font-display text-sm font-extrabold text-[#111827]">
            Preferensi Evaluasi & Notifikasi
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#C5DDD1] transition-all cursor-pointer">
              <div>
                <span className="font-bold text-[#111827] block">Notifikasi Penyerahan Tugas Baru</span>
                <span className="text-xs text-[#6B7280]">Dapatkan notifikasi saat mahasiswa mengumpulkan berkas tugas</span>
              </div>
              <input type="checkbox" defaultChecked className="rounded accent-[#1E4D3B] w-4 h-4 cursor-pointer" />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#C5DDD1] transition-all cursor-pointer">
              <div>
                <span className="font-bold text-[#111827]">Human-in-the-Loop AI Confidence Warning</span>
                <span className="text-xs text-[#6B7280]">Tandai tugas yang memiliki skor confidence AI di bawah 85%</span>
              </div>
              <input type="checkbox" defaultChecked className="rounded accent-[#1E4D3B] w-4 h-4 cursor-pointer" />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#C5DDD1] transition-all cursor-pointer">
              <div>
                <span className="font-bold text-[#111827]">Koneksi SIAKAD UNS Terintegrasi</span>
                <span className="text-xs text-[#6B7280]">Sinkronisasi rekap nilai resmi otomatis ke portal universitas</span>
              </div>
              <input type="checkbox" defaultChecked className="rounded accent-[#1E4D3B] w-4 h-4 cursor-pointer" />
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <Save size={15} />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
