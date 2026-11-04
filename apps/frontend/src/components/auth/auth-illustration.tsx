/**
 * Dexa's owl mascot: an original sticker-style illustration for the auth screens.
 * Colours come from the --illus-* tokens in globals.css.
 */

const outline = {
  stroke: "var(--illus-outline)",
  strokeWidth: 5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

export function OwlIllustration({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 560 640"
      role="img"
      aria-label="Ilustrasi maskot burung hantu bertoga memegang pena dan lembar rubrik"
      className={className}
      style={style}
      fill="none"
    >
      {/* Rubric sheet, behind the head */}
      <g transform="translate(36 -40) rotate(11 450 170)">
        <path d="M372 52 H530 V248 L490 288 H372 Z" fill="var(--illus-paper)" {...outline} />
        <path d="M530 248 H490 V288 Z" fill="var(--illus-muted)" {...outline} />
        <circle cx="396" cy="88" r="10" fill="var(--illus-mustard)" {...outline} strokeWidth={4} />
        <rect x="418" y="81" width="90" height="13" rx="6.5" fill="var(--illus-muted)" />
        <circle cx="396" cy="130" r="10" fill="var(--illus-mustard)" {...outline} strokeWidth={4} />
        <rect x="418" y="123" width="72" height="13" rx="6.5" fill="var(--illus-highlight)" />
        <circle cx="396" cy="172" r="10" fill="var(--illus-paper)" {...outline} strokeWidth={4} />
        <rect x="418" y="165" width="84" height="13" rx="6.5" fill="var(--illus-muted)" />
        <rect x="392" y="212" width="74" height="13" rx="6.5" fill="var(--illus-muted)" />
        <rect x="392" y="240" width="48" height="13" rx="6.5" fill="var(--illus-muted)" />
      </g>

      {/* Left wing, behind the body */}
      <path
        d="M92 480 C44 510 34 590 58 660 H132 C112 590 116 530 138 486 Z"
        fill="var(--illus-green-dark)"
        {...outline}
      />

      {/* Raised wing holding the marking pen (base hidden behind the body) */}
      <g transform="translate(4 40) rotate(16 512 250)">
        <rect
          x="498"
          y="152"
          width="28"
          height="104"
          rx="7"
          fill="var(--illus-coral)"
          {...outline}
        />
        <path d="M498 176 H526" {...outline} strokeWidth={4} />
        <path d="M498 152 L512 120 L526 152 Z" fill="var(--illus-mustard)" {...outline} />
      </g>
      <path
        d="M360 520 C450 500 510 400 528 312 C534 278 494 262 480 294 C462 340 420 390 350 420 Z"
        fill="var(--illus-green-dark)"
        {...outline}
      />

      {/* Body */}
      <path
        d="M72 670 C60 480 130 370 255 370 C382 370 450 480 438 670 Z"
        fill="var(--illus-green)"
        {...outline}
      />
      <path
        d="M142 670 C136 550 186 478 255 478 C326 478 376 550 370 670 Z"
        fill="var(--illus-cream)"
        {...outline}
      />
      {/* Chest feathers */}
      <g stroke="var(--illus-muted)" strokeWidth={5} strokeLinecap="round">
        <path d="M212 540 q16 18 32 0" />
        <path d="M268 540 q16 18 32 0" />
        <path d="M184 586 q16 18 32 0" />
        <path d="M240 586 q16 18 32 0" />
        <path d="M296 586 q16 18 32 0" />
      </g>

      {/* Head */}
      <path
        d="M108 276 C108 170 172 126 255 126 C338 126 402 170 402 276 C402 362 338 412 255 412 C172 412 108 362 108 276 Z"
        fill="var(--illus-green)"
        {...outline}
      />

      {/* Face */}
      <circle cx="192" cy="268" r="64" fill="var(--illus-cream)" />
      <circle cx="318" cy="268" r="64" fill="var(--illus-cream)" />
      <ellipse cx="146" cy="340" rx="24" ry="14" fill="var(--illus-coral)" opacity="0.9" />
      <ellipse cx="364" cy="340" rx="24" ry="14" fill="var(--illus-coral)" opacity="0.9" />

      {/* Open eye and winking eye */}
      <circle cx="198" cy="270" r="29" fill="var(--illus-outline)" />
      <circle cx="209" cy="259" r="10" fill="var(--illus-paper)" />
      <circle cx="188" cy="282" r="5" fill="var(--illus-paper)" />
      <path d="M284 280 Q318 244 352 280" {...outline} strokeWidth={8} />

      {/* Round glasses */}
      <circle cx="192" cy="268" r="64" {...outline} strokeWidth={7} />
      <circle cx="318" cy="268" r="64" {...outline} strokeWidth={7} />
      <path d="M256 258 Q255 248 254 258" {...outline} strokeWidth={7} />

      {/* Beak */}
      <path
        d="M255 296 C238 298 226 310 230 322 C236 342 248 352 255 352 C262 352 274 342 280 322 C284 310 272 298 255 296 Z"
        fill="var(--illus-mustard)"
        {...outline}
      />
      <path d="M232 322 Q255 332 278 322" {...outline} strokeWidth={4} />

      {/* Mortarboard */}
      <g transform="rotate(-7 255 130)">
        <path
          d="M160 128 V176 C200 204 310 204 350 176 V128 Z"
          fill="var(--illus-ink)"
          {...outline}
        />
        <path d="M255 42 L442 110 L255 178 L68 110 Z" fill="var(--illus-ink)" {...outline} />
        <path
          d="M255 110 L402 122 V196"
          {...outline}
          stroke="var(--illus-mustard)"
          strokeWidth={6}
        />
        <circle cx="255" cy="110" r="9" fill="var(--illus-mustard)" {...outline} strokeWidth={4} />
        <path d="M388 196 H416 L422 244 H382 Z" fill="var(--illus-mustard)" {...outline} />
      </g>
    </svg>
  );
}
