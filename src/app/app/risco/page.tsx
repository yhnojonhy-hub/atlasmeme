import { RiskCalc } from "@/components/RiskCalc";
import { Section } from "@/components/ui";

export const metadata = { title: "Risco" };

const CHECKS = [
  ["Autoridade de emissão", "Revogada e verificável no mint. Revogar emissão não prova liquidez bloqueada."],
  ["Autoridade de congelamento", "Revogada, salvo justificativa publicada."],
  ["Token-2022", "Sem hooks de transferência ou taxa no token, salvo documentado."],
  ["Concentração conhecida", "Carteiras da equipe e tesouraria declaradas; top 10 fora do pool dentro da política."],
  ["Liquidez", "Pool canônico identificado; LP queimada ou bloqueio com prazo e prova."],
  ["Desbloqueios", "Calendário de vesting público com datas e quantidades."],
  ["Dados", "Hora da leitura visível; divergência entre fontes gera alerta, não silêncio."],
  ["Provedores", "RPC e indexador com estado na aba APIs; falha não vira “token morto”."],
];

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Risco</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Quanto do market cap é dinheiro de verdade, e o que precisa estar certo antes de alguém confiar no projeto.
        </p>
      </div>

      <Section title="Saída em um pool de produto constante" lead="Quanto sai de caixa ao vender uma posição. Mede risco; não é estratégia de venda.">
        <RiskCalc />
      </Section>

      <Section title="Lista de verificação" lead="O que o site do projeto precisa mostrar e o que a equipe precisa provar.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {CHECKS.map(([t, d]) => (
            <li key={t} className="card p-4">
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
