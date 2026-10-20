import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Layers3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
export type FeatureIconName =
  | "class"
  | "task"
  | "rubric"
  | "grade"
  | "report"
  | "copilot"
  | "calendar"
  | "upload"
  | "review"
  | "people"
  | "library"
  | "shield";
const icons = {
  class: BookOpen,
  task: FileText,
  rubric: Layers3,
  grade: Award,
  report: BarChart3,
  copilot: MessageCircle,
  calendar: CalendarDays,
  upload: FolderOpen,
  review: ClipboardCheck,
  people: Users,
  library: Sparkles,
  shield: ShieldCheck,
};
export function FeatureIcon({
  name,
  tone = "blue",
  className = "",
}: {
  name: FeatureIconName;
  tone?: "blue" | "lime" | "peach" | "lilac";
  className?: string;
}) {
  const Icon = icons[name];
  return (
    <span className={`feature-icon feature-icon-${tone} ${className}`}>
      <Icon strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
