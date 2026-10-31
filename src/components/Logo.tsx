import Link from "next/link";

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Farol"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="farol-beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#F2B134" stopOpacity="0.95" />
          <stop offset="1" stopColor="#F2B134" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0E1B2A" />
      <path d="M33 21 L64 10 L64 32 Z" fill="url(#farol-beam)" />
      <path d="M26 52 L29 22 L35 22 L38 52 Z" fill="#F3F6F5" />
      <rect x="24" y="52" width="16" height="4" rx="1" fill="#F3F6F5" />
      <path d="M28.1 34 L35.9 34 L36.4 39 L27.6 39 Z" fill="#1D6B74" />
      <rect x="28" y="17" width="8" height="6" rx="1.5" fill="#F2B134" />
      <path d="M27 17 L32 12 L37 17 Z" fill="#F3F6F5" />
      <path
        d="M10 58 q6 -4 12 0 t12 0 t12 0 t12 0"
        stroke="#1D6B74"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Farol, início">
      <Mark size={compact ? 30 : 36} />
      {!compact && (
        <span className="display text-xl font-bold leading-none">Farol</span>
      )}
    </Link>
  );
}
