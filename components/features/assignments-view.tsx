"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  FileCheck,
  ChevronRight,
  ArrowRight,
  Download,
  Trash2,
  Sliders,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface AssignmentsViewProps {
  role: "DOSEN" | "MAHASISWA";
  classes?: any[];
  rubrics?: any[];
  enrollments?: any[];
  userId: string;
}

export function AssignmentsView({
  role,
  classes = [],
  rubrics = [],
  enrollments = [],
}: AssignmentsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ALL" | "NEED_GRADE" | "ACTIVE" | "ARCHIVED">("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New assignment modal form state
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || "");
  const [newTitle, setNewTitle] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newMaxScore, setNewMaxScore] = useState(100);
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [selectedRubricId, setSelectedRubricId] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Flatten all assignments across classes for Dosen
  const allDosenAssignments = classes.flatMap((c) =>
    (c.assignments || []).map((a: any) => ({
      ...a,
      classId: c.id,
      className: c.name,
      classSubject: c.subject,
      totalStudents: c._count.enrollments || 30,
      submittedCount: a._count?.submissions || 0,
    }))
  );

  // Filter assignments
  const filteredAssignments = allDosenAssignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.className.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedClassFilter !== "ALL" && a.classId !== selectedClassFilter) {
      return false;
    }

    if (activeTab === "NEED_GRADE") return (a.submittedCount || 0) > 0;
    if (activeTab === "ACTIVE") return a.status === "PUBLISHED";
    if (activeTab === "ARCHIVED") return a.status === "ARCHIVED" || a.status === "CLOSED";
    return true;
  });

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !newTitle.trim()) {
      alert("Pilih kelas dan isi judul tugas.");
      return;
    }

    setIsSubmittingTask(true);
    try {
      const res = await fetch(`/api/classes/${selectedClassId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          instructions: newInstructions || "Tugas akademik terstruktur.",
          dueDate: newDueDate,
          maxScore: Number(newMaxScore),
          rubricId: selectedRubricId || undefined,
          status: "PUBLISHED",
          submissionType: "ANY",
        }),
      });

      if (res.ok) {
        alert("Tugas baru berhasil dibuat & dipublikasikan ke mahasiswa!");
        setShowCreateModal(false);
        setNewTitle("");
        setNewInstructions("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal membuat tugas.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // ==========================================
  // VIEW: MAHASISWA
  // ==========================================
  if (role === "MAHASISWA") {
    const studentTasks = enrollments.flatMap((e: any) =>
      (e.class.assignments || []).map((a: any) => ({
        ...a,
        className: e.class.name,
        subject: e.class.subject,
        mySubmission: a.submissions?.[0],
      }))
    );

    const filteredStudentTasks = studentTasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.className.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "NEED_GRADE") return !t.mySubmission;
      if (activeTab === "ACTIVE") return t.mySubmission && !t.mySubmission.grade;
      if (activeTab === "ARCHIVED") return t.mySubmission?.grade;
      return true;
    });

    return (
      <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2EFE9] border border-[#C5DDD1] mb-2 text-[#1E4D3B]">
              <BookOpen size={13} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                Portal Pembelajaran Mahasiswa
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827]">
              Tugas & Penugasan Akademik
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
              Pantau seluruh tugas terbit dari kelas perkuliahan Anda, kumpulkan berkas, dan lihat evaluasi AI dosen.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Cari tugas atau mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E4D3B] shadow-xs"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ALL"
                ? "bg-[#1E4D3B] text-white shadow-xs"
                : "bg-white text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            }`}
          >
            <span>Semua</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {studentTasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NEED_GRADE")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "NEED_GRADE"
                ? "bg-[#DC2626] text-white shadow-xs"
                : "bg-white text-[#4B5563] hover:bg-rose-50 border border-[#E5E7EB]"
            }`}
          >
            <span>Belum Kumpul</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {studentTasks.filter((t) => !t.mySubmission).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ACTIVE"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-white text-[#4B5563] hover:bg-blue-50 border border-[#E5E7EB]"
            }`}
          >
            <span>Menunggu Penilaian</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {studentTasks.filter((t) => t.mySubmission && !t.mySubmission.grade).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ARCHIVED")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ARCHIVED"
                ? "bg-[#10B981] text-white shadow-xs"
                : "bg-white text-[#4B5563] hover:bg-emerald-50 border border-[#E5E7EB]"
            }`}
          >
            <span>Sudah Dinilai</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {studentTasks.filter((t) => t.mySubmission?.grade).length}
            </span>
          </button>
        </div>

        {/* Task Cards Grid */}
        {filteredStudentTasks.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-[#E5E7EB] space-y-3">
            <FileText size={36} className="mx-auto text-[#9CA3AF]" />
            <h3 className="font-display text-base font-bold text-[#111827]">
              Tidak Ada Tugas Ditemukan
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Tidak ada tugas yang sesuai dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudentTasks.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                      {t.className}
                    </span>
                    <span className="text-[11px] font-mono text-[#6B7280]">
                      Maks {t.maxScore} Poin
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#111827] group-hover:text-[#1E4D3B] transition line-clamp-2">
                    {t.title}
                  </h3>
                  <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                    {t.instructions || "Tugas akademik terstruktur."}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                  <div className="text-[11px] font-mono text-[#6B7280]">
                    {t.mySubmission ? (
                      t.mySubmission.grade ? (
                        <span className="font-bold text-[#10B981]">
                          Nilai: {t.mySubmission.grade.finalScore} / {t.maxScore}
                        </span>
                      ) : (
                        <span className="text-[#2563EB] font-bold">Menunggu Review</span>
                      )
                    ) : (
                      <span className="text-[#DC2626] font-bold">Belum Kumpul</span>
                    )}
                  </div>

                  <Link
                    href={`/classes/${t.classId}/assignments/${t.id}`}
                    className="px-4 py-2 rounded-full bg-[#1E4D3B] text-white text-xs font-bold hover:bg-[#15392C] transition"
                  >
                    {t.mySubmission ? "Lihat Evaluasi" : "Kumpulkan"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: DOSEN (Faculty Classwork Hub)
  // ==========================================
  const totalSubmissions = allDosenAssignments.reduce(
    (sum, a) => sum + (a.submittedCount || 0),
    0
  );
  const totalNeedingGrade = allDosenAssignments.filter((a) => (a.submittedCount || 0) > 0).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ─── 1. TOP HEADER & ACTIONS ─── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B] border border-[#C5DDD1] mb-2">
            <Sparkles size={13} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
              Faculty Classwork Hub
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827]">
            Manajemen Tugas & Evaluasi Kelas
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
            Pantau status pengumpulan seluruh kelas, kelola tugas, dan validasi evaluasi AI tanpa kerumitan tabel padat.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <Link
            href="/rubrics"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#1E4D3B] text-xs font-bold rounded-full hover:bg-[#F9FAFB] transition shadow-xs cursor-pointer"
          >
            <Layers size={14} />
            <span>Kelola Rubrik ({rubrics.length})</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#1E4D3B] text-white text-xs font-extrabold rounded-full hover:bg-[#15392C] shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Buat Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* ─── 2. QUICK METRIC STRIP (Amber, Blue, Purple, Green Cards) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] block">Total Tugas</span>
            <span className="font-display text-2xl font-extrabold text-[#111827]">
              {allDosenAssignments.length}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] block">Perlu Review</span>
            <span className="font-display text-2xl font-extrabold text-[#7C3AED]">
              {totalNeedingGrade}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] block">Submisi Masuk</span>
            <span className="font-display text-2xl font-extrabold text-[#D97706]">
              {totalSubmissions}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#6B7280] block">Auto-Grader AI</span>
            <span className="font-mono text-xs font-bold text-[#2563EB] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Siap Evaluasi
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. SEARCH & CLASS FILTER BAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Cari judul tugas atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] text-[#111827] placeholder:text-[#9CA3AF] text-xs font-medium rounded-full border border-[#E5E7EB] focus:outline-none focus:border-[#1E4D3B] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {classes.length > 1 && (
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-4 py-2 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#1E4D3B] cursor-pointer"
            >
              <option value="ALL">Semua Kelas Kuliah</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center p-1 bg-[#F3F4F6] rounded-full border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-[#1E4D3B] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Semua ({allDosenAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("NEED_GRADE")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "NEED_GRADE"
                  ? "bg-[#DC2626] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#DC2626]"
              }`}
            >
              <span>Perlu Dinilai</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {totalNeedingGrade}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === "ACTIVE"
                  ? "bg-[#1E4D3B] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Aktif
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. CARD GRID ─── */}
      {filteredAssignments.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-[#E5E7EB] space-y-3">
          <FileText size={40} className="mx-auto text-[#9CA3AF]" />
          <h3 className="font-display text-lg font-bold text-[#111827]">
            Belum Ada Tugas Ditampilkan
          </h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Buat tugas baru untuk kelas perkuliahan Anda dan tentukan rubrik evaluasi yang diinginkan.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1E4D3B] text-white text-xs font-bold hover:bg-[#15392C] shadow-xs transition"
          >
            <Plus size={15} />
            <span>Buat Tugas Baru Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((asmt) => {
            const due = new Date(asmt.dueDate);
            const isPastDue = due.getTime() < Date.now();
            const submissionPercent =
              asmt.totalStudents > 0
                ? Math.round((asmt.submittedCount / asmt.totalStudents) * 100)
                : 0;

            return (
              <div
                key={asmt.id}
                className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-6 space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B] truncate">
                      {asmt.className}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isPastDue
                          ? "bg-rose-100 text-rose-700"
                          : "bg-[#F3F4F6] text-[#4B5563]"
                      }`}
                    >
                      <Clock size={11} />
                      {isPastDue ? "Tenggat Berakhir" : formatRelativeTime(asmt.dueDate)}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-[#111827] group-hover:text-[#1E4D3B] transition line-clamp-2">
                    {asmt.title}
                  </h3>

                  <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                    {asmt.instructions || "Tugas perkuliahan terstruktur dengan panduan rubrik terstandarisasi."}
                  </p>
                </div>

                {/* Submission Progress Bar */}
                <div className="p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#4B5563] font-medium flex items-center gap-1.5">
                      <Users size={13} className="text-[#6B7280]" />
                      <span>Pengumpulan</span>
                    </span>
                    <span className="font-mono font-bold text-[#111827]">
                      {asmt.submittedCount} / {asmt.totalStudents} Mhs ({submissionPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-[#1E4D3B] transition-all"
                      style={{ width: `${Math.min(submissionPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280]">
                    <span>Maks {asmt.maxScore} Poin</span>
                    <span className="text-[#1E4D3B] font-semibold truncate max-w-[160px]">
                      {asmt.rubric?.title ? `Rubrik: ${asmt.rubric.title}` : "Rubrik Bawaan"}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                  <Link
                    href={`/classes/${asmt.classId}/assignments/${asmt.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-[#1E4D3B] text-white text-xs font-bold hover:bg-[#15392C] shadow-xs transition"
                  >
                    <Sparkles size={13} className="text-emerald-300" />
                    <span>Buka Studio ({asmt.submittedCount})</span>
                  </Link>
                  <Link
                    href={`/classes/${asmt.classId}`}
                    className="p-2.5 rounded-full bg-[#F3F4F6] text-[#4B5563] hover:text-[#1E4D3B] hover:bg-[#E2EFE9] transition"
                    title="Buka Kelas"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE ASSIGNMENT MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-[#111827]">
                    Buat Tugas Baru
                  </h3>
                  <p className="text-xs text-[#6B7280]">Rilis instruksi asesmen untuk kelas Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#111827]">Pilih Kelas Kuliah</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] focus:outline-none focus:border-[#1E4D3B]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subject || "Umum"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111827]">Judul Tugas / Proyek</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tugas 4: Implementasi Algoritma Red-Black Tree"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] focus:outline-none focus:border-[#1E4D3B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111827]">Petunjuk & Instruksi Penugasan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kriteria pengerjaan, format berkas, dan batasan soal..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] focus:outline-none focus:border-[#1E4D3B] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#111827]">Tenggat Waktu</label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-mono text-[#111827] focus:outline-none focus:border-[#1E4D3B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#111827]">Skor Maksimal</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-mono text-[#111827] focus:outline-none focus:border-[#1E4D3B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111827]">Tautkan Rubrik Evaluasi AI</label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => setSelectedRubricId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] focus:outline-none focus:border-[#1E4D3B]"
                >
                  <option value="">(Gunakan Rubrik Bawaan Capstone)</option>
                  {rubrics.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.criteria?.length || 0} kriteria)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F3F4F6] text-xs font-bold text-[#4B5563] hover:bg-[#E5E7EB] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-6 py-2.5 rounded-full bg-[#1E4D3B] text-white text-xs font-extrabold hover:bg-[#15392C] shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTask ? "Menyimpan..." : "Publikasikan Tugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
