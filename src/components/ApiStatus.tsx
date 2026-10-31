"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { Pill } from "./ui";

type Check = {
  id: string;
  name: string;
  role: string;
  notDoes: string;
  docs: string;
  kind: string;
  cacheTtl: string;
  status: "online" | "falha" | "estática";
  latencyMs: number | null;
  checkedAt: string;
  detail: unknown;
};

export function ApiStatus() {
  const [data, setData] = useState<{ ok: boolean; checks: Check[]; app: { version: string; region: string } } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/health");
      setData(await r.json());
    } catch {
      // Sem rede ou resposta inválida: mantém o último estado conhecido e tenta de novo no próximo ciclo.
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-ink-soft">
          {data ? (
            <>
              Estado geral: {data.ok ? <Pill tone="good">tudo online</Pill> : <Pill tone="bad">há falhas</Pill>} · versão {data.app.version} · região {data.app.region}
            </>
          ) : (
            "Verificando…"
          )}
        </div>
        <button className="btn btn-ghost text-sm" onClick={load} disabled={loading}>
          {loading ? "Verificando…" : "Verificar agora"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {(data?.checks ?? []).map((c) => (
          <article key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{c.name}</h3>
              <div className="flex items-center gap-2">
                <Pill tone="tide">{c.kind}</Pill>
                <Pill tone={c.status === "online" ? "good" : c.status === "falha" ? "bad" : "neutral"}>
                  {c.status}
                  {c.latencyMs != null ? ` · ${c.latencyMs} ms` : ""}
                </Pill>
              </div>
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-mist">O que faz</dt>
                <dd>{c.role}</dd>
              </div>
              <div>
                <dt className="text-mist">O que não faz</dt>
                <dd>{c.notDoes}</dd>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-mist">
                <span>cache: {c.cacheTtl}</span>
                <span>verificado às {fmt.time(c.checkedAt)}</span>
                <a className="underline" href={c.docs} target="_blank" rel="noreferrer">
                  documentação
                </a>
              </div>
              {c.status === "falha" && <div className="text-xs text-rock">{String(c.detail)}</div>}
              {c.status === "online" && c.detail != null && typeof c.detail === "object" && (
                <div className="mono text-xs text-mist">{JSON.stringify(c.detail)}</div>
              )}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
