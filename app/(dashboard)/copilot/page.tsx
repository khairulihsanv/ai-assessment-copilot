import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Bot, Sparkles, Send, BookOpen, Lightbulb, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "AI Study Copilot — AI Assessment Copilot",
};

export default async function CopilotPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6 pb-12 max-w-4xl animate-in fade-in-50 duration-300">
      <div className="pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
            AI Study Copilot Beta
          </span>
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Asisten Akademik Cerdas
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
          <Bot className="text-[#1E4D3B]" size={28} />
          <span>AI Study Copilot</span>
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Tanyakan penjelasan rubrik penilaian, rekomendasi referensi akademik, atau analisis draf tugas Anda sebelum dikumpulkan.
        </p>
      </div>

      {/* Suggested Prompts (Triad Accents) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs space-y-2 cursor-pointer hover:border-[#F59E0B] transition-all">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#F59E0B]">
            <Lightbulb size={16} />
            <span>Klarifikasi Rubrik</span>
          </div>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            “Apa yang dimaksud dengan kondisi double-black pada Red-Black Tree?”
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs space-y-2 cursor-pointer hover:border-[#2563EB] transition-all">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
            <BookOpen size={16} />
            <span>Referensi Capstone</span>
          </div>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            “Berikan rekomendasi paper IEEE terkini seputar microservices caching.”
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs space-y-2 cursor-pointer hover:border-[#8B5CF6] transition-all">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#8B5CF6]">
            <CheckCircle2 size={16} />
            <span>Simulasi Pre-check</span>
          </div>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            “Apakah struktur kode saya sudah mematuhi kaidah OOP dan naming standar?”
          </p>
        </div>
      </div>

      {/* Chat Container (Warm Cream Dribbble Container #F4F3ED) */}
      <div className="bg-[#F4F3ED] rounded-3xl border border-[#E5E3D8] shadow-xs p-6 space-y-5">
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot size={20} className="text-[#FFA07A]" />
            </div>
            <div className="p-4 rounded-3xl bg-white text-xs text-[#111827] max-w-xl leading-relaxed border border-[#E5E3D8] shadow-2xs">
              Halo <strong className="text-[#1E4D3B]">{session.user.name}</strong>! Saya adalah asisten AI Study Copilot Anda. Saya dapat membantu menganalisis kesesuaian draft jawaban Anda terhadap rubrik dosen sebelum pengumpulan akhir. Silakan ketik pertanyaan atau lampirkan draft Anda.
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E3D8] flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Tanyakan konsep algoritma, kriteria rubrik, atau saran perbaikan..."
            className="flex-1 px-4 py-3 rounded-full bg-white border border-[#E5E3D8] text-xs font-sans text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] transition-all"
          />
          <button
            type="button"
            className="p-3 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
