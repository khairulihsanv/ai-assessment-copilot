"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, Layers, Trash2, Edit3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RubricEditor } from "@/components/features/rubric-editor";
import { formatDate } from "@/lib/utils";

interface Criterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
}

interface RubricItem {
  id: string;
  title: string;
  createdAt: Date | string;
  criteria: Criterion[];
  _count: { assignments: number };
}

interface RubricManagementViewProps {
  classId: string;
  className: string;
  initialRubrics: RubricItem[];
}

export function RubricManagementView({
  classId,
  className,
  initialRubrics,
}: RubricManagementViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRubric, setEditingRubric] = useState<RubricItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, assignmentCount: number) => {
    if (assignmentCount > 0) {
      alert(`Rubrik ini sedang dipakai oleh ${assignmentCount} tugas aktif dan tidak dapat dihapus.`);
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus rubrik ini?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/classes/${classId}/rubrics/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus rubrik");
      } else {
        router.refresh();
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/classes/${classId}`} className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-primary" />
            Manajemen Rubrik Penilaian
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Definisikan standar dan bobot penilaian yang akan digunakan oleh AI Copilot untuk menilai tugas mahasiswa.
          </p>
        </div>

        {!isCreating && !editingRubric && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 bg-primary text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4" />
            Buat Rubrik Baru
          </Button>
        )}
      </div>

      {/* Editor State (Create or Edit) */}
      {isCreating && (
        <RubricEditor
          classId={classId}
          onSuccess={() => {
            setIsCreating(false);
            router.refresh();
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingRubric && (
        <RubricEditor
          classId={classId}
          initialData={{
            id: editingRubric.id,
            title: editingRubric.title,
            criteria: editingRubric.criteria.map((c) => ({
              id: c.id,
              label: c.label,
              description: c.description || "",
              maxScore: c.maxScore,
              weight: c.weight,
            })),
          }}
          onSuccess={() => {
            setEditingRubric(null);
            router.refresh();
          }}
          onCancel={() => setEditingRubric(null)}
        />
      )}

      {/* Rubrics List */}
      {!isCreating && !editingRubric && (
        <div className="space-y-4">
          {initialRubrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-card/40">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold font-display text-foreground">Belum Ada Rubrik Penilaian</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
                Rubrik membantu AI menghasilkan evaluasi yang adil, transparan, dan dapat diandalkan oleh dosen.
              </p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Buat Rubrik Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {initialRubrics.map((r) => (
                <div
                  key={r.id}
                  className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-bold font-display text-foreground">{r.title}</h3>
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                          {r.criteria.length} Kriteria
                        </Badge>
                        {r._count.assignments > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            Dipakai di {r._count.assignments} tugas
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Belum terpasang di tugas
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibuat pada {formatDate(r.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingRubric(r)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r.id, r._count.assignments)}
                        disabled={deletingId === r.id}
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Criteria Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-border/50">
                    {r.criteria.map((c, idx) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground line-clamp-1">
                            {idx + 1}. {c.label}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {c.weight}%
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {c.description}
                          </p>
                        )}
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Maks Skor: {c.maxScore}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
