import { cn } from "@/shared/utils";

const COVERS = [
  { bg: "var(--cover-1)", art: "M6 60L30 36L48 48L88 10M88 10H68M88 10V30" },
  { bg: "var(--cover-2)", art: "M42 46a22 22 0 1 1 15-6L88 66" },
  { bg: "var(--cover-3)", art: "M12 64V40M36 64V22M60 64V34M84 64V8" },
  {
    bg: "var(--cover-4)",
    art: "M50 8V64M16 18H84M16 18L6 44C14 52 26 52 32 44ZM84 18L74 44C80 52 92 52 96 44Z",
  },
  {
    bg: "var(--cover-5)",
    art: "M8 14C24 6 40 6 50 16C60 6 76 6 92 14V62C76 54 60 54 50 64C40 54 24 54 8 62ZM50 16V64",
  },
];

/** A stable pick from a list, so a class keeps its look between visits. */
export function pickByKey(key: string, length: number) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % length;
}

export function coverFor(key: string) {
  return COVERS[pickByKey(key, COVERS.length)] as (typeof COVERS)[number];
}

/** Line drawing for a class cover. Decorative. */
export function CoverArt({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 70" aria-hidden="true" className={className} fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A class shown as a book on a shelf: spine on the left, title and drawing on the cover. */
export function ClassCover({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const cover = coverFor(id);
  return (
    <span
      className={cn(
        "relative block aspect-[3/4] overflow-hidden rounded-r-2xl rounded-l-md py-3.5 pr-3 pl-6 text-[var(--cover-text)]",
        className,
      )}
      style={{ background: cover.bg }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5 bg-black/20" />
      <span
        aria-hidden="true"
        className="absolute -top-0.5 right-4 h-7 w-3 bg-[#f2b632] [clip-path:polygon(0_0,100%_0,100%_100%,50%_74%,0_100%)]"
      />
      <span className="block pr-6 text-[17px] leading-tight font-extrabold">{name}</span>
      <CoverArt path={cover.art} className="absolute right-2 bottom-2.5 w-3/5" />
    </span>
  );
}
