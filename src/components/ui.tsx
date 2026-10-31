import type { ReactNode } from "react";
import { fmt } from "@/lib/format";

export function Section({
  title,
  lead,
  children,
  aside,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {lead && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{lead}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "bad" | "beam";
}) {
  const toneClass =
    tone === "good"
      ? "text-ok"
      : tone === "bad"
        ? "text-rock"
        : tone === "beam"
          ? "text-beam-deep"
          : "text-ink";
  return (
    <div className="card p-4">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-mist">{hint}</div>}
    </div>
  );
}

export function SourceStamp({
  source,
  url,
  fetchedAt,
  latencyMs,
  cacheHit,
}: {
  source: string;
  url?: string;
  fetchedAt?: string;
  latencyMs?: number;
  cacheHit?: boolean;
}) {
  return (
    <p className="text-xs text-mist">
      Fonte:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2">
          {source}
        </a>
      ) : (
        source
      )}
      {fetchedAt && <> · lido às {fmt.time(fetchedAt)}</>}
      {typeof latencyMs === "number" && <> · {latencyMs} ms{cacheHit ? " (cache)" : ""}</>}
    </p>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card border-dashed p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "bad" | "good";
  children: ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "bg-[#fff4dc] border-[#f1d49a] text-[#6b4a00]"
      : tone === "bad"
        ? "bg-rock-soft border-[#e9b4ae] text-[#6e1f17]"
        : tone === "good"
          ? "bg-ok-soft border-[#b7dcc4] text-[#1d4f32]"
          : "bg-tide-soft border-[#b9d9dd] text-[#114248]";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "beam" | "tide"; children: ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-ok-soft text-ok"
      : tone === "bad"
        ? "bg-rock-soft text-rock"
        : tone === "beam"
          ? "bg-[#fdf0d2] text-beam-deep"
          : tone === "tide"
            ? "bg-tide-soft text-tide"
            : "bg-foam-2 text-ink-soft";
  return <span className={`pill ${cls}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mist">{hint}</span>}
    </label>
  );
}
