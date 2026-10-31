"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import type { Snapshot } from "@/lib/tracker/store";
import { Alert, Section, Stat } from "./ui";

type TrackResp = {
  ok: boolean;
  tracking: boolean;
  solUsd: number | null;
  summary: {
    last: Snapshot | null;
    ageHours: number;
    priceChange24h: number | null;
    costsUsd: number;
    claimedUsd: number;
    unclaimedUsd: number | null;
    cashProfitUsd: number;
    potentialProfitUsd: number | null;
    events: { at: string; kind: string; detail: string }[];
  } | null;
  snapshots: Snapshot[];
};

/**
 * Acompanhamento do começo ao fim: mercado, curva, taxas e lucro em caixa.
 * `publicView` (site do projeto) omite controles e contabilidade interna da operação.
 */
export function TrackPanel({ slug, publicView = false }: { slug: string; publicView?: boolean }) {
  const [d, setD] = useState<TrackResp | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/projects/${slug}/track`)
        .then(async (r) => alive && setD(await r.json()))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [slug]);

  async function claim() {
    setClaiming(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/projects/${slug}/claim`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha");
      setMsg(`Reclamado ${j.sol.toFixed(4)} SOL${j.usd ? ` (${fmt.usd2(j.usd)})` : ""}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setClaiming(false);
    }
  }

  if (!d) return null;
  if (!d.summary) return <Alert tone="info">Acompanhamento ainda não iniciado para este projeto.</Alert>;
  const s = d.summary;
  const last = s.last;
  const onChainClaimedUsd = last?.feesClaimedSol != null && d.solUsd ? last.feesClaimedSol * d.solUsd : null;

  return (
    <Section
      title="Acompanhamento"
      lead={
        publicView
          ? `Leitura automática a cada minuto há ${s.ageHours.toFixed(1)} h. Taxas lidas on-chain.`
          : `Leitura a cada minuto há ${s.ageHours.toFixed(1)} h. Lucro é só caixa: taxas recebidas menos custos.`
      }
      aside={
        publicView ? undefined : (
          <button className="btn btn-beam text-sm" onClick={claim} disabled={claiming || !s.unclaimedUsd}>
            {claiming ? "Reclamando…" : "Reclamar taxas"}
          </button>
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Preço" value={fmt.price(last?.priceUsd)} hint={s.priceChange24h == null ? "sem 24 h" : `${(s.priceChange24h * 100).toFixed(1)}% em 24 h`} />
        <Stat label="Liquidez" value={fmt.usd(last?.liquidityUsd)} hint={last?.marketCapUsd ? `market cap ${fmt.usd(last.marketCapUsd)}` : "—"} />
        <Stat label="Curva" value={last?.migrated ? "graduou" : last?.curveProgress != null ? fmt.pct1(last.curveProgress) : "—"} hint={last?.migrated ? "LP travada no DAMM v2" : "progresso até a migração"} />
        <Stat label="Volume 24 h" value={fmt.usd(last?.volume24hUsd)} hint={last?.buys24h != null ? `${fmt.num(last.buys24h)} compras / ${fmt.num(last.sells24h)} vendas` : ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Taxas a reclamar" value={s.unclaimedUsd == null ? "—" : fmt.usd2(s.unclaimedUsd)} hint={last?.feesUnclaimedSol != null ? `${last.feesUnclaimedSol.toFixed(4)} SOL` : "lido on-chain"} tone="beam" />
        <Stat
          label={publicView ? "Taxas já reclamadas (on-chain)" : "Taxas recebidas"}
          value={publicView ? (onChainClaimedUsd == null ? "—" : fmt.usd2(onChainClaimedUsd)) : fmt.usd2(s.claimedUsd)}
          hint={last?.feesClaimedSol != null ? `${last.feesClaimedSol.toFixed(4)} SOL reclamados on-chain no total` : ""}
        />
        {!publicView && (
          <>
            <Stat label="Custos" value={fmt.usd2(s.costsUsd)} hint="domínio, rent, marketing lançados" />
            <Stat label="Lucro em caixa" value={fmt.usd2(s.cashProfitUsd)} tone={s.cashProfitUsd >= 0 ? "good" : "bad"} hint={s.potentialProfitUsd == null ? "" : `se reclamar agora: ${fmt.usd2(s.potentialProfitUsd)}`} />
          </>
        )}
      </div>

      <Sparkline snaps={d.snapshots} />

      {msg && <p className="text-sm text-mist">{msg}</p>}

      <div className="card p-4">
        <h3 className="font-semibold">Linha do tempo</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {s.events.map((e) => (
            <li key={e.at + e.kind} className="flex gap-3">
              <span className="mono shrink-0 text-xs text-mist">{new Date(e.at).toLocaleString("pt-BR")}</span>
              <span>
                <strong>{e.kind}</strong> — {e.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Sparkline({ snaps }: { snaps: Snapshot[] }) {
  const pts = snaps.filter((s) => s.priceUsd != null);
  if (pts.length < 2) return <p className="text-xs text-mist">Gráfico aparece após duas leituras com preço.</p>;
  const w = 800;
  const h = 120;
  const ys = pts.map((p) => p.priceUsd!);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.priceUsd! - min) / (max - min || 1)) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="card p-4">
      <div className="flex justify-between text-xs text-mist">
        <span>Preço (US$) — {pts.length} leituras</span>
        <span>
          {fmt.price(min)} – {fmt.price(max)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-28 w-full" role="img" aria-label="Série de preço">
        <path d={path} fill="none" stroke="var(--tide)" strokeWidth="2" />
      </svg>
    </div>
  );
}
