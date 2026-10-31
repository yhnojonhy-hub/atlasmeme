"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { STEP_TITLE, type Run, type Step } from "@/lib/launcher/types";
import { Alert, Pill } from "./ui";
import { TrackPanel } from "./TrackPanel";

const TONE: Record<Step["status"], "neutral" | "good" | "bad" | "beam" | "tide"> = {
  pendente: "neutral",
  executando: "tide",
  concluido: "good",
  espera: "beam",
  pulado: "neutral",
  falhou: "bad",
};

export function RunView({ id }: { id: string }) {
  const [run, setRun] = useState<Run | null>(null);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/runs/${id}`)
        .then(async (r) => alive && r.ok && setRun(await r.json()))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  async function act(stepId: Step["id"], payload?: Record<string, unknown>) {
    setActing(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/runs/${id}/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stepId, payload, wait: false }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha");
      setMsg("Retomado.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setActing(false);
    }
  }

  if (!run) return <p className="text-sm text-mist">Carregando execução…</p>;

  const done = run.steps.filter((s) => s.status === "concluido" || s.status === "pulado").length;
  const site = run.steps.find((s) => s.id === "site")?.output as { url?: string } | undefined;
  const launch = run.steps.find((s) => s.id === "lancamento")?.output as { mint?: string } | undefined;
  const costs = run.costsUsd.reduce((a, c) => a + c.usd, 0);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-sm text-ink-soft">
            {run.brief.name} · ${run.brief.ticker} · <span className="mono">{run.slug}</span>
          </div>
          <div className="num mt-1 text-2xl font-semibold">
            {done} / {run.steps.length} passos
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={run.status === "concluido" ? "good" : run.status === "falhou" ? "bad" : run.status === "espera" ? "beam" : "tide"}>{run.status}</Pill>
          {site?.url && (
            <Link href={`/p/${run.slug}`} className="btn btn-ghost text-sm">
              Ver site
            </Link>
          )}
          {launch?.mint && (
            <Link href={`/app/mercado?mint=${launch.mint}`} className="btn btn-ghost text-sm">
              Mercado
            </Link>
          )}
        </div>
      </div>

      {costs > 0 && (
        <p className="text-xs text-mist">
          Custos pagos pela automação: {fmt.usd2(costs)} ({run.costsUsd.map((c) => c.item).join(", ")}).
        </p>
      )}

      <ol className="space-y-3">
        {run.steps.map((s, i) => (
          <li key={s.id} className={`card p-4 ${s.status === "espera" ? "border-beam" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                <span className="mr-2 text-tide">{i + 1}</span>
                {STEP_TITLE[s.id]}
              </h3>
              <Pill tone={TONE[s.status]}>{s.status}</Pill>
            </div>
            {s.status === "espera" && (
              <Alert tone="warn">
                <div>{s.needs}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.action === "confirmar-lancamento" && (
                    <button className="btn btn-beam text-sm" disabled={acting} onClick={() => act(s.id, { confirm: true })}>
                      Confirmar lançamento (gasta SOL)
                    </button>
                  )}
                  <button className="btn btn-ghost text-sm" disabled={acting} onClick={() => act(s.id)}>
                    Repetir verificação
                  </button>
                </div>
              </Alert>
            )}
            {(s.status === "pulado" || s.status === "falhou") && (
              <div className="mt-2">
                <button className="btn btn-ghost text-sm" disabled={acting} onClick={() => act(s.id)}>
                  Repetir passo
                </button>
              </div>
            )}
            {s.log.length > 0 && (
              <pre className="mono mt-3 max-h-48 overflow-auto rounded-lg bg-foam p-3 text-xs whitespace-pre-wrap text-ink-soft">{s.log.join("\n")}</pre>
            )}
            <StepOutput step={s} />
          </li>
        ))}
      </ol>

      {msg && <p className="text-sm text-mist">{msg}</p>}

      {launch?.mint && <TrackPanel slug={run.slug} />}
    </div>
  );
}

function StepOutput({ step }: { step: Step }) {
  const o = step.output as Record<string, unknown>;
  if (step.id === "carteiras" && o.creator) {
    return (
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-mist">Operação</dt>
          <dd className="mono break-all">{String(o.creator)}</dd>
        </div>
        <div>
          <dt className="text-mist">Tesouraria</dt>
          <dd className="mono break-all">{String(o.treasury)}</dd>
        </div>
      </dl>
    );
  }
  if (step.id === "social" && o.kit) {
    const kit = o.kit as { bio: string; announcement: string; calendar: string[]; telegramDescription: string; rules: string[] };
    return (
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">Ver kit social</summary>
        <div className="mt-2 space-y-3">
          <div>
            <div className="text-mist">Bio</div>
            <p className="rounded bg-foam p-2">{kit.bio}</p>
          </div>
          <div>
            <div className="text-mist">Anúncio</div>
            <pre className="rounded bg-foam p-2 whitespace-pre-wrap font-sans">{kit.announcement}</pre>
          </div>
          <div>
            <div className="text-mist">Calendário</div>
            <ul className="list-disc pl-5">
              {kit.calendar.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-mist">Regras</div>
            <ul className="list-disc pl-5">
              {kit.rules.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    );
  }
  if (step.id === "curva" && o.preview) {
    const p = o.preview as { initialPriceSol: number; migrationPriceSol: number; solToGraduateApprox: number | null; tradingFee: number; creatorWalletRate: number; treasuryWalletRate: number; estimatedRentSol: number };
    return (
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-mist">Preço inicial → graduação</dt>
          <dd className="num">
            {p.initialPriceSol.toExponential(2)} → {p.migrationPriceSol.toExponential(2)} SOL
          </dd>
        </div>
        <div>
          <dt className="text-mist">SOL para graduar (aprox.)</dt>
          <dd className="num">{p.solToGraduateApprox?.toFixed(1) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-mist">Taxa</dt>
          <dd className="num">
            {fmt.pct(p.tradingFee)} · projeto {fmt.pct(p.creatorWalletRate + p.treasuryWalletRate)}
          </dd>
        </div>
      </dl>
    );
  }
  if (step.id === "listagem" && o.links) {
    const links = o.links as Record<string, string>;
    const manual = (o.manual as string[]) ?? [];
    return (
      <div className="mt-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {Object.entries(links).map(([k, v]) => (
            <a key={k} href={v} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
              {k}
            </a>
          ))}
        </div>
        <ul className="mt-2 list-disc pl-5 text-xs text-ink-soft">
          {manual.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}
