export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, var(--color-primary-600), var(--color-ai-600))" }}
      >
        <div className="relative z-10 px-12 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display text-2xl font-bold">Dexa Assessment</span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight mb-4">
            Penilaian Cerdas,<br />Keputusan Tetap di Tangan Dosen
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Platform manajemen tugas & penilaian berbasis AI yang membantu dosen mengoreksi tugas lebih efisien, tanpa menggantikan keputusan akademik.
          </p>

          {/* Decorative elements */}
          <div className="mt-12 flex gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-sm">✨ AI-Assisted</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-sm">🔒 Human-in-the-Loop</span>
            </div>
          </div>
        </div>

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-60 h-60 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 border border-white rounded-full" />
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
