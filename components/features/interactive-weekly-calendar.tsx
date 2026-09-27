"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Check } from "lucide-react";

export function InteractiveWeeklyCalendar() {
  const [viewMode, setViewMode] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [selectedDay, setSelectedDay] = useState(27);

  const days = [
    { name: "Mon", date: 22 },
    { name: "Tue", date: 23 },
    { name: "Wed", date: 24 },
    { name: "Thu", date: 25 },
    { name: "Fri", date: 26 },
    { name: "Sat", date: 27 },
    { name: "Sun", date: 28 },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
      {/* Top Segmented Tab (Weekly / Monthly) */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 rounded-full bg-[#F3F4F6] border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setViewMode("WEEKLY")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === "WEEKLY"
                ? "bg-[#1E4D3B] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setViewMode("MONTHLY")}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === "MONTHLY"
                ? "bg-[#1E4D3B] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Date Month & Arrows */}
        <div className="flex items-center gap-1.5">
          <span className="font-display font-extrabold text-sm text-[#111827]">
            September {selectedDay}
          </span>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setSelectedDay((prev) => Math.max(22, prev - 1))}
              className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay((prev) => Math.min(28, prev + 1))}
              className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Horizontal Strip (Mint Container #E2EFE9) */}
      <div className="bg-[#E2EFE9] p-1.5 rounded-2xl grid grid-cols-7 gap-1">
        {days.map((item) => {
          const isActive = item.date === selectedDay;
          return (
            <button
              key={item.date}
              type="button"
              onClick={() => setSelectedDay(item.date)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-[#1E4D3B] shadow-xs font-extrabold ring-1 ring-[#1E4D3B]/20"
                  : "text-[#374151] hover:bg-white/40 font-medium"
              }`}
            >
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">
                {item.name}
              </span>
              <span className="text-xs font-display font-bold mt-0.5">{item.date}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-[#1E4D3B] mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Schedule Items for Selected Day */}
      <div className="space-y-2 pt-1">
        <div className="p-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#1E4D3B]" />
            <div>
              <div className="font-bold text-[#111827]">CS 304 • Kuliah & Responsif AI</div>
              <div className="text-[10px] text-[#6B7280]">08:00 - 10:30 WIB • Lab Komputasi 2</div>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#1E4D3B] bg-[#E2EFE9] px-2 py-0.5 rounded-full">
            Hari ini
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <div>
              <div className="font-bold text-[#111827]">Batas Kumpul: Proyek Desain Token</div>
              <div className="text-[10px] text-[#6B7280]">23:59 WIB • 34 Submisi Masuk</div>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
            Deadline
          </span>
        </div>
      </div>

      {/* Quick Action Pill Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => alert("Catatan Kuliah: Menambahkan catatan pengingat ke agenda.")}
          className="flex-1 py-2.5 px-3 rounded-full border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#374151] font-bold text-xs transition cursor-pointer text-center"
        >
          Add a note
        </button>
        <button
          type="button"
          onClick={() => alert("Agenda Baru: Formulir sinkronisasi jadwal perkuliahan dibuka.")}
          className="flex-1 py-2.5 px-3 rounded-full bg-[#1E4D3B] hover:bg-[#16382B] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>New event</span>
        </button>
      </div>
    </div>
  );
}
