"use client";

import { useMemo, useState } from "react";
import {
  APP_PLATFORM_FEE,
  CURVE_FEE,
  creatorRate,
  GRADUATION_FEE_SOL,
  PUMP_FEES,
  SOL_TIERS,
  tierFor,
  totalRate,
  type Phase,
  type Quote,
} from "@/lib/adapters/pumpfees";
import { fmt } from "@/lib/format";
import { Alert, Field, SourceStamp, Stat } from "./ui";

export function FeesCalculator() {
  const [phase, setPhase] = useState<Phase>("pumpswap");
  const [quote, setQuote] = useState<Quote>("SOL");
  const [mcap, setMcap] = useState(900);
  const [volume, setVolume] = useState(250_000);
  const [share, setShare] = useState(1);

  const r = useMemo(() => {
    const cr = creatorRate(phase, mcap, quote);
    const tr = totalRate(phase, mcap, quote);
    return { cr, tr, revenue: volume * cr * share, tier: phase === "pumpswap" ? tierFor(mcap, quote) : null };
  }, [phase, quote, mcap, volume, share]);

  // Cenários: o mesmo volume em três fases diferentes mostra por que 0,30% fixo está errado.
  const scenarios = [
    { label: "Na curva", rate: CURVE_FEE.creator },
    { label: "PumpSwap, 420–1470 SOL", rate: 0.0095 },
    { label: "PumpSwap, acima de 98 240 SOL", rate: 0.0005 },
  ];

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Fase">
          <select className="input" value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
            <option value="curva">Curva (bonding curve)</option>
            <option value="pumpswap">PumpSwap (pool canônico)</option>
          </select>
        </Field>
        <Field label="Ativo de cotação">
          <select className="input" value={quote} onChange={(e) => setQuote(e.target.value as Quote)}>
            <option value="SOL">SOL</option>
            <option value="USDC">USDC</option>
          </select>
        </Field>
        <Field label={`Market cap (${quote})`} hint="preço × 1 bilhão de tokens">
          <input className="input num" type="number" min={0} value={mcap} disabled={phase === "curva"} onChange={(e) => setMcap(Number(e.target.value))} />
        </Field>
        <Field label="Volume elegível (US$)" hint="cada negociação contada uma vez">
          <input className="input num" type="number" min={0} step={1000} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </Field>
        <Field label="Parcela recebida" hint="1 = integral; menos se houver sócios ou Holder Rewards">
          <input className="input num" type="number" min={0} max={1} step={0.05} value={share} onChange={(e) => setShare(Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Taxa do criador nesta fase" value={fmt.pct(r.cr)} tone="beam" hint={r.tier ? `faixa até ${Number.isFinite(r.tier.upTo) ? fmt.num(r.tier.upTo) : "∞"} ${quote}` : "fixa enquanto na curva"} />
        <Stat label="Taxa total cobrada do trader" value={fmt.pct(r.tr)} hint="criador + protocolo + LP; sem a taxa do app" />
        <Stat label="Receita do criador no volume informado" value={fmt.usd2(r.revenue)} hint="antes de impostos; só vira caixa quando reclamada" />
      </div>

      <SourceStamp source={`${PUMP_FEES.name} (atualizada em ${PUMP_FEES.updatedAt})`} url={PUMP_FEES.url} />

      <Alert tone="info">
        A taxa não é 0,30% para sempre. Na curva é 0,30%; logo após a migração, entre 420 e 1 470 SOL de market cap, sobe para 0,95%;
        depois cai por faixas até 0,05%. Graduação custa {GRADUATION_FEE_SOL} SOL. Desde 17/10/2026 o app Pump.fun cobra ainda{" "}
        {fmt.pct(APP_PLATFORM_FEE.withoutReferral)} do trader (não é receita do criador).
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-sm text-ink-soft">{s.label}</div>
            <div className="num mt-1 text-xl font-semibold">{fmt.usd2(volume * s.rate * share)}</div>
            <div className="text-xs text-mist">{fmt.pct(s.rate)} de {fmt.usd(volume)}</div>
          </div>
        ))}
      </div>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Tabela completa para moedas pareadas com SOL</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Market cap até (SOL)</th>
                <th>Criador</th>
                <th>Protocolo</th>
                <th>LP</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {SOL_TIERS.map((t, i) => (
                <tr key={i}>
                  <td className="num">{Number.isFinite(t.upTo) ? fmt.num(t.upTo) : "acima de 98 240"}</td>
                  <td className="num">{fmt.pct(t.creator)}</td>
                  <td className="num">{fmt.pct(t.protocol)}</td>
                  <td className="num">{fmt.pct(t.lp)}</td>
                  <td className="num">{fmt.pct(t.creator + t.protocol + t.lp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
