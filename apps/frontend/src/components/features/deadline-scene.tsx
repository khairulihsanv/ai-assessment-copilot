/** Original illustration for the student's next-deadline card: a campus by a lake at dusk. */
export function DeadlineScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 340"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={className}
    >
      <rect width="900" height="340" fill="#FBD3B0" />
      <circle cx="690" cy="88" r="46" fill="#FFF1D6" />
      <path d="M0 196L120 110L240 188L360 92L520 200L660 118L900 214V340H0Z" fill="#EE9A71" />
      <path d="M0 240L170 170L330 240L520 166L720 244L900 186V340H0Z" fill="#D9704F" />
      <rect y="282" width="900" height="58" fill="#8FC6C2" />
      <path d="M0 296H900M60 312H420M520 326H860" stroke="#BFE2DE" strokeWidth="4" />
      <rect
        x="664"
        y="168"
        width="124"
        height="96"
        rx="4"
        fill="#FFF4E6"
        stroke="#6B2F1F"
        strokeWidth="4"
      />
      <path
        d="M650 172L726 118L802 172Z"
        fill="#B5472B"
        stroke="#6B2F1F"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="714" y="218" width="26" height="46" fill="#6B2F1F" />
      <rect x="680" y="186" width="20" height="20" fill="#8FC6C2" />
      <rect x="752" y="186" width="20" height="20" fill="#8FC6C2" />
      <path d="M836 276C836 226 846 196 858 170C872 200 880 232 880 276Z" fill="#5C7F58" />
      <path d="M612 276C612 240 620 214 630 196C642 216 648 242 648 276Z" fill="#5C7F58" />
      <rect y="270" width="900" height="14" fill="#6B2F1F" opacity="0.18" />
    </svg>
  );
}
