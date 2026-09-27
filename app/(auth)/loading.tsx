export default function AuthLoading() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#f8f9ff]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-500 font-mono tracking-wider">Memuat Portal Akademik...</span>
      </div>
    </div>
  );
}
