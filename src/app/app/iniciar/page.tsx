import Link from "next/link";
import { StartForm } from "@/components/StartForm";
import { Pill, Section } from "@/components/ui";
import { listRuns } from "@/lib/launcher/store";
import { STEP_TITLE } from "@/lib/launcher/types";

export const metadata = { title: "Iniciar projeto" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const runs = await listRuns();
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Iniciar projeto</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Um brief de três linhas vira projeto completo: identidade, carteiras cifradas, site publicado, domínio, kit social,
          curva com taxa própria, lançamento na Meteora DBC, listagem e acompanhamento até o lucro em caixa. Cada passo fica
          registrado; o que precisa de você (SOL, confirmação, chave) para em espera e explica o que falta.
        </p>
      </div>

      <StartForm />

      <Section title="Execuções" lead="Clique para ver o progresso ao vivo, destravar passos e acompanhar o projeto.">
        {runs.length === 0 ? (
          <p className="text-sm text-mist">Nenhuma ainda.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Estado</th>
                  <th>Passo atual</th>
                  <th>Progresso</th>
                  <th>Criado</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const done = r.steps.filter((s) => s.status === "concluido" || s.status === "pulado").length;
                  const cur = r.steps.find((s) => s.status !== "concluido" && s.status !== "pulado");
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/app/iniciar/${r.id}`} className="font-medium underline-offset-2 hover:underline">
                          {r.brief.name} <span className="text-mist">${r.brief.ticker}</span>
                        </Link>
                      </td>
                      <td>
                        <Pill tone={r.status === "concluido" ? "good" : r.status === "falhou" ? "bad" : r.status === "espera" ? "beam" : "tide"}>{r.status}</Pill>
                      </td>
                      <td>{cur ? STEP_TITLE[cur.id] : "—"}</td>
                      <td className="num">
                        {done}/{r.steps.length}
                      </td>
                      <td className="text-xs text-mist">{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
