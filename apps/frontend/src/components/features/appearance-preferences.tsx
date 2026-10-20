"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/shared/utils";
import { useThemeStore } from "@/stores/theme-store";

export function AppearancePreferences() {
  const { resolvedTheme, setTheme } = useThemeStore();
  return (
    <section
      aria-labelledby="appearance-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 id="appearance-heading" className="text-lg font-semibold text-foreground">
        Tampilan ruang kerja
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pilih tema yang nyaman untuk Anda. Pilihan tersimpan otomatis di browser ini.
      </p>
      <fieldset className="mt-5 grid max-w-md grid-cols-2 gap-3" aria-label="Pilihan tema">
        {(
          [
            { theme: "light", label: "Terang", icon: Sun },
            { theme: "dark", label: "Gelap", icon: Moon },
          ] as const
        ).map(({ theme, label, icon: Icon }) => (
          <button
            key={theme}
            type="button"
            aria-pressed={resolvedTheme === theme}
            onClick={() => setTheme(theme)}
            className={cn(
              "flex items-center justify-center gap-3 rounded-lg border px-4 py-4 text-sm font-medium",
              resolvedTheme === theme
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </fieldset>
    </section>
  );
}
