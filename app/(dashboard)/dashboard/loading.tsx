export default function DashboardLoading() {
  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-500 font-mono tracking-wider">Sinkronisasi Data Dashboard...</span>
      </div>
    </div>
  );
}
