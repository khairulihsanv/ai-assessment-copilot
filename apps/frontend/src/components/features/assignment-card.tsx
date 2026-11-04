import { AlertCircle, Calendar, CheckCircle2, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRelativeTime } from "@/shared/utils";

interface AssignmentCardProps {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  submissionType: "TEXT" | "PDF" | "DOCX" | "ANY";
  dueDate: Date | string;
  maxScore: number;
  isDosen: boolean;
  submissionCount?: number;
  totalStudents?: number;
  studentSubmission?: {
    activeVersionId: string | null;
    releasedGradeId: string | null;
    createdAt: Date | string;
    grades: {
      finalScore: number;
    }[];
  } | null;
}

export function AssignmentCard({
  id,
  classId,
  title,
  instructions,
  submissionType,
  dueDate,
  maxScore,
  isDosen,
  submissionCount = 0,
  totalStudents = 0,
  studentSubmission,
}: AssignmentCardProps) {
  const due = new Date(dueDate);
  const isPastDue = due.getTime() < Date.now();

  const getSubmissionTypeBadge = (type: string) => {
    switch (type) {
      case "PDF":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-danger-bg text-danger-fg border-danger-border"
          >
            PDF Dokumen
          </Badge>
        );
      case "DOCX":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-secondary text-secondary-foreground border-border"
          >
            DOCX Word
          </Badge>
        );
      case "TEXT":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-warning-bg text-warning-fg border-warning-border"
          >
            Teks Esai
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs bg-muted text-foreground">
            File / Teks Bebas
          </Badge>
        );
    }
  };

  const getStudentStatusBadge = () => {
    if (!studentSubmission || !studentSubmission.activeVersionId) {
      return isPastDue ? (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="w-3 h-3" />
          Terlewat
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-xs gap-1 border-warning-border text-warning-fg bg-warning-bg "
        >
          <Clock className="w-3 h-3" />
          Belum Mengumpulkan
        </Badge>
      );
    }

    if (studentSubmission.releasedGradeId && studentSubmission.grades.length > 0) {
      return (
        <Badge className="text-xs gap-1 bg-success-bg text-success-fg border border-success-border hover:bg-success-bg">
          <CheckCircle2 className="w-3 h-3" />
          Nilai: {studentSubmission.grades[0]?.finalScore ?? "-"} / {maxScore}
        </Badge>
      );
    }

    return (
      <Badge
        variant="secondary"
        className="text-xs gap-1 bg-secondary text-secondary-foreground border border-border "
      >
        <Sparkles className="w-3 h-3" />
        Menunggu Koreksi Dosen
      </Badge>
    );
  };

  return (
    <Card className="hover:border-primary/40 hover:shadow-none transition-all duration-200 border-border/70 flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          {getSubmissionTypeBadge(submissionType)}
          {isDosen ? (
            <Badge
              variant="outline"
              className="text-xs bg-muted/60 text-muted-foreground font-mono"
            >
              Maks. {maxScore} Poin
            </Badge>
          ) : (
            getStudentStatusBadge()
          )}
        </div>

        <CardTitle className="text-lg font-bold font-display group-hover:text-primary transition-colors">
          <Link href={`/classes/${classId}/assignments/${id}`}>{title}</Link>
        </CardTitle>

        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{instructions}</p>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div
            className={`flex items-center gap-1.5 ${isPastDue ? "text-destructive font-medium" : ""}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Tenggat: {formatDateTime(due)} ({formatRelativeTime(due)})
            </span>
          </div>
        </div>

        {isDosen && (
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pengumpulan Jawaban:</span>
            <span className="font-semibold text-foreground">
              {submissionCount} / {totalStudents} Mahasiswa
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 border-t border-border/40 py-3 bg-muted/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {isDosen ? "Kelola & Koreksi" : "Buka Tugas"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          asChild
          className="h-8 text-xs font-semibold text-primary"
        >
          <Link href={`/classes/${classId}/assignments/${id}`}>Detail Tugas →</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
