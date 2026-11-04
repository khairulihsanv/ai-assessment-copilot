"use client";

import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useId, useState } from "react";
import { cn } from "@/shared/utils";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Extra element on the label row (e.g. a link). */
  aside?: ReactNode;
  /** Leading icon, separated from the value by a thin divider. */
  icon?: ReactNode;
}

/** Labelled input with persistent label, hint/error text and an optional show-password toggle. */
export function AuthField({
  id,
  label,
  hint,
  error,
  aside,
  icon,
  type = "text",
  className,
  ...props
}: AuthFieldProps) {
  const [reveal, setReveal] = useState(false);
  const hintId = useId();
  const isPassword = type === "password";
  const describedBy = error || hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-3 left-0 flex w-11 items-center justify-center border-r border-border text-muted-foreground"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground",
            "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
            icon && "pl-14",
            error && "border-danger-fg",
            isPassword && "pr-11",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={reveal}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground"
          >
            {reveal ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          id={hintId}
          className={cn("text-xs", error ? "text-danger-fg" : "text-muted-foreground")}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

type Tone = "error" | "success" | "info";

const toneClass: Record<Tone, string> = {
  error: "border-danger-border bg-danger-bg text-danger-fg",
  success: "border-success-border bg-success-bg text-success-fg",
  info: "border-warning-border bg-warning-bg text-warning-fg",
};

/** Inline message. Errors are announced immediately (role=alert); others politely (role=status). */
export function AuthAlert({
  tone = "error",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-3.5 py-3 text-sm", toneClass[tone])}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}
