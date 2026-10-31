"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FinanceOverview } from "@/lib/finance";
import { fmt } from "@/lib/format";
import { Alert, Field, Section, Stat } from "./ui";

/** Financeiro consolidado: lucro em caixa, custos por projeto, infra fixa e lançamentos manuais. */
export function FinancePanel() {
  const [d, setD] = useState<FinanceOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/finance")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Erro");
        setD(j);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Erro"));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return <Alert tone="bad">{err}</Alert>;
  if (!d) return <p className="text-sm text-mist">Carregando financeiro…</p>;
  const t = d.totals;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Taxas recebidas" value={fmt.usd2(t.claimedUsd)} hint="já em caixa (reclamadas)" />
        <Stat label="A reclamar" value={fmt.usd2(t.unclaimedUsd)} tone="beam" hint="acumulado on-chain, ainda no protocolo" />
        <Stat label="Custos dos projetos" value={fmt.usd2(t.costsProjectsUsd)} hint="domínio, rent, marketing, lançamentos" />
        <Stat label="Lucro em caixa" value={fmt.usd2(t.cashProfitUsd)} tone={t.cashProfitUsd >= 0 ? "good" : "bad"} hint="recebido − custos dos projetos" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Infra fixa" value={`${fmt.usd2(t.fixedMonthlyUsd)}/mês`} hint={`${fmt.usd2(t.burnPerDayUsd)} por dia · ${fmt.usd2(t.fixedToDateUsd)} consumidos até hoje`} />
        <Stat label="Infra avulsa" value={fmt.usd2(t.infraEntriesUsd)} hint="lançamentos gerais sem projeto" />
        <Stat label="Resultado líquido" value={fmt.usd2(t.netResultUsd)} tone={t.netResultUsd >= 0 ? "good" : "bad"} hint={`se reclamar tudo: ${fmt.usd2(t.potentialNetUsd)}`} />
        <Stat label="Saldo nas carteiras" value={t.walletsUsd == null ? "—" : fmt.usd2(t.walletsUsd)} hint={`${t.walletsSol.toFixed(4)} SOL · SOL ${d.solUsd ? fmt.usd2(d.solUsd) : "—"}`} />
      </div>

      <Section title="Por projeto" lead="O que cada sistema completo deu e consumiu. Lucro é caixa: taxas reclamadas menos custos. Posição em token não entra.">
        {d.projects.length === 0 ? (
          <p className="text-sm text-mist">Nenhum projeto.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Desde</th>
                  <th className="text-right">Custos</th>
                  <th className="text-right">Recebido</th>
                  <th className="text-right">A reclamar</th>
                  <th className="text-right">Lucro em caixa</th>
                  <th className="text-right">Se reclamar</th>
                  <th className="text-right">Carteiras</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.projects.map((p) => (
                  <Row key={p.slug} p={p} open={open === p.slug} toggle={() => setOpen(open === p.slug ? null : p.slug)} onChange={load} />
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={2}>Total</td>
                  <td className="num text-right">{fmt.usd2(t.costsProjectsUsd)}</td>
                  <td className="num text-right">{fmt.usd2(t.claimedUsd)}</td>
                  <td className="num text-right">{fmt.usd2(t.unclaimedUsd)}</td>
                  <td className={`num text-right ${t.cashProfitUsd >= 0 ? "text-ok" : "text-rock"}`}>{fmt.usd2(t.cashProfitUsd)}</td>
                  <td className="num text-right">{fmt.usd2(t.claimedUsd + t.unclaimedUsd - t.costsProjectsUsd)}</td>
                  <td className="num text-right">{t.walletsUsd == null ? "—" : fmt.usd2(t.walletsUsd)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Infra fixa (mensal)" lead="VM, RPC, domínio-base. Rateada por dia desde a data de início.">
          <FixedCosts d={d} onChange={load} />
        </Section>
        <Section title="Lançar custo" lead="Despesa de um projeto (marketing, design, ads) ou geral.">
          <EntryForm projects={d.projects.map((p) => ({ slug: p.slug, name: p.name }))} onChange={load} />
          {d.infraEntries.length > 0 && (
            <ul className="card divide-y divide-line text-sm">
              {d.infraEntries
                .slice()
                .reverse()
                .map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span>
                      {e.item} <span className="text-xs text-mist">{new Date(e.at).toLocaleDateString("pt-BR")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="num">{fmt.usd2(e.usd)}</span>
                      <RemoveBtn kind="lancamento" id={e.id} onChange={load} />
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>
      <p className="text-xs text-mist">Atualizado às {fmt.time(d.at)}. Saldos de carteira lidos na rede (cache 60 s); taxas a reclamar vêm do último snapshot do monitor.</p>
    </div>
  );
}

function Row({ p, open, toggle, onChange }: { p: FinanceOverview["projects"][number]; open: boolean; toggle: () => void; onChange: () => void }) {
  return (
    <>
      <tr>
        <td>
          <Link href={`/p/${p.slug}`} className="font-medium hover:underline" target="_blank">
            {p.name}
          </Link>
          <div className="text-xs text-mist">
            ${p.ticker} · {p.stage}
            {p.market.migrated ? " · graduou" : p.market.curveProgress != null ? ` · curva ${fmt.pct1(p.market.curveProgress)}` : ""}
          </div>
        </td>
        <td className="text-xs text-mist">{p.startedAt ? new Date(p.startedAt).toLocaleDateString("pt-BR") : "—"}</td>
        <td className="num text-right">{fmt.usd2(p.costs.total)}</td>
        <td className="num text-right">{fmt.usd2(p.claimedUsd)}</td>
        <td className="num text-right">{p.unclaimedUsd == null ? "—" : fmt.usd2(p.unclaimedUsd)}</td>
        <td className={`num text-right font-semibold ${p.cashProfitUsd > 0 ? "text-ok" : p.cashProfitUsd < 0 ? "text-rock" : ""}`}>{fmt.usd2(p.cashProfitUsd)}</td>
        <td className="num text-right">{p.potentialProfitUsd == null ? "—" : fmt.usd2(p.potentialProfitUsd)}</td>
        <td className="num text-right">{p.walletsUsd == null ? "—" : fmt.usd2(p.walletsUsd)}</td>
        <td className="text-right">
          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={toggle}>
            {open ? "Fechar" : "Detalhe"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} className="bg-foam">
            <div className="grid gap-4 p-2 text-sm md:grid-cols-2">
              <div>
                <h4 className="font-semibold">Custos lançados</h4>
                {p.costs.items.length === 0 ? (
                  <p className="text-xs text-mist">Nenhum.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {p.costs.items.map((c, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {c.item} <span className="text-xs text-mist">· {c.source} · {new Date(c.at).toLocaleDateString("pt-BR")}</span>
                        </span>
                        <span className="num">{fmt.usd2(c.usd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <EntryForm projects={[{ slug: p.slug, name: p.name }]} fixedSlug={p.slug} onChange={onChange} compact />
                </div>
              </div>
              <div>
                <h4 className="font-semibold">Carteiras e mercado</h4>
                <ul className="mt-1 space-y-1">
                  {p.wallets.map((w) => (
                    <li key={w.pubkey} className="flex justify-between gap-2">
                      <a className="mono text-xs underline-offset-2 hover:underline" href={`https://solscan.io/account/${w.pubkey}`} target="_blank" rel="noreferrer">
                        {w.role} · {fmt.short(w.pubkey, 6)}
                      </a>
                      <span className="num">{w.sol == null ? "—" : `${w.sol.toFixed(4)} SOL`}</span>
                    </li>
                  ))}
                  {p.wallets.length === 0 && <li className="text-xs text-mist">Sem carteiras no cofre.</li>}
                </ul>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-mist">Preço</dt>
                  <dd className="num">{fmt.price(p.market.priceUsd)}</dd>
                  <dt className="text-mist">Liquidez</dt>
                  <dd className="num">{fmt.usd(p.market.liquidityUsd)}</dd>
                  <dt className="text-mist">Volume 24 h</dt>
                  <dd className="num">{fmt.usd(p.market.volume24hUsd)}</dd>
                  <dt className="text-mist">Taxas geradas (total)</dt>
                  <dd className="num">{p.feesTotalSol == null ? "—" : `${p.feesTotalSol.toFixed(4)} SOL`}</dd>
                </dl>
                {p.runId && (
                  <Link href={`/app/iniciar/${p.runId}`} className="mt-2 inline-block text-xs underline">
                    Ver execução
                  </Link>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FixedCosts({ d, onChange }: { d: FinanceOverview; onChange: () => void }) {
  const [item, setItem] = useState("");
  const [usd, setUsd] = useState("");
  const [since, setSince] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/finance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "fixo", data: { item, usdMonth: Number(usd), since: new Date(since).toISOString() } }) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error ?? "Erro");
    setItem("");
    setUsd("");
    setMsg(null);
    onChange();
  }

  return (
    <div className="space-y-3">
      {d.fixed.length > 0 && (
        <ul className="card divide-y divide-line text-sm">
          {d.fixed.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-2">
              <span>
                {f.item} <span className="text-xs text-mist">desde {new Date(f.since).toLocaleDateString("pt-BR")}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="num">{fmt.usd2(f.usdMonth)}/mês</span>
                <RemoveBtn kind="fixo" id={f.id} onChange={onChange} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-[1fr_120px_150px_auto] sm:items-end">
        <Field label="Item">
          <input className="input" value={item} onChange={(e) => setItem(e.target.value)} placeholder="VM, Helius, domínio-base…" required minLength={2} />
        </Field>
        <Field label="US$/mês">
          <input className="input num" type="number" min={0} step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} required />
        </Field>
        <Field label="Desde">
          <input className="input" type="date" value={since} onChange={(e) => setSince(e.target.value)} required />
        </Field>
        <button className="btn btn-primary">Adicionar</button>
        {msg && <p className="text-xs text-rock sm:col-span-4">{msg}</p>}
      </form>
    </div>
  );
}

function EntryForm({ projects, fixedSlug, onChange, compact }: { projects: { slug: string; name: string }[]; fixedSlug?: string; onChange: () => void; compact?: boolean }) {
  const [slug, setSlug] = useState<string>(fixedSlug ?? "");
  const [item, setItem] = useState("");
  const [usd, setUsd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/finance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "lancamento", data: { slug: slug || null, item, usd: Number(usd) } }) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error ?? "Erro");
    setItem("");
    setUsd("");
    setMsg(null);
    onChange();
  }

  return (
    <form onSubmit={add} className={`card grid gap-3 p-4 ${compact ? "sm:grid-cols-[1fr_120px_auto]" : "sm:grid-cols-[180px_1fr_120px_auto]"} sm:items-end`}>
      {!fixedSlug && (
        <Field label="Projeto">
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="">Geral / infra</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Item">
        <input className="input" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ads, design, KOL…" required minLength={2} />
      </Field>
      <Field label="US$">
        <input className="input num" type="number" min={0} step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} required />
      </Field>
      <button className="btn btn-primary">Lançar</button>
      {msg && <p className="text-xs text-rock sm:col-span-4">{msg}</p>}
    </form>
  );
}

function RemoveBtn({ kind, id, onChange }: { kind: "fixo" | "lancamento"; id: string; onChange: () => void }) {
  return (
    <button
      className="btn btn-ghost px-2 py-0.5 text-xs text-rock"
      title="Remover"
      onClick={async () => {
        if (!confirm("Remover este lançamento?")) return;
        await fetch(`/api/finance?kind=${kind}&id=${id}`, { method: "DELETE" });
        onChange();
      }}
    >
      ×
    </button>
  );
}
