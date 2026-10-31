/**
 * Todo dado externo chega embrulhado em Sourced<T>: valor + de onde veio + quando.
 * A UI nunca mostra um número sem fonte e horário.
 */
export type Sourced<T> = {
  ok: true;
  data: T;
  source: string;
  sourceUrl: string;
  fetchedAt: string; // ISO
  latencyMs: number;
  cacheHit: boolean;
};

export type Failed = {
  ok: false;
  source: string;
  sourceUrl: string;
  error: string;
  latencyMs: number;
  fetchedAt: string;
};

export type Result<T> = Sourced<T> | Failed;

export async function timed<T>(
  source: string,
  sourceUrl: string,
  fn: () => Promise<T>,
  cacheHit = false,
): Promise<Result<T>> {
  const t0 = performance.now();
  try {
    const data = await fn();
    return {
      ok: true,
      data,
      source,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - t0),
      cacheHit,
    };
  } catch (e) {
    return {
      ok: false,
      source,
      sourceUrl,
      error: e instanceof Error ? e.message : String(e),
      latencyMs: Math.round(performance.now() - t0),
      fetchedAt: new Date().toISOString(),
    };
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 6000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function isMint(s: string | null | undefined): s is string {
  return !!s && BASE58.test(s.trim());
}
