import { LaunchChecklist } from "@/components/LaunchChecklist";
import { Section } from "@/components/ui";

export const metadata = { title: "Lançamento" };

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Lançamento</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Da descoberta ao dia 90. O token sai na Meteora quando o lançamento está ligado, a carteira de operação tem SOL e você confirma.
        </p>
      </div>

      <Section title="Onde o token é emitido" lead="O caminho padrão é a Meteora DBC. Pump.fun e Raydium ficam aqui como referência de taxa.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <div className="font-semibold">Pump.fun</div>
            <p className="mt-1 text-sm text-ink-soft">Sem taxa de criação. Curva → PumpSwap com LP queimada. Taxa do criador por faixa de market cap. Graduação: 0,015 SOL.</p>
          </div>
          <div className="card p-4">
            <div className="font-semibold">Raydium LaunchLab</div>
            <p className="mt-1 text-sm text-ink-soft">Curva com migração para pool; configurações por lançamento precisam ser conferidas (ex.: 85 SOL no modo JustSendit).</p>
          </div>
          <div className="card p-4">
            <div className="font-semibold">Pool próprio (CPMM)</div>
            <p className="mt-1 text-sm text-ink-soft">Só com demanda validada e política pública de liquidez. Capital em risco, separado do opex.</p>
          </div>
        </div>
      </Section>

      <Section title="Gates do piloto de 90 dias">
        <LaunchChecklist />
      </Section>
    </>
  );
}
