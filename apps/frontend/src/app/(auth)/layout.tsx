import { CheckCircle2, Quote, UserCheck } from "lucide-react";
import Link from "next/link";
import { OwlIllustration } from "@/components/auth/auth-illustration";
import { DotField } from "@/components/auth/dot-field";
import { Brand } from "@/components/brand";

const chipClass =
  "auth-glass auth-chip auth-float absolute z-10 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Desktop: locked to the viewport, nothing scrolls. Phones and tablets scroll normally.
    <div className="relative min-h-dvh bg-auth-canvas lg:h-dvh lg:overflow-hidden">
      <DotField />

      <div className="relative z-10 grid min-h-dvh lg:h-full lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <aside className="relative hidden lg:block">
          <div className="p-8 short:p-6 xl:p-10">
            <Link href="/" aria-label="Dexa Assessment — beranda" className="inline-block">
              <Brand size={34} />
            </Link>
            <h1 className="mt-5 text-[32px] leading-[1.15] font-semibold tracking-tight short:mt-3 short:text-[26px] xl:text-[38px]">
              <span className="block">Draf penilaian dari AI.</span>
              <span className="block">Keputusan nilai dari dosen.</span>
            </h1>
          </div>

          <OwlIllustration className="absolute bottom-0 left-1/2 aspect-[560/640] h-[64dvh] -translate-x-1/2 overflow-visible" />

          <span className={`${chipClass} top-[46%] left-[5%]`}>
            <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
            Saran skor per kriteria
          </span>
          <span className={`${chipClass} bottom-[12%] left-[3%] [animation-delay:-2s]`}>
            <Quote size={16} className="text-primary" aria-hidden="true" />
            Kutipan bukti dari jawaban
          </span>
          <span className={`${chipClass} right-[4%] bottom-[7%] [animation-delay:-4s]`}>
            <UserCheck size={16} className="text-primary" aria-hidden="true" />
            Dosen yang memutuskan
          </span>
        </aside>

        <main
          id="main-content"
          className="flex min-w-0 flex-col items-center justify-center p-3 sm:p-6 lg:h-dvh lg:py-4 lg:pr-10 lg:pl-2"
        >
          {/* Phones and tablets: brand with the mascot peeking over the form card */}
          <h1 className="sr-only lg:hidden">Dexa Assessment</h1>
          <div className="relative h-24 w-full max-w-[440px] overflow-hidden lg:hidden">
            <Link
              href="/"
              aria-label="Dexa Assessment — beranda"
              className="absolute top-3 left-2 z-10"
            >
              <Brand />
            </Link>
            <OwlIllustration className="absolute top-3 right-0 w-40" />
          </div>
          <div className="auth-glass w-full max-w-[440px] rounded-[28px] p-6 short:px-7 short:py-5 sm:p-8 lg:max-h-[calc(100dvh-32px)] lg:overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
