import { cn } from "@/shared/utils";

/*
 * Dexa logo: the "Mata Centang" owl. One eye watches, the other is a check mark:
 * the AI drafts, the lecturer decides. The face is cut out of the head (even-odd fill),
 * so the mark works on any background without masks or ids.
 */
const OWL_PATH = [
  // head with ear tufts
  "M46 24C60 38 74 44 100 44C126 44 140 38 154 24C168 54 180 84 180 114C180 158 142 184 100 184C58 184 20 158 20 114C20 84 32 54 46 24Z",
  // eye
  "M40 106a28 28 0 1 0 56 0a28 28 0 1 0 -56 0Z",
  // check mark
  "M103.6 111.6L118.6 128.6A8.5 8.5 0 0 0 131.7 128.2L160.7 91.2A8.5 8.5 0 0 0 147.3 80.8L124.6 109.7L116.4 100.4A8.5 8.5 0 0 0 103.6 111.6Z",
  // beak
  "M100 134L112 148L100 164L88 148Z",
].join("");

/** The owl alone, in the current text colour. */
export function OwlGlyph({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d={OWL_PATH} fillRule="evenodd" />
      <circle cx="73" cy="108" r="12" />
    </svg>
  );
}

/** App-icon tile: white owl on the brand gradient. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        background: "linear-gradient(150deg, #070a09 10%, #03633e 72%, #0a8f62 100%)",
      }}
    >
      <OwlGlyph size={Math.round(size * 0.74)} />
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
