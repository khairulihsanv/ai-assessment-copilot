/** Dex is an original, code-native book companion. All motion is CSS controlled. */
export function DexMascot({
  className = "",
  pose = "run",
}: {
  className?: string;
  pose?: "run" | "wave" | "rest";
}) {
  return (
    <svg
      className={`dex-mascot dex-pose-${pose} ${className}`}
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        className="dex-shadow"
        cx="205"
        cy="351"
        rx="92"
        ry="14"
        fill="#142F54"
        opacity=".12"
      />
      <g className="dex-speed" stroke="#88B6FF" strokeWidth="8" strokeLinecap="round">
        <path d="M55 173h32M34 204h47M52 236h27" />
      </g>
      <g className="dex-body-bounce">
        <g className="dex-leg dex-leg-back">
          <path
            d="m220 264 20 41 35 9"
            stroke="#153966"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m263 304 25 9c14 5 16 22-2 23l-38-5 2-18"
            fill="#FFB443"
            stroke="#153966"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </g>
        <g className="dex-arm dex-arm-back">
          <path
            d="m252 181 30 26 28-20"
            stroke="#153966"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="309" cy="183" r="13" fill="#D2F46A" stroke="#153966" strokeWidth="5" />
        </g>
        <path
          d="m126 117 127-7 33 26-9 133-128 20-35-28Z"
          fill="#114AB6"
          stroke="#153966"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="m141 106 126 16 9 133-131 17-28-17 1-134Z"
          fill="#F8FBFF"
          stroke="#153966"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path d="m140 116 117 15M142 126l116 15M145 137l114 14" stroke="#B6D6FF" strokeWidth="4" />
        <path
          d="M103 125c1-17 14-29 31-27l111 16c15 2 24 14 25 29l7 115c1 18-13 32-31 30l-110-9c-16-1-28-13-29-29Z"
          fill="#1675F8"
          stroke="#153966"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="m121 123 2 123c0 10 7 17 17 18l112 9"
          stroke="#5DB4FF"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="m165 110 4 35 17-8 14 13-2-35"
          fill="#D2F46A"
          stroke="#153966"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          x="132"
          y="157"
          width="119"
          height="89"
          rx="35"
          transform="rotate(4 132 157)"
          fill="#E7F5FF"
        />
        <g className="dex-eyes" fill="#153966">
          <ellipse cx="171" cy="193" rx="7" ry="12" />
          <ellipse cx="221" cy="197" rx="7" ry="12" />
          <circle cx="173" cy="189" r="2" fill="white" />
          <circle cx="223" cy="193" r="2" fill="white" />
        </g>
        <path d="M185 218c8 8 17 8 23-1" stroke="#153966" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="151" cy="211" rx="9" ry="5" fill="#FF9C88" />
        <ellipse cx="239" cy="215" rx="9" ry="5" fill="#FF9C88" />
        <g className="dex-arm dex-arm-front">
          <path
            d="m128 207-26 26 28 23"
            stroke="#153966"
            strokeWidth="21"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="131" cy="256" r="13" fill="#D2F46A" stroke="#153966" strokeWidth="5" />
        </g>
        <g className="dex-leg dex-leg-front">
          <path
            d="m166 270-13 38-33 15"
            stroke="#153966"
            strokeWidth="23"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m114 313-17 10c-15 8-10 23 6 21l36-12-7-20"
            fill="#FFB443"
            stroke="#153966"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </g>
        <path d="m290 105 8-15m10 25 17-6" stroke="#FFB443" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
