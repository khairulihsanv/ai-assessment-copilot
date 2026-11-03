import { cn } from "@/shared/utils";

/**
 * Dexa brand mark: a "Dx" monogram plus wordmark, rendered in CSS so it costs
 * no image request and follows the light/dark tokens.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        letterSpacing: "-0.04em",
      }}
    >
      Dx
    </span>
  );
}

export function Brand({
  subtitle,
  size = 28,
  className,
}: {
  subtitle?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          Dexa Assessment
        </span>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
    </span>
  );
}
