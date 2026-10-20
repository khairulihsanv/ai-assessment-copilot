import { BookOpen, Bot, CheckCircle2, Lightbulb, Send } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

export const metadata = {
  title: "AI Study Copilot — AI Assessment Copilot",
};

export default async function CopilotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6 pb-12 max-w-4xl animate-in fade-in-50 duration-300">
      <div className="pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Fitur Dalam Pengembangan — Belum Tersedia
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mt-1.5 flex items-center gap-2.5">
          <Bot className="text-primary" size={28} />
          <span>AI Study Copilot</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Asisten interaktif untuk konsultasi rubrik dan draf tugas (fitur ini sedang dalam
          pengembangan dan belum tersedia).
        </p>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-lg bg-secondary/50 border border-border text-secondary-foreground text-xs flex items-center gap-3">
        <Bot size={20} className="text-primary flex-shrink-0" />
        <div>
          <strong className="block font-semibold">Layanan Chat Interaktif Belum Tersedia</strong>
          <span>
            Fitur percakapan interaktif Study Copilot saat ini masih dalam pengembangan dan
            berstatus belum tersedia. Silakan gunakan fitur evaluasi tugas dan koreksi rubrik yang
            telah berjalan penuh di kelas Anda.
          </span>
        </div>
      </div>

      {/* Suggested Prompts (Preview Only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-75">
        <div className="p-5 rounded-xl bg-card border border-border shadow-none space-y-2 cursor-not-allowed">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Lightbulb size={16} />
            <span>Klarifikasi Rubrik (Preview)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            “Apa yang dimaksud dengan kondisi double-black pada Red-Black Tree?”
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border shadow-none space-y-2 cursor-not-allowed">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <BookOpen size={16} />
            <span>Referensi Capstone (Preview)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            “Berikan rekomendasi paper IEEE terkini seputar microservices caching.”
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border shadow-none space-y-2 cursor-not-allowed">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <CheckCircle2 size={16} />
            <span>Simulasi Pre-check (Preview)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            “Apakah struktur kode saya sudah mematuhi kaidah OOP dan naming standar?”
          </p>
        </div>
      </div>

      {/* Chat Container (Disabled state) */}
      <div className="bg-secondary/40 rounded-xl border border-border shadow-none p-6 space-y-5">
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-none">
              <Bot size={20} />
            </div>
            <div className="p-4 rounded-xl bg-card text-xs text-foreground max-w-xl leading-relaxed border border-border shadow-none">
              Halo <strong className="text-primary">{session.user.name}</strong>! Fitur percakapan
              Study Copilot saat ini sedang dalam proses pengembangan. Antarmuka chat interaktif
              belum terhubung ke model tutor dan dinonaktifkan untuk sementara waktu.
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center gap-2.5 opacity-60">
          <input
            type="text"
            disabled
            placeholder="Layanan chat Study Copilot belum tersedia..."
            className="min-w-0 flex-1 px-4 py-3 rounded-full bg-muted border border-border text-xs font-sans text-muted-foreground cursor-not-allowed focus:outline-none"
          />
          <button
            type="button"
            disabled
            title="Chat belum tersedia"
            className="p-3 rounded-full bg-muted text-muted-foreground shadow-none cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
