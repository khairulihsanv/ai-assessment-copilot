/** Small head of the Dexa owl, used as the workspace logo. Decorative: pair it with a label. */
export function OwlMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="60 34 390 380"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M108 276C108 170 172 126 255 126C338 126 402 170 402 276C402 362 338 412 255 412C172 412 108 362 108 276Z"
        fill="#2F7D5B"
        stroke="#17251D"
        strokeWidth="9"
      />
      <circle cx="192" cy="268" r="64" fill="#FFF4DC" stroke="#17251D" strokeWidth="9" />
      <circle cx="318" cy="268" r="64" fill="#FFF4DC" stroke="#17251D" strokeWidth="9" />
      <circle cx="198" cy="270" r="29" fill="#17251D" />
      <circle cx="312" cy="270" r="29" fill="#17251D" />
      <path
        d="M255 296C238 298 226 310 230 322C236 342 248 352 255 352C262 352 274 342 280 322C284 310 272 298 255 296Z"
        fill="#F2B632"
        stroke="#17251D"
        strokeWidth="6"
      />
      <path d="M255 42L442 110L255 178L68 110Z" fill="#1C2A3A" stroke="#17251D" strokeWidth="6" />
    </svg>
  );
}
