import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mark } from "@/components/Logo";
import { MarketView } from "@/components/MarketView";
import { TrackPanel } from "@/components/TrackPanel";
import { Pill, Section } from "@/components/ui";
import { fmt } from "@/lib/format";
import { ROLE_LABEL, STAGE_LABEL } from "@/lib/projects/schema";
import { getProject } from "@/lib/projects/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  return { title: p ? `${p.name} ($${p.ticker})` : "Projeto" };
}

export default async function ProjectSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();

  const links = Object.entries(p.links).filter(([, v]) => v) as [string, string][];

  return (
    <div className="min-h-dvh" style={{ ["--accent" as string]: p.accent }}>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-ink" style={{ backgroundColor: p.accent }}>
              {p.ticker.slice(0, 2)}
            </span>
            <div>
              <div className="display text-lg font-bold leading-tight">{p.name}</div>
              <div className="text-xs text-mist">${p.ticker} · Solana</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="tide">{STAGE_LABEL[p.stage]}</Pill>
            <Link href="/" className="hidden items-center gap-1 text-xs text-mist sm:inline-flex" title="Publicado com o AtlasMeme">
              <Mark size={18} /> AtlasMeme
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-5 py-10">
        <section>
          <h1 className="display text-4xl font-bold leading-tight sm:text-5xl">{p.tagline || p.name}</h1>
          {p.about && <p className="mt-4 max-w-2xl whitespace-pre-line text-ink-soft">{p.about}</p>}
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {links.map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" className="btn btn-ghost text-sm">
                  {k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}
                </a>
              ))}
            </div>
          )}
        </section>

        <Section title="Token" lead={p.mint ? "Identidade técnica é o endereço do mint, não o nome." : "Ainda sem token. O site existe antes do mint — é assim que a comunidade se prova."}>
          {p.mint ? (
            <>
              <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-xs text-mist">Mint</div>
                  <div className="mono">{p.mint}</div>
                </div>
                <div className="flex gap-2 text-sm">
                  <a className="underline" href={`https://solscan.io/token/${p.mint}`} target="_blank" rel="noreferrer">
                    Solscan
                  </a>
                  <a className="underline" href={`https://dexscreener.com/solana/${p.mint}`} target="_blank" rel="noreferrer">
                    DEX Screener
                  </a>
                </div>
              </div>
              <MarketView mint={p.mint} />
              {p.launch?.poolAddress && (
                <p className="text-xs text-mist">
                  Lançado na Meteora DBC em {p.launch.launchedAt ? new Date(p.launch.launchedAt).toLocaleString("pt-BR") : "—"} · taxa {p.launch.tradingFeeBps / 100}% por negociação ·{" "}
                  <a className="underline" href={`https://solscan.io/account/${p.launch.poolAddress}`} target="_blank" rel="noreferrer">
                    pool
                  </a>
                  {p.launch.txSignature && (
                    <>
                      {" · "}
                      <a className="underline" href={`https://solscan.io/tx/${p.launch.txSignature}`} target="_blank" rel="noreferrer">
                        transação
                      </a>
                    </>
                  )}
                </p>
              )}
              {p.tracking && <TrackPanel slug={p.slug} publicView />}
            </>
          ) : (
            <div className="card p-5 text-sm text-ink-soft">
              Plataforma prevista: <strong>{p.launchpad === "nenhum" ? "ainda não definida" : p.launchpad}</strong>. Quando o token for lançado, o mint entra aqui e esta seção passa a ler preço, liquidez e autoridades ao vivo.
            </div>
          )}
        </Section>

        <Section title="Tesouraria e carteiras da equipe" lead="Tudo que a equipe controla, identificado por função.">
          {p.wallets.length === 0 ? (
            <div className="card p-5 text-sm text-mist">Nenhuma carteira declarada ainda.</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Função</th>
                    <th>Rótulo</th>
                    <th>Endereço</th>
                    <th>Evidência</th>
                  </tr>
                </thead>
                <tbody>
                  {p.wallets.map((w) => (
                    <tr key={w.address}>
                      <td>
                        <Pill tone={w.role === "tesouraria" ? "tide" : w.role === "equipe" ? "beam" : "neutral"}>{ROLE_LABEL[w.role]}</Pill>
                      </td>
                      <td>{w.label || "—"}</td>
                      <td>
                        <a className="mono underline-offset-2 hover:underline" href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer">
                          {w.address}
                        </a>
                      </td>
                      <td>
                        {w.evidenceUrl ? (
                          <a className="underline" href={w.evidenceUrl} target="_blank" rel="noreferrer">
                            abrir
                          </a>
                        ) : (
                          <span className="text-mist">pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Oferta e alocações" lead={`Oferta total declarada: ${fmt.num(p.supply.total)} tokens.`}>
          <div className="card p-5">
            <div className="flex h-4 overflow-hidden rounded-full bg-foam-2">
              {p.supply.allocations.map((a, i) => (
                <div key={a.name} style={{ width: `${a.pct}%`, backgroundColor: i % 3 === 0 ? "var(--tide)" : i % 3 === 1 ? p.accent : "var(--ink-soft)" }} title={`${a.name}: ${a.pct}%`} />
              ))}
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {p.supply.allocations.map((a) => (
                <li key={a.name} className="flex items-start justify-between gap-3 rounded-lg bg-foam px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{a.name}</span>
                    {a.vesting && <span className="block text-xs text-mist">{a.vesting}</span>}
                  </span>
                  <span className="num font-semibold">{a.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Políticas">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Autoridade de emissão", p.policies.mintAuthority.replace("nao-informada", "não informada")],
              ["Autoridade de congelamento", p.policies.freezeAuthority.replace("nao-informada", "não informada")],
              ["Liquidez", p.policies.liquidity || "não informada"],
              ["Vendas da equipe", p.policies.teamSales || "não informada"],
              ["Uso das taxas do criador", p.policies.feesUse || "não informado"],
            ].map(([t, d]) => (
              <div key={t} className="card p-4">
                <dt className="text-sm text-mist">{t}</dt>
                <dd className="mt-1 text-sm">{d}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Avisos">
          <ul className="card list-disc space-y-1 p-5 pl-9 text-sm text-ink-soft">
            {p.disclosures.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-mist">
          <span>
            Atualizado em {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("pt-BR") : "—"} · publicado com{" "}
            <Link href="/" className="underline">
              AtlasMeme
            </Link>
          </span>
          <span>Dados de terceiros podem atrasar; a hora da leitura aparece ao lado de cada número.</span>
        </div>
      </footer>
    </div>
  );
}
