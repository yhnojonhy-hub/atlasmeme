"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { killSignals, periodProfit, runway, saas } from "@/lib/metrics/business";
import { Alert, Field, Section, Stat } from "./ui";

export function BusinessCalc() {
  // Software e serviços
  const [customers, setCustomers] = useState(3);
  const [price, setPrice] = useState(499);
  const [variableRate, setVariableRate] = useState(0.1);
  const [fixed, setFixed] = useState(1799);
  const [churn, setChurn] = useState(0.08);
  // Token como complemento
  const [feesClaimed, setFeesClaimed] = useState(600);
  const [implementation, setImplementation] = useState(0);
  const [marketing, setMarketing] = useState(500);
  const [taxes, setTaxes] = useState(0.15);
  const [cash, setCash] = useState(15931);
  // Sinais de interrupção
  const [selfTrading, setSelfTrading] = useState(false);
  const [teamSelling, setTeamSelling] = useState(false);

  const s = useMemo(
    () => saas({ payingCustomers: customers, monthlyPrice: price, variableCostRate: variableRate, fixedMonthly: fixed, monthlyChurnRate: churn }),
    [customers, price, variableRate, fixed, churn],
  );
  const p = useMemo(() => {
    const inflowPreTax = feesClaimed + s.mrr + implementation;
    return periodProfit({
      creatorFeesClaimed: feesClaimed,
      mrr: s.mrr,
      implementationFees: implementation,
      opex: fixed + s.variable,
      marketing,
      taxesEstimate: inflowPreTax * taxes,
    });
  }, [feesClaimed, s.mrr, s.variable, implementation, fixed, marketing, taxes]);
  const rw = useMemo(() => runway({ cash, monthlyBurn: -p.profit }), [cash, p.profit]);
  const kills = killSignals({
    cac: null,
    contributionPerParticipant: 0,
    retention30d: 1,
    needsSelfTradingToHoldMetrics: selfTrading,
    dependsOnTeamSelling: teamSelling,
    criticalVulnerability: false,
    unresolvedLegalIssue: false,
  });
  const feeShare = p.inflow > 0 ? feesClaimed / p.inflow : 0;

  return (
    <div className="space-y-8">
      <Section title="Máquina do mês" lead="Entradas são só caixa recebido. Saídas incluem opex, custo variável, marketing e uma estimativa de impostos.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entradas" value={fmt.usd(p.inflow)} hint={`${fmt.pct1(feeShare)} vêm de taxas do criador`} />
          <Stat label="Saídas" value={fmt.usd(p.outflow)} />
          <Stat label="Resultado do mês" value={fmt.usd(p.profit)} tone={p.profit >= 0 ? "good" : "bad"} />
          <Stat label="Runway" value={rw.label} tone={rw.months === Infinity ? "good" : rw.months < 3 ? "bad" : "default"} hint={`caixa ${fmt.usd(cash)}`} />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Software e serviços" lead="Receita recorrente é a parte previsível. O preço é hipótese até haver pagante.">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Clientes pagantes">
              <input className="input num" type="number" min={0} value={customers} onChange={(e) => setCustomers(Number(e.target.value))} />
            </Field>
            <Field label="Mensalidade (US$)">
              <input className="input num" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </Field>
            <Field label="Custo variável / receita" hint="0 a 1">
              <input className="input num" type="number" min={0} max={1} step={0.05} value={variableRate} onChange={(e) => setVariableRate(Number(e.target.value))} />
            </Field>
            <Field label="Churn mensal" hint="0 a 1">
              <input className="input num" type="number" min={0} max={1} step={0.01} value={churn} onChange={(e) => setChurn(Number(e.target.value))} />
            </Field>
            <Field label="Estrutura fixa mensal (US$)" hint="opex do piloto: 1 799 no orçamento base">
              <input className="input num" type="number" min={0} value={fixed} onChange={(e) => setFixed(Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="MRR" value={fmt.usd(s.mrr)} />
            <Stat label="Pagantes no equilíbrio" value={s.breakevenCustomers ?? "—"} hint="só com assinatura, sem taxas de token" />
            <Stat label="LTV por cliente" value={fmt.usd(s.ltv)} hint={s.lifetimeMonths ? `${s.lifetimeMonths.toFixed(0)} meses de vida média` : "churn zero"} />
          </div>
        </Section>

        <Section title="Token como complemento" lead="Taxas do criador entram quando reclamadas. Projete-as na aba Taxas; aqui entra o valor recebido.">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Taxas do criador reclamadas (US$)">
              <input className="input num" type="number" min={0} value={feesClaimed} onChange={(e) => setFeesClaimed(Number(e.target.value))} />
            </Field>
            <Field label="Implantações cobradas (US$)">
              <input className="input num" type="number" min={0} value={implementation} onChange={(e) => setImplementation(Number(e.target.value))} />
            </Field>
            <Field label="Marketing e aquisição (US$)">
              <input className="input num" type="number" min={0} value={marketing} onChange={(e) => setMarketing(Number(e.target.value))} />
            </Field>
            <Field label="Impostos estimados" hint="fração das entradas">
              <input className="input num" type="number" min={0} max={1} step={0.01} value={taxes} onChange={(e) => setTaxes(Number(e.target.value))} />
            </Field>
            <Field label="Caixa disponível (US$)" hint="15 931 = orçamento base com contingência">
              <input className="input num" type="number" min={0} value={cash} onChange={(e) => setCash(Number(e.target.value))} />
            </Field>
          </div>
          <div className="card space-y-2 p-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selfTrading} onChange={(e) => setSelfTrading(e.target.checked)} />
              Os indicadores só se mantêm se a equipe negociar o próprio token
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={teamSelling} onChange={(e) => setTeamSelling(e.target.checked)} />
              O caixa depende de vender a posição da equipe
            </label>
          </div>
        </Section>
      </div>

      {kills.length > 0 ? (
        <Alert tone="bad">
          <strong>Critério de interrupção disparado.</strong>
          <ul className="mt-1 list-disc pl-5">
            {kills.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          Nenhum desses sinais melhora aumentando o número de carteiras.
        </Alert>
      ) : (
        <Alert tone={feeShare > 0.6 ? "warn" : "good"}>
          {feeShare > 0.6
            ? "Mais de 60% das entradas vêm de taxas do criador. Isso é receita variável; não financie estrutura fixa com ela."
            : "Receita recorrente cobre a maior parte das entradas. Taxas do criador entram como complemento."}
        </Alert>
      )}
    </div>
  );
}
