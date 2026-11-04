import Link from "next/link";
import { OwlIllustration } from "@/components/auth/auth-illustration";
import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-canvas p-3 sm:p-6 lg:p-10">
      <h1 className="sr-only">Dexa Assessment</h1>
      <div className="grid w-full max-w-[1040px] rounded-[28px] bg-card p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-4">
        {/* Illustration panel. The mascot deliberately breaks out of the panel on the right. */}
        <aside className="relative hidden min-h-[640px] rounded-[20px] bg-auth-panel lg:block">
          <div className="p-7">
            <Link href="/" aria-label="Dexa Assessment — beranda" className="inline-block">
              <Brand />
            </Link>
            <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-foreground">
              Draf penilaian dari AI. Keputusan nilai tetap di tangan dosen.
            </p>
          </div>
          <OwlIllustration
            className="absolute bottom-0 left-10 w-[88%] overflow-visible"
            style={{ clipPath: "inset(-200px -200px 0 -40px)" }}
          />
        </aside>

        <main id="main-content" className="flex min-w-0 flex-col">
          {/* Compact mascot banner for phones and tablets */}
          <div className="relative h-40 overflow-hidden rounded-[20px] bg-auth-panel lg:hidden">
            <Link
              href="/"
              aria-label="Dexa Assessment — beranda"
              className="absolute top-4 left-4 z-10"
            >
              <Brand />
            </Link>
            <OwlIllustration className="absolute -right-4 -bottom-36 w-60" />
          </div>
          <div className="flex flex-1 items-center justify-center px-3 py-8 sm:px-8 lg:pr-6 lg:pl-14">
            <div className="w-full max-w-[380px]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
