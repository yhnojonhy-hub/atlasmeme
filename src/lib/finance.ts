import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSolUsd } from "./adapters/dexscreener";
import { solBalance } from "./adapters/meteora";
import { dataPath, readJson, updateJson } from "./jsonstore";
import { listRuns } from "./launcher/store";
import type { Run } from "./launcher/types";
import type { Project } from "./projects/schema";
import { listProjects } from "./projects/store";
import { getTrack, type Track } from "./tracker/store";
import { listWallets } from "./wallets/vault";

/**
 * Financeiro consolidado. Regras:
 * - Lucro é caixa: taxas efetivamente reclamadas − custos. Posição em token e "a reclamar" aparecem à parte.
 * - Custos de projeto: pagos pela automação (domínio, rent) + lançados à mão (marketing, design…).
 * - Infra fixa (VM, RPC, domínio-base) é mensal, rateada por dia desde `since`, e não é atribuída a um projeto.
 */
export const FixedCostSchema = z.object({ item: z.string().trim().min(2).max(80), usdMonth: z.number().min(0).max(100_000), since: z.string().optional() });
export const EntrySchema = z.object({ slug: z.string().trim().min(1).max(80).nullable(), item: z.string().trim().min(2).max(120), usd: z.number().min(0).max(1_000_000), at: z.string().optional() });

type FinanceFile = {
  fixed: { id: string; item: string; usdMonth: number; since: string }[];
  /** Lançamentos manuais: slug null = infra/geral. */
  entries: { id: string; slug: string | null; item: string; usd: number; at: string }[];
};
const FILE = dataPath("finance.json");
const EMPTY: FinanceFile = { fixed: [], entries: [] };

export const readFinance = () => readJson<FinanceFile>(FILE, EMPTY);

export async function addFixedCost(input: z.input<typeof FixedCostSchema>) {
  const v = FixedCostSchema.parse(input);
  const row = { id: randomUUID(), item: v.item, usdMonth: v.usdMonth, since: v.since ?? new Date().toISOString() };
  await updateJson<FinanceFile>(FILE, EMPTY, (f) => ({ ...f, fixed: [...f.fixed, row] }));
  return row;
}
export async function removeFixedCost(id: string) {
  await updateJson<FinanceFile>(FILE, EMPTY, (f) => ({ ...f, fixed: f.fixed.filter((x) => x.id !== id) }));
}
export async function addEntry(input: z.input<typeof EntrySchema>) {
  const v = EntrySchema.parse(input);
  const row = { id: randomUUID(), slug: v.slug, item: v.item, usd: v.usd, at: v.at ?? new Date().toISOString() };
  await updateJson<FinanceFile>(FILE, EMPTY, (f) => ({ ...f, entries: [...f.entries, row] }));
  return row;
}
export async function removeEntry(id: string) {
  await updateJson<FinanceFile>(FILE, EMPTY, (f) => ({ ...f, entries: f.entries.filter((x) => x.id !== id) }));
}

export type ProjectFinance = {
  slug: string;
  name: string;
  ticker: string;
  stage: Project["stage"];
  venue: string;
  mint: string | null;
  runStatus: Run["status"] | null;
  runId: string | null;
  tracking: boolean;
  startedAt: string;
  /** Custos (US$) por origem. */
  costs: { automation: number; manual: number; total: number; items: { item: string; usd: number; at: string; source: "automação" | "manual" }[] };
  claimedUsd: number;
  unclaimedUsd: number | null;
  feesTotalSol: number | null;
  cashProfitUsd: number;
  potentialProfitUsd: number | null;
  wallets: { pubkey: string; role: string; sol: number | null; usd: number | null }[];
  walletsUsd: number | null;
  market: { priceUsd: number | null; liquidityUsd: number | null; marketCapUsd: number | null; volume24hUsd: number | null; curveProgress: number | null; migrated: boolean | null; at: string | null };
  hostnames: string[];
  links: Project["links"];
};

export type FinanceOverview = {
  at: string;
  solUsd: number | null;
  projects: ProjectFinance[];
  totals: {
    projects: number;
    launched: number;
    costsProjectsUsd: number;
    infraEntriesUsd: number;
    fixedMonthlyUsd: number;
    fixedToDateUsd: number;
    costsAllUsd: number;
    claimedUsd: number;
    unclaimedUsd: number;
    cashProfitUsd: number;
    netResultUsd: number;
    potentialNetUsd: number;
    walletsSol: number;
    walletsUsd: number | null;
    burnPerDayUsd: number;
  };
  fixed: FinanceFile["fixed"];
  infraEntries: FinanceFile["entries"];
};

function projectCosts(run: Run | undefined, track: Track | null, manual: FinanceFile["entries"]) {
  // O passo "acompanhamento" copia os custos da run para o track; usar um só para não duplicar.
  const auto = (track?.costsUsd?.length ? track.costsUsd : run?.costsUsd ?? []).map((c) => ({ ...c, source: "automação" as const }));
  const man = manual.map((c) => ({ item: c.item, usd: c.usd, at: c.at, source: "manual" as const }));
  const items = [...auto, ...man].sort((a, b) => a.at.localeCompare(b.at));
  const automation = auto.reduce((a, c) => a + c.usd, 0);
  const manualSum = man.reduce((a, c) => a + c.usd, 0);
  return { automation, manual: manualSum, total: automation + manualSum, items };
}

const balanceCache = new Map<string, { at: number; sol: number }>();
async function cachedBalance(pubkey: string) {
  const hit = balanceCache.get(pubkey);
  if (hit && Date.now() - hit.at < 60_000) return hit.sol;
  try {
    const sol = await solBalance(pubkey);
    balanceCache.set(pubkey, { at: Date.now(), sol });
    return sol;
  } catch {
    return hit?.sol ?? null;
  }
}

export async function financeOverview(opts: { balances?: boolean } = {}): Promise<FinanceOverview> {
  const [projects, runs, wallets, fin, solUsd] = await Promise.all([listProjects(), listRuns(), listWallets(), readFinance(), getSolUsd().catch(() => null)]);
  const runBySlug = new Map<string, Run>();
  for (const r of runs) if (!runBySlug.has(r.slug)) runBySlug.set(r.slug, r);

  const rows: ProjectFinance[] = [];
  for (const p of projects) {
    const run = runBySlug.get(p.slug);
    const track = await getTrack(p.slug);
    const manual = fin.entries.filter((e) => e.slug === p.slug);
    const costs = projectCosts(run, track, manual);
    const last = track?.snapshots.at(-1) ?? null;
    const claimedUsd = track?.claimsUsd.reduce((a, c) => a + c.usd, 0) ?? 0;
    const unclaimedUsd = last?.feesUnclaimedSol != null && solUsd ? last.feesUnclaimedSol * solUsd : null;
    const ws = wallets.filter((w) => w.slug === p.slug);
    const walletRows = [];
    for (const w of ws) {
      const sol = opts.balances === false ? null : await cachedBalance(w.pubkey);
      walletRows.push({ pubkey: w.pubkey, role: w.role, sol, usd: sol != null && solUsd ? sol * solUsd : null });
    }
    const walletsUsd = walletRows.some((w) => w.usd != null) ? walletRows.reduce((a, w) => a + (w.usd ?? 0), 0) : null;
    rows.push({
      slug: p.slug,
      name: p.name,
      ticker: p.ticker,
      stage: p.stage,
      venue: p.launch?.venue ?? p.launchpad,
      mint: p.mint ?? null,
      runStatus: run?.status ?? null,
      runId: run?.id ?? null,
      tracking: p.tracking,
      startedAt: run?.createdAt ?? p.createdAt ?? track?.startedAt ?? "",
      costs,
      claimedUsd,
      unclaimedUsd,
      feesTotalSol: last?.feesClaimedSol != null || last?.feesUnclaimedSol != null ? (last.feesClaimedSol ?? 0) + (last.feesUnclaimedSol ?? 0) : null,
      cashProfitUsd: claimedUsd - costs.total,
      potentialProfitUsd: unclaimedUsd == null ? null : claimedUsd + unclaimedUsd - costs.total,
      wallets: walletRows,
      walletsUsd,
      market: {
        priceUsd: last?.priceUsd ?? null,
        liquidityUsd: last?.liquidityUsd ?? null,
        marketCapUsd: last?.marketCapUsd ?? null,
        volume24hUsd: last?.volume24hUsd ?? null,
        curveProgress: last?.curveProgress ?? null,
        migrated: last?.migrated ?? null,
        at: last?.at ?? null,
      },
      hostnames: p.hostnames,
      links: p.links,
    });
  }

  const infraEntries = fin.entries.filter((e) => e.slug === null);
  const infraEntriesUsd = infraEntries.reduce((a, e) => a + e.usd, 0);
  const fixedMonthlyUsd = fin.fixed.reduce((a, f) => a + f.usdMonth, 0);
  const fixedToDateUsd = fin.fixed.reduce((a, f) => a + (f.usdMonth / 30) * Math.max(0, (Date.now() - Date.parse(f.since)) / 86_400_000), 0);
  const costsProjectsUsd = rows.reduce((a, r) => a + r.costs.total, 0);
  const claimedUsd = rows.reduce((a, r) => a + r.claimedUsd, 0);
  const unclaimedUsd = rows.reduce((a, r) => a + (r.unclaimedUsd ?? 0), 0);
  const walletsSol = rows.reduce((a, r) => a + r.wallets.reduce((b, w) => b + (w.sol ?? 0), 0), 0);
  const anyBalance = rows.some((r) => r.walletsUsd != null);
  const costsAllUsd = costsProjectsUsd + infraEntriesUsd + fixedToDateUsd;
  return {
    at: new Date().toISOString(),
    solUsd,
    projects: rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    totals: {
      projects: rows.length,
      launched: rows.filter((r) => r.mint).length,
      costsProjectsUsd,
      infraEntriesUsd,
      fixedMonthlyUsd,
      fixedToDateUsd,
      costsAllUsd,
      claimedUsd,
      unclaimedUsd,
      cashProfitUsd: claimedUsd - costsProjectsUsd,
      netResultUsd: claimedUsd - costsAllUsd,
      potentialNetUsd: claimedUsd + unclaimedUsd - costsAllUsd,
      walletsSol,
      walletsUsd: anyBalance && solUsd ? walletsSol * solUsd : null,
      burnPerDayUsd: fixedMonthlyUsd / 30,
    },
    fixed: fin.fixed,
    infraEntries,
  };
}
