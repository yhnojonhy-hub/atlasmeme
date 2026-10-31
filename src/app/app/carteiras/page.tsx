import Link from "next/link";
import { Alert, Empty, Pill, Section } from "@/components/ui";
import { fmt } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/projects/schema";
import { listProjects } from "@/lib/projects/store";

export const metadata = { title: "Carteiras" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const { projeto } = await searchParams;
  const projects = await listProjects();
  const current = projects.find((p) => p.slug === projeto) ?? projects[0];

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Carteiras declaradas</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Quem é quem, por função: equipe, tesouraria, vesting, liquidez. Tudo que a equipe controla aparece como
          parte relacionada. Dividir saldo entre endereços não muda quem controla.
        </p>
      </div>

      {projects.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Projetos">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/app/carteiras?projeto=${p.slug}`}
              className={`pill ${p.slug === current?.slug ? "bg-ink text-foam" : "bg-foam-2 text-ink-soft"}`}
            >
              {p.name}
            </Link>
          ))}
        </nav>
      )}

      {!current ? (
        <Empty title="Nenhum projeto ainda" body="Crie um site de projeto para declarar as carteiras." action={<Link href="/novo" className="btn btn-primary">Criar site de projeto</Link>} />
      ) : (
        <>
          <Section
            title={`${current.name} · $${current.ticker}`}
            lead="Cada endereço tem função, rótulo e, quando houver, evidência (link para multisig, contrato de vesting ou anúncio)."
            aside={
              <Link href={`/p/${current.slug}`} className="btn btn-ghost text-sm">
                Ver site público
              </Link>
            }
          >
            {current.wallets.length === 0 ? (
              <Empty title="Sem carteiras declaradas" body="Adicione as carteiras da equipe, tesouraria e vesting no cadastro do projeto." />
            ) : (
              <div className="card overflow-x-auto">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Função</th>
                      <th>Rótulo</th>
                      <th>Endereço</th>
                      <th>Evidência</th>
                      <th>Explorador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.wallets.map((w) => (
                      <tr key={w.address}>
                        <td>
                          <Pill tone={w.role === "tesouraria" ? "tide" : w.role === "equipe" ? "beam" : "neutral"}>{ROLE_LABEL[w.role]}</Pill>
                        </td>
                        <td>{w.label || "—"}</td>
                        <td className="mono">{w.address}</td>
                        <td>
                          {w.evidenceUrl ? (
                            <a className="underline" href={w.evidenceUrl} target="_blank" rel="noreferrer">
                              abrir
                            </a>
                          ) : (
                            <span className="text-mist">pendente</span>
                          )}
                        </td>
                        <td>
                          <a className="underline" href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer">
                            Solscan
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Alocações e vesting" lead={`Oferta total declarada: ${fmt.num(current.supply.total)} tokens.`}>
            {current.supply.allocations.length === 0 ? (
              <Empty title="Sem alocações declaradas" body="Informe como a oferta se divide e quais partes têm bloqueio." />
            ) : (
              <div className="card p-5">
                <div className="flex h-4 overflow-hidden rounded-full bg-foam-2">
                  {current.supply.allocations.map((a, i) => (
                    <div
                      key={a.name}
                      style={{ width: `${a.pct}%`, backgroundColor: i % 3 === 0 ? "var(--tide)" : i % 3 === 1 ? "var(--beam)" : "var(--ink-soft)" }}
                      title={`${a.name}: ${a.pct}%`}
                    />
                  ))}
                </div>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {current.supply.allocations.map((a) => (
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
            )}
          </Section>

          <Alert tone="info">
            Regras do Farol para carteiras: toda carteira controlada pela equipe é declarada por função; nenhuma carteira da
            equipe é apresentada como usuário independente; vendas da equipe seguem a política publicada ({current.policies.teamSales || "ainda não informada"}).
          </Alert>
        </>
      )}
    </>
  );
}
