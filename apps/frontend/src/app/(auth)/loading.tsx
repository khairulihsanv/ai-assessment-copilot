import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
    >
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span>Memuat…</span>
    </div>
  );
}
