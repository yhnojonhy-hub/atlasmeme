import { dataPath, readJson, updateJson } from "../jsonstore";

/**
 * Snapshots de mercado por projeto (1 por minuto, 30 dias ≈ 43 200 pontos → compactado por hora após 48 h).
 * Tudo que entra aqui tem fonte e horário; o que o indexador não informa fica null, nunca zero.
 */
export type Snapshot = {
  at: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  /** Fase da curva lida on-chain (Meteora): 0..1, ou null fora da DBC. */
  curveProgress: number | null;
  migrated: boolean | null;
  /** Taxas não reclamadas e já reclamadas (SOL) somando criador + tesouraria, lidas on-chain. */
  feesUnclaimedSol: number | null;
  feesClaimedSol: number | null;
  source: string;
};

export type Track = {
  slug: string;
  mint: string;
  startedAt: string;
  snapshots: Snapshot[];
  /** Eventos de ciclo de vida: lançado, indexado, graduou, taxas reclamadas, sinal de interrupção… */
  events: { at: string; kind: string; detail: string }[];
  /** Custos lançados à mão ou pela automação (US$). */
  costsUsd: { item: string; usd: number; at: string }[];
  /** Taxas efetivamente recebidas em caixa (US$), registradas no claim. */
  claimsUsd: { usd: number; sol: number; at: string; tx?: string }[];
};

const file = (slug: string) => dataPath("track", `${slug}.json`);

export async function getTrack(slug: string) {
  return readJson<Track | null>(file(slug), null);
}

export async function startTrack(slug: string, mint: string) {
  return updateJson<Track | null>(file(slug), null, (t) =>
    t ?? { slug, mint, startedAt: new Date().toISOString(), snapshots: [], events: [{ at: new Date().toISOString(), kind: "inicio", detail: "Acompanhamento iniciado." }], costsUsd: [], claimsUsd: [] },
  );
}

export async function addSnapshot(slug: string, s: Snapshot) {
  return updateJson<Track | null>(file(slug), null, (t) => {
    if (!t) return t;
    const snaps = [...t.snapshots, s];
    return { ...t, snapshots: compact(snaps) };
  });
}

export async function addEvent(slug: string, kind: string, detail: string) {
  return updateJson<Track | null>(file(slug), null, (t) =>
    t ? { ...t, events: [...t.events, { at: new Date().toISOString(), kind, detail }].slice(-500) } : t,
  );
}

export async function addTrackCost(slug: string, item: string, usd: number) {
  return updateJson<Track | null>(file(slug), null, (t) =>
    t ? { ...t, costsUsd: [...t.costsUsd, { item, usd, at: new Date().toISOString() }] } : t,
  );
}

export async function addClaim(slug: string, c: { usd: number; sol: number; tx?: string }) {
  return updateJson<Track | null>(file(slug), null, (t) =>
    t ? { ...t, claimsUsd: [...t.claimsUsd, { ...c, at: new Date().toISOString() }] } : t,
  );
}

/** Mantém 1/min nas últimas 48 h e 1/h antes disso. */
function compact(snaps: Snapshot[]) {
  const cut = Date.now() - 48 * 3600_000;
  const recent = snaps.filter((s) => Date.parse(s.at) >= cut);
  const old = snaps.filter((s) => Date.parse(s.at) < cut);
  const byHour = new Map<string, Snapshot>();
  for (const s of old) byHour.set(s.at.slice(0, 13), s);
  return [...byHour.values(), ...recent].slice(-50_000);
}

/** Resumo para a UI: última leitura, variação, taxas e P&L em caixa. */
export function summarize(t: Track, solUsd: number | null) {
  const last = t.snapshots.at(-1) ?? null;
  const first = t.snapshots[0] ?? null;
  const dayAgo = t.snapshots.find((s) => Date.parse(s.at) >= Date.now() - 86_400_000) ?? first;
  const costs = t.costsUsd.reduce((a, c) => a + c.usd, 0);
  const claimed = t.claimsUsd.reduce((a, c) => a + c.usd, 0);
  const unclaimedUsd = last?.feesUnclaimedSol != null && solUsd ? last.feesUnclaimedSol * solUsd : null;
  return {
    last,
    ageHours: first ? (Date.now() - Date.parse(first.at)) / 3600_000 : 0,
    priceChange24h: last?.priceUsd && dayAgo?.priceUsd ? last.priceUsd / dayAgo.priceUsd - 1 : null,
    costsUsd: costs,
    claimedUsd: claimed,
    unclaimedUsd,
    /** Lucro em caixa = taxas recebidas − custos. Posição em token não entra. */
    cashProfitUsd: claimed - costs,
    /** Se reclamasse agora. */
    potentialProfitUsd: unclaimedUsd == null ? null : claimed + unclaimedUsd - costs,
    events: t.events.slice(-20).reverse(),
  };
}
