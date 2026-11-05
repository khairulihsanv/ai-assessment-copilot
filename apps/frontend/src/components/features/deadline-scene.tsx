/** Original illustration for the student's next-deadline card: a campus by a lake, in brand greens. */
export function DeadlineScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 340"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={className}
    >
      <rect width="900" height="340" fill="#E6F5EC" />
      <circle cx="690" cy="88" r="46" fill="#F7DE9A" />
      <path d="M0 196L120 110L240 188L360 92L520 200L660 118L900 214V340H0Z" fill="#A5D9BC" />
      <path d="M0 240L170 170L330 240L520 166L720 244L900 186V340H0Z" fill="#4FA57C" />
      <rect y="282" width="900" height="58" fill="#BFE6D3" />
      <path d="M0 296H900M60 312H420M520 326H860" stroke="#E6F5EC" strokeWidth="4" />
      <rect
        x="664"
        y="168"
        width="124"
        height="96"
        rx="4"
        fill="#FFFDF6"
        stroke="#024A2E"
        strokeWidth="4"
      />
      <path
        d="M650 172L726 118L802 172Z"
        fill="#03633E"
        stroke="#024A2E"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="714" y="218" width="26" height="46" fill="#024A2E" />
      <rect x="680" y="186" width="20" height="20" fill="#BFE6D3" />
      <rect x="752" y="186" width="20" height="20" fill="#BFE6D3" />
      <path d="M836 276C836 226 846 196 858 170C872 200 880 232 880 276Z" fill="#03633E" />
      <path d="M612 276C612 240 620 214 630 196C642 216 648 242 648 276Z" fill="#03633E" />
      <rect y="270" width="900" height="14" fill="#024A2E" opacity="0.18" />
    </svg>
  );
}
