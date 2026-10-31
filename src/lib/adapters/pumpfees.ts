/**
 * Tabela oficial de taxas do Pump.fun / PumpSwap.
 * Fonte: https://pump.fun/docs/fees (página atualizada em 17/10/2026).
 * Papel no Farol: calcular a taxa efetiva do criador por fase e faixa de market cap.
 * A taxa muda com o market cap — não é 0,30% para sempre.
 */
export const PUMP_FEES = {
  name: "Pump.fun — tabela de taxas",
  url: "https://pump.fun/docs/fees",
  role: "Taxa do criador por fase (curva ou PumpSwap) e por faixa de market cap.",
  updatedAt: "2026-10-17",
};

export type Tier = { upTo: number; creator: number; protocol: number; lp: number };

/** Market cap em SOL (preço em SOL × 1 bilhão de tokens). */
export const SOL_TIERS: Tier[] = [
  { upTo: 420, creator: 0.003, protocol: 0.0093, lp: 0.0002 },
  { upTo: 1470, creator: 0.0095, protocol: 0.0005, lp: 0.002 },
  { upTo: 2460, creator: 0.009, protocol: 0.0005, lp: 0.002 },
  { upTo: 3440, creator: 0.0085, protocol: 0.0005, lp: 0.002 },
  { upTo: 4420, creator: 0.008, protocol: 0.0005, lp: 0.002 },
  { upTo: 9820, creator: 0.0075, protocol: 0.0005, lp: 0.002 },
  { upTo: 14740, creator: 0.007, protocol: 0.0005, lp: 0.002 },
  { upTo: 19650, creator: 0.0065, protocol: 0.0005, lp: 0.002 },
  { upTo: 24560, creator: 0.006, protocol: 0.0005, lp: 0.002 },
  { upTo: 29470, creator: 0.0055, protocol: 0.0005, lp: 0.002 },
  { upTo: 34380, creator: 0.005, protocol: 0.0005, lp: 0.002 },
  { upTo: 39300, creator: 0.0045, protocol: 0.0005, lp: 0.002 },
  { upTo: 44210, creator: 0.004, protocol: 0.0005, lp: 0.002 },
  { upTo: 49120, creator: 0.0035, protocol: 0.0005, lp: 0.002 },
  { upTo: 54030, creator: 0.003, protocol: 0.0005, lp: 0.002 },
  { upTo: 58940, creator: 0.00275, protocol: 0.0005, lp: 0.002 },
  { upTo: 63860, creator: 0.0025, protocol: 0.0005, lp: 0.002 },
  { upTo: 68770, creator: 0.00225, protocol: 0.0005, lp: 0.002 },
  { upTo: 73681, creator: 0.002, protocol: 0.0005, lp: 0.002 },
  { upTo: 78590, creator: 0.00175, protocol: 0.0005, lp: 0.002 },
  { upTo: 83500, creator: 0.0015, protocol: 0.0005, lp: 0.002 },
  { upTo: 88400, creator: 0.00125, protocol: 0.0005, lp: 0.002 },
  { upTo: 93330, creator: 0.001, protocol: 0.0005, lp: 0.002 },
  { upTo: 98240, creator: 0.00075, protocol: 0.0005, lp: 0.002 },
  { upTo: Infinity, creator: 0.0005, protocol: 0.0005, lp: 0.002 },
];

/** Market cap em USDC (para moedas pareadas com USDC). */
export const USDC_TIERS: Tier[] = [
  { upTo: 59_000, creator: 0.003, protocol: 0.0093, lp: 0.0002 },
  { upTo: 300_000, creator: 0.0095, protocol: 0.0005, lp: 0.002 },
  { upTo: 500_000, creator: 0.009, protocol: 0.0005, lp: 0.002 },
  { upTo: 700_000, creator: 0.0085, protocol: 0.0005, lp: 0.002 },
  { upTo: 900_000, creator: 0.008, protocol: 0.0005, lp: 0.002 },
  { upTo: 2_000_000, creator: 0.0075, protocol: 0.0005, lp: 0.002 },
  { upTo: 3_000_000, creator: 0.007, protocol: 0.0005, lp: 0.002 },
  { upTo: 4_000_000, creator: 0.0065, protocol: 0.0005, lp: 0.002 },
  { upTo: 5_000_000, creator: 0.006, protocol: 0.0005, lp: 0.002 },
  { upTo: 6_000_000, creator: 0.0055, protocol: 0.0005, lp: 0.002 },
  { upTo: 7_000_000, creator: 0.005, protocol: 0.0005, lp: 0.002 },
  { upTo: 8_000_000, creator: 0.0045, protocol: 0.0005, lp: 0.002 },
  { upTo: 9_000_000, creator: 0.004, protocol: 0.0005, lp: 0.002 },
  { upTo: 10_000_000, creator: 0.0035, protocol: 0.0005, lp: 0.002 },
  { upTo: 11_000_000, creator: 0.003, protocol: 0.0005, lp: 0.002 },
  { upTo: 12_000_000, creator: 0.0028, protocol: 0.0005, lp: 0.002 },
  { upTo: 13_000_000, creator: 0.0025, protocol: 0.0005, lp: 0.002 },
  { upTo: 14_000_000, creator: 0.0023, protocol: 0.0005, lp: 0.002 },
  { upTo: 15_000_000, creator: 0.002, protocol: 0.0005, lp: 0.002 },
  { upTo: 16_000_000, creator: 0.0018, protocol: 0.0005, lp: 0.002 },
  { upTo: 17_000_000, creator: 0.0015, protocol: 0.0005, lp: 0.002 },
  { upTo: 18_000_000, creator: 0.0013, protocol: 0.0005, lp: 0.002 },
  { upTo: 19_000_000, creator: 0.001, protocol: 0.0005, lp: 0.002 },
  { upTo: 20_000_000, creator: 0.0008, protocol: 0.0005, lp: 0.002 },
  { upTo: Infinity, creator: 0.0005, protocol: 0.0005, lp: 0.002 },
];

export const CURVE_FEE = { creator: 0.003, protocol: 0.0095, lp: 0 };
export const GRADUATION_FEE_SOL = 0.015;
/** Taxa do app Pump.fun (web/mobile) desde 17/10/2026; não é receita do criador. */
export const APP_PLATFORM_FEE = { withoutReferral: 0.0045, withReferral: 0.004 };

export type Phase = "curva" | "pumpswap";
export type Quote = "SOL" | "USDC";

export function tierFor(mcap: number, quote: Quote = "SOL"): Tier {
  const tiers = quote === "SOL" ? SOL_TIERS : USDC_TIERS;
  return tiers.find((t) => mcap < t.upTo) ?? tiers[tiers.length - 1];
}

export function creatorRate(phase: Phase, mcap: number, quote: Quote = "SOL") {
  if (phase === "curva") return CURVE_FEE.creator;
  return tierFor(mcap, quote).creator;
}

export function totalRate(phase: Phase, mcap: number, quote: Quote = "SOL") {
  if (phase === "curva") return CURVE_FEE.creator + CURVE_FEE.protocol + CURVE_FEE.lp;
  const t = tierFor(mcap, quote);
  return t.creator + t.protocol + t.lp;
}

/**
 * Receita do criador para um volume contado uma vez (notional de cada negociação).
 * share: parcela efetivamente recebida pela empresa (1 = integral).
 */
export function creatorRevenue(
  volume: number,
  phase: Phase,
  mcap: number,
  share = 1,
  quote: Quote = "SOL",
) {
  return volume * creatorRate(phase, mcap, quote) * share;
}
