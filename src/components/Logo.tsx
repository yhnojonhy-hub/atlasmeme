import Link from "next/link";

/** Proa vista de frente: a marca do estaleiro. Primer sobre chapa escura, sem gradiente. */
export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Estaleiro" className="shrink-0">
      <rect width="64" height="64" rx="6" fill="#14221C" />
      <path d="M8 46 L16 28 H48 L56 46 Z" fill="#E23D28" />
      <rect x="26" y="18" width="16" height="10" fill="#E7EBE6" />
      <path d="M6 46 H58" stroke="#E7EBE6" strokeWidth="3" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Estaleiro, início">
      <Mark size={compact ? 30 : 38} />
      {!compact && <span className="display text-[1.65rem] font-extrabold leading-none tracking-tight">Estaleiro</span>}
    </Link>
  );
}
