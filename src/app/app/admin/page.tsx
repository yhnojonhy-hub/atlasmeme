import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersPanel } from "@/components/UsersPanel";
import { Pill, Section, Stat } from "@/components/ui";
import { financeOverview } from "@/lib/finance";
import { fmt } from "@/lib/format";
import { listRuns } from "@/lib/launcher/store";
import { STEP_TITLE } from "@/lib/launcher/types";
import { STAGE_LABEL } from "@/lib/projects/schema";
import { currentUser } from "@/lib/session";
import { listUsers } from "@/lib/users";
import { listWallets } from "@/lib/wallets/vault";

export const metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await currentUser();
  if (!me || me.session.role !== "admin") redirect("/app/iniciar");

  const [ov, runs, wallets, users] = await Promise.all([financeOverview({ balances: false }), listRuns(), listWallets(), listUsers()]);
  const launched = ov.projects.filter((p) => p.mint);
  const graduated = ov.projects.filter((p) => p.market.migrated);
  const sites = ov.projects.reduce((a, p) => a + Math.max(1, p.hostnames.length), 0);
  const socials = ov.projects.reduce((a, p) => a + Object.values(p.links).filter(Boolean).length, 0);
  const waiting = runs.filter((r) => r.status === "espera");
  const failed = runs.filter((r) => r.status === "falhou");
  const running = runs.filter((r) => r.status === "executando");

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Visão geral</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Tudo que o sistema criou: moedas, sites, redes, carteiras e execuções — e o que cada um está dando ou consumindo.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projetos" value={ov.totals.projects} hint={`${launched.length} com token · ${graduated.length} graduados`} />
        <Stat label="Sites publicados" value={sites} hint={`${ov.projects.reduce((a, p) => a + p.hostnames.length, 0)} com domínio/subdomínio próprio`} />
        <Stat label="Redes ligadas" value={socials} hint="X, Telegram, Discord declarados" />
        <Stat label="Carteiras no cofre" value={wallets.length} hint={`${users.length} usuário(s) do painel`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lucro em caixa" value={fmt.usd2(ov.totals.cashProfitUsd)} tone={ov.totals.cashProfitUsd >= 0 ? "good" : "bad"} hint="taxas recebidas − custos dos projetos" />
        <Stat label="A reclamar" value={fmt.usd2(ov.totals.unclaimedUsd)} tone="beam" hint="taxas acumuladas on-chain" />
        <Stat label="Resultado líquido" value={fmt.usd2(ov.totals.netResultUsd)} tone={ov.totals.netResultUsd >= 0 ? "good" : "bad"} hint="inclui infra fixa rateada" />
        <Stat
          label="Execuções"
          value={runs.length}
          hint={
            <>
              {running.length} rodando · <span className={waiting.length ? "text-beam-deep" : ""}>{waiting.length} em espera</span> · <span className={failed.length ? "text-rock" : ""}>{failed.length} falhou</span>
            </>
          }
        />
      </div>

      <Section
        title="Projetos"
        lead="Uma linha por sistema completo criado. Clique no nome para o site, na execução para destravar passos."
        aside={
          <Link href="/app/financeiro" className="btn btn-ghost text-sm">
            Detalhe financeiro
          </Link>
        }
      >
        {ov.projects.length === 0 ? (
          <p className="text-sm text-mist">Nenhum projeto ainda.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Estágio</th>
                  <th>Token</th>
                  <th>Mercado</th>
                  <th>Site / redes</th>
                  <th>Execução</th>
                  <th className="text-right">Custos</th>
                  <th className="text-right">Caixa</th>
                </tr>
              </thead>
              <tbody>
                {ov.projects.map((p) => {
                  const run = runs.find((r) => r.id === p.runId);
                  const cur = run?.steps.find((s) => s.status !== "concluido" && s.status !== "pulado");
                  return (
                    <tr key={p.slug}>
                      <td>
                        <Link href={`/p/${p.slug}`} className="font-medium hover:underline" target="_blank">
                          {p.name}
                        </Link>
                        <div className="text-xs text-mist">
                          ${p.ticker} · {p.venue}
                        </div>
                      </td>
                      <td>
                        <Pill tone={p.stage === "lancado" ? "good" : p.stage === "encerrado" ? "bad" : "tide"}>{STAGE_LABEL[p.stage]}</Pill>
                      </td>
                      <td className="text-xs">
                        {p.mint ? (
                          <>
                            <a className="mono underline-offset-2 hover:underline" href={`https://solscan.io/token/${p.mint}`} target="_blank" rel="noreferrer">
                              {fmt.short(p.mint, 6)}
                            </a>
                            <div className="text-mist">{p.market.migrated ? "graduou" : p.market.curveProgress != null ? `curva ${fmt.pct1(p.market.curveProgress)}` : p.tracking ? "monitorando" : "sem leitura"}</div>
                          </>
                        ) : (
                          <span className="text-mist">sem token</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {p.market.priceUsd != null ? (
                          <>
                            <div className="num">{fmt.price(p.market.priceUsd)}</div>
                            <div className="text-mist">
                              liq {fmt.usd(p.market.liquidityUsd)} · vol {fmt.usd(p.market.volume24hUsd)}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-xs">
                        <div>{p.hostnames.length ? p.hostnames.join(", ") : `/p/${p.slug}`}</div>
                        <div className="flex gap-2 text-mist">
                          {Object.entries(p.links)
                            .filter(([, v]) => v)
                            .map(([k, v]) => (
                              <a key={k} href={v} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                                {k}
                              </a>
                            ))}
                          {!Object.values(p.links).some(Boolean) && "sem redes"}
                        </div>
                      </td>
                      <td className="text-xs">
                        {run ? (
                          <Link href={`/app/iniciar/${run.id}`} className="hover:underline">
                            <Pill tone={run.status === "concluido" ? "good" : run.status === "falhou" ? "bad" : run.status === "espera" ? "beam" : "tide"}>{run.status}</Pill>
                            {cur && <div className="mt-1 text-mist">{STEP_TITLE[cur.id]}</div>}
                          </Link>
                        ) : (
                          <span className="text-mist">manual</span>
                        )}
                      </td>
                      <td className="num text-right">{fmt.usd2(p.costs.total)}</td>
                      <td className={`num text-right font-semibold ${p.cashProfitUsd > 0 ? "text-ok" : p.cashProfitUsd < 0 ? "text-rock" : ""}`}>{fmt.usd2(p.cashProfitUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Carteiras criadas pelo sistema" lead="Todas cifradas no cofre; declaradas por função no site de cada projeto.">
        {wallets.length === 0 ? (
          <p className="text-sm text-mist">Nenhuma ainda.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Função</th>
                  <th>Endereço</th>
                  <th>Criada</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.pubkey}>
                    <td>{w.slug}</td>
                    <td>{w.role}</td>
                    <td>
                      <a className="mono text-xs underline-offset-2 hover:underline" href={`https://solscan.io/account/${w.pubkey}`} target="_blank" rel="noreferrer">
                        {w.pubkey}
                      </a>
                    </td>
                    <td className="text-xs text-mist">{new Date(w.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Usuários do painel" lead="Administradores veem tudo; operadores só operam projetos.">
        <UsersPanel meId={me.user?.id ?? "local"} />
      </Section>
    </>
  );
}
