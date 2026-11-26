import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown the moment a link in the workspace is clicked, while the next page loads its data
 * from the backend. Without it the old page stays frozen until every request has finished.
 */
export default function WorkspaceLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Memuat halaman…</span>
      <header className="space-y-2">
        <Skeleton className="h-8 w-56 lg:h-9" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <div key={key} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
