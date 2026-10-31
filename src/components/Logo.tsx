import Link from "next/link";

/** Recorte do emblema: o A e o globo, no tamanho do cabeçalho. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden>
      <img src="/brand/mark.webp" alt="" />
    </span>
  );
}

export function Logo({ compact = false, tone = "ink" }: { compact?: boolean; tone?: "ink" | "foam" }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${tone === "foam" ? "text-foam" : "text-ink"}`} aria-label="AtlasMeme, início">
      <Mark size={compact ? 28 : 36} />
      {!compact && <span className="brand-word text-[1.02rem] sm:text-[1.12rem]">AtlasMeme</span>}
    </Link>
  );
}
