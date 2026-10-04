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
      totalStudents: c._count.enrollments || 0,
      submittedCount: a._count?.submissions || 0,
    })),
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
      })),
    );

    const filteredStudentTasks = studentTasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.className.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === "NEED_GRADE") return !t.mySubmission;
      const hasGrade = t.mySubmission?.grades && t.mySubmission.grades.length > 0;
      if (activeTab === "ACTIVE") return t.mySubmission && !hasGrade;
      if (activeTab === "ARCHIVED") return hasGrade;
      return true;
    });

    return (
      <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
        {/* Header */}
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/5 border border-border mb-2 text-primary">
              <BookOpen size={13} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                Portal Pembelajaran Mahasiswa
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
              Tugas saya
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pantau seluruh tugas terbit dari kelas perkuliahan Anda, kumpulkan berkas, dan baca
              umpan balik yang dirilis dosen.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              aria-label="Cari tugas"
              placeholder="Cari tugas atau mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1E4D3B] shadow-none"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ALL"
                ? "bg-primary text-primary-foreground shadow-none"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            <span>Semua</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-card/20">
              {studentTasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NEED_GRADE")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "NEED_GRADE"
                ? "bg-[#DC2626] text-white shadow-none"
                : "bg-card text-muted-foreground hover:bg-rose-50 border border-border"
            }`}
          >
            <span>Belum Kumpul</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-card/20">
              {studentTasks.filter((t) => !t.mySubmission).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ACTIVE"
                ? "bg-[#2563EB] text-white shadow-none"
                : "bg-card text-muted-foreground hover:bg-blue-50 border border-border"
            }`}
          >
            <span>Menunggu Penilaian</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-card/20">
              {
                studentTasks.filter(
                  (t) =>
                    t.mySubmission &&
                    (!t.mySubmission.grades || t.mySubmission.grades.length === 0),
                ).length
              }
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ARCHIVED")}
            className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ARCHIVED"
                ? "bg-[#10B981] text-white shadow-none"
                : "bg-card text-muted-foreground hover:bg-emerald-50 border border-border"
            }`}
          >
            <span>Sudah Dinilai</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-card/20">
              {
                studentTasks.filter(
                  (t) => t.mySubmission?.grades && t.mySubmission.grades.length > 0,
                ).length
              }
            </span>
          </button>
        </div>

        {/* Task Cards Grid */}
        {filteredStudentTasks.length === 0 ? (
          <div className="p-16 text-center bg-card rounded-lg border border-dashed border-border space-y-3">
            <FileText size={36} className="mx-auto text-muted-foreground" />
            <h3 className="font-display text-base font-bold text-foreground">
              Tidak Ada Tugas Ditemukan
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tidak ada tugas yang sesuai dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredStudentTasks.map((t) => (
              <div
                key={t.id}
                className="bg-card rounded-lg border border-border shadow-none hover:shadow-none transition-all p-6 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-md bg-primary/5 text-primary">
                      {t.className}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Maks {t.maxScore} Poin
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                    {t.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {t.instructions || "Tugas akademik terstruktur."}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {t.mySubmission ? (
                      t.mySubmission.grades && t.mySubmission.grades.length > 0 ? (
                        <span className="font-bold text-[#10B981]">
                          Nilai: {t.mySubmission.grades[0].finalScore} / {t.maxScore}
                        </span>
                      ) : (
                        <span className="text-primary font-bold">Menunggu Review</span>
                      )
                    ) : (
                      <span className="text-[#DC2626] font-bold">Belum Kumpul</span>
                    )}
                  </div>

                  <Link
                    href={`/classes/${t.classId}/assignments/${t.id}`}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition"
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
  // VIEW: DOSEN (Tugas lintas kelas)
  // ==========================================
  const totalSubmissions = allDosenAssignments.reduce((sum, a) => sum + (a.submittedCount || 0), 0);
  const totalNeedingGrade = allDosenAssignments.filter((a) => (a.submittedCount || 0) > 0).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ─── 1. TOP HEADER & ACTIONS ─── */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/5 text-primary border border-border mb-2">
            <Sparkles size={13} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
              Tugas lintas kelas
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">Tugas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Pantau status pengumpulan seluruh kelas, kelola tugas, dan validasi evaluasi AI dalam
            satu ruang kerja.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <Link
            href="/rubrics"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-card border border-border text-primary text-xs font-bold rounded-md hover:bg-muted/40 transition shadow-none cursor-pointer"
          >
            <Layers size={14} />
            <span>Kelola Rubrik ({rubrics.length})</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 shadow-none transition active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} />
            <span>Buat tugas</span>
          </button>
        </div>
      </div>

      <section
        aria-label="Ringkasan tugas"
        className="grid grid-cols-3 divide-x divide-border border-y border-border"
      >
        <div className="px-3 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground">Total tugas</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{allDosenAssignments.length}</p>
        </div>
        <div className="px-3 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground">Ada pengumpulan</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{totalNeedingGrade}</p>
        </div>
        <div className="px-3 py-4 sm:px-5">
          <p className="text-xs text-muted-foreground">Jawaban masuk</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{totalSubmissions}</p>
        </div>
      </section>

      {/* ─── 3. SEARCH & CLASS FILTER BAR ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-none">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            aria-label="Cari tugas"
            placeholder="Cari judul tugas atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/40 text-foreground placeholder:text-muted-foreground text-xs font-medium rounded-md border border-border focus:outline-none focus:border-[#1E4D3B] focus:bg-card transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {classes.length > 1 && (
            <select
              aria-label="Filter kelas"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-4 py-2 rounded-md bg-muted/40 border border-border text-xs font-medium text-foreground focus:outline-none focus:border-[#1E4D3B] cursor-pointer"
            >
              <option value="ALL">Semua Kelas Kuliah</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center p-1 bg-muted rounded-md border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-primary text-primary-foreground shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({allDosenAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("NEED_GRADE")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "NEED_GRADE"
                  ? "bg-[#DC2626] text-white shadow-none"
                  : "text-muted-foreground hover:text-[#DC2626]"
              }`}
            >
              <span>Ada pengumpulan</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-card/20">
                {totalNeedingGrade}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === "ACTIVE"
                  ? "bg-primary text-primary-foreground shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aktif
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. CARD GRID ─── */}
      {filteredAssignments.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-lg border border-dashed border-border space-y-3">
          <FileText size={40} className="mx-auto text-muted-foreground" />
          <h3 className="font-display text-lg font-bold text-foreground">
            Belum Ada Tugas Ditampilkan
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Belum ada tugas yang cocok. Ubah pencarian atau filter, atau buat tugas baru.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-none transition"
          >
            <Plus size={15} />
            <span>Buat Tugas Baru Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
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
                className="bg-card rounded-lg border border-border transition-colors grid gap-5 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_auto] lg:items-center group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-md bg-primary/5 text-primary truncate">
                      {asmt.className}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isPastDue ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Clock size={11} />
                      {isPastDue ? "Tenggat Berakhir" : formatRelativeTime(asmt.dueDate)}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                    {asmt.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {asmt.instructions ||
                      "Tugas perkuliahan terstruktur dengan panduan rubrik terstandarisasi."}
                  </p>
                </div>

                {/* Submission Progress Bar */}
                <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Users size={13} className="text-muted-foreground" />
                      <span>Pengumpulan</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {asmt.submittedCount} / {asmt.totalStudents} Mhs ({submissionPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#E5E7EB] rounded-md overflow-hidden flex">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(submissionPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Maks {asmt.maxScore} Poin</span>
                    <span className="text-primary font-semibold truncate max-w-[160px]">
                      {asmt.rubric?.title ? `Rubrik: ${asmt.rubric.title}` : "Belum ada rubrik"}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/classes/${asmt.classId}/assignments/${asmt.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-none transition"
                  >
                    <Sparkles size={13} className="text-emerald-300" />
                    <span>Lihat pengumpulan ({asmt.submittedCount})</span>
                  </Link>
                  <Link
                    href={`/classes/${asmt.classId}`}
                    className="p-2.5 rounded-md bg-muted text-muted-foreground hover:text-primary hover:bg-primary/5 transition"
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
          <div className="bg-card rounded-lg border border-border shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    Buat Tugas Baru
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Rilis instruksi asesmen untuk kelas Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Tutup formulir tugas"
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Pilih Kelas Kuliah</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-sans text-foreground focus:outline-none focus:border-[#1E4D3B]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subject || "Umum"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Judul Tugas / Proyek</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tugas 4: Implementasi Algoritma Red-Black Tree"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-sans text-foreground focus:outline-none focus:border-[#1E4D3B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Petunjuk & Instruksi Penugasan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kriteria pengerjaan, format berkas, dan batasan soal..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-muted/40 border border-border text-xs font-sans text-foreground focus:outline-none focus:border-[#1E4D3B] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Tenggat Waktu</label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-[#1E4D3B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Skor Maksimal</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-[#1E4D3B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tautkan Rubrik Evaluasi AI</label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => setSelectedRubricId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-muted/40 border border-border text-xs font-sans text-foreground focus:outline-none focus:border-[#1E4D3B]"
                >
                  <option value="">(Gunakan Belum ada rubrik Capstone)</option>
                  {rubrics.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.criteria?.length || 0} kriteria)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-md bg-muted text-xs font-bold text-muted-foreground hover:bg-[#E5E7EB] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-none transition disabled:opacity-50 cursor-pointer"
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
