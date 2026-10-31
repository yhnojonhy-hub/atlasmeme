/**
 * Matemática do negócio do piloto. Funções puras; a UI só formata.
 * Regra de ouro: receita é caixa recebido. FDV, posição em token e valorização não entram.
 */

export type SaasInputs = {
  payingCustomers: number;
  monthlyPrice: number;
  variableCostRate: number; // 0..1 sobre a receita
  fixedMonthly: number;
  monthlyChurnRate: number; // 0..1
};

export function saas(i: SaasInputs) {
  const mrr = i.payingCustomers * i.monthlyPrice;
  const variable = mrr * i.variableCostRate;
  const contribution = mrr - variable;
  const operating = contribution - i.fixedMonthly;
  const unitContribution = i.monthlyPrice * (1 - i.variableCostRate);
  const breakevenCustomers =
    unitContribution > 0 ? Math.ceil(i.fixedMonthly / unitContribution) : null;
  const lifetimeMonths = i.monthlyChurnRate > 0 ? 1 / i.monthlyChurnRate : null;
  const ltv = lifetimeMonths ? unitContribution * lifetimeMonths : null;
  return { mrr, variable, contribution, operating, unitContribution, breakevenCustomers, lifetimeMonths, ltv };
}

export type AcquisitionInputs = {
  spend: number;
  retainedParticipants: number; // retidos em 30 dias
  contributionPerParticipant: number; // receita − custo de atendimento, por pessoa no período
};

export function acquisition(i: AcquisitionInputs) {
  const cac = i.retainedParticipants > 0 ? i.spend / i.retainedParticipants : null;
  const netPerParticipant = cac === null ? null : i.contributionPerParticipant - cac;
  return { cac, netPerParticipant, payback: cac !== null && i.contributionPerParticipant > 0 ? cac / i.contributionPerParticipant : null };
}

export type RunwayInputs = {
  cash: number;
  monthlyBurn: number; // opex − receita recorrente recebida
};

export function runway(i: RunwayInputs) {
  if (i.monthlyBurn <= 0) return { months: Infinity, label: "caixa positivo" };
  const months = i.cash / i.monthlyBurn;
  return { months, label: `${months.toFixed(1)} meses` };
}

/** Lucro do período: só caixa. */
export function periodProfit(x: {
  creatorFeesClaimed: number;
  mrr: number;
  implementationFees: number;
  opex: number;
  marketing: number;
  taxesEstimate: number;
}) {
  const inflow = x.creatorFeesClaimed + x.mrr + x.implementationFees;
  const outflow = x.opex + x.marketing + x.taxesEstimate;
  return { inflow, outflow, profit: inflow - outflow };
}

/** Saída em CPMM sem taxas: Y·q/(X+q). Mede risco de saída, não estratégia. */
export function cpmmExit(reserveQuote: number, reserveToken: number, tokensSold: number) {
  if (reserveToken + tokensSold <= 0) return 0;
  return (reserveQuote * tokensSold) / (reserveToken + tokensSold);
}

/**
 * Critérios de interrupção do piloto (do documento de projeto).
 * Retorna os que estão disparados.
 */
export function killSignals(x: {
  cac: number | null;
  contributionPerParticipant: number;
  retention30d: number; // 0..1
  needsSelfTradingToHoldMetrics: boolean;
  dependsOnTeamSelling: boolean;
  criticalVulnerability: boolean;
  unresolvedLegalIssue: boolean;
}) {
  const out: string[] = [];
  if (x.cac !== null && x.cac > x.contributionPerParticipant)
    out.push("Custo de aquisição maior que a contribuição por participante.");
  if (x.retention30d < 0.1) out.push("Retenção em 30 dias abaixo de 10%.");
  if (x.needsSelfTradingToHoldMetrics)
    out.push("Indicadores só se sustentam com negociação própria.");
  if (x.dependsOnTeamSelling) out.push("Receita depende de vender a posição da equipe.");
  if (x.criticalVulnerability) out.push("Vulnerabilidade crítica aberta.");
  if (x.unresolvedLegalIssue) out.push("Incompatibilidade jurídica não resolvida.");
  return out;
}
