import { getPairs } from "../adapters/dexscreener";
import { poolStatus } from "../adapters/meteora";
import { listProjects } from "../projects/store";
import { addEvent, addSnapshot, getTrack, startTrack, type Snapshot } from "./store";

/**
 * Monitor contínuo: a cada ciclo lê indexador + on-chain para cada projeto com `tracking`,
 * grava um snapshot e registra eventos de ciclo de vida. Roda dentro do processo do Farol
 * (instrumentation.ts), sem serviço extra — custo zero.
 */
let timer: NodeJS.Timeout | null = null;
let busy = false;

export async function tick() {
  if (busy) return;
  busy = true;
  try {
    const projects = (await listProjects()).filter((p) => p.tracking && p.mint);
    for (const p of projects) {
      try {
        await sample(p.slug, p.mint!, p.launch?.venue ?? "manual");
      } catch (e) {
        console.error(`[farol] monitor ${p.slug}:`, e instanceof Error ? e.message : e);
      }
    }
  } finally {
    busy = false;
  }
}

async function sample(slug: string, mint: string, venue: string) {
  let track = await getTrack(slug);
  if (!track) track = await startTrack(slug, mint);
  const prev = track!.snapshots.at(-1) ?? null;

  const pairs = await getPairs(mint);
  const top = pairs.ok ? pairs.data[0] : undefined;
  const chain = venue === "meteora-dbc" ? await poolStatus(mint).catch(() => null) : null;

  const snap: Snapshot = {
    at: new Date().toISOString(),
    priceUsd: top?.priceUsd ? Number(top.priceUsd) : null,
    liquidityUsd: pairs.ok ? pairs.data.reduce((s, x) => s + (x.liquidity?.usd ?? 0), 0) : null,
    marketCapUsd: top?.marketCap ?? null,
    volume24hUsd: pairs.ok ? pairs.data.reduce((s, x) => s + (x.volume?.h24 ?? 0), 0) : null,
    buys24h: top?.txns?.h24?.buys ?? null,
    sells24h: top?.txns?.h24?.sells ?? null,
    curveProgress: chain?.curveProgress ?? null,
    migrated: chain ? chain.migrated : null,
    feesUnclaimedSol: chain?.fees ? chain.fees.creatorUnclaimedSol + chain.fees.partnerUnclaimedSol : null,
    feesClaimedSol: chain?.fees ? chain.fees.creatorClaimedSol + chain.fees.partnerClaimedSol : null,
    source: [pairs.ok ? "DEX Screener" : null, chain ? "Meteora DBC" : null].filter(Boolean).join(" + ") || "sem leitura",
  };
  await addSnapshot(slug, snap);

  // Eventos de ciclo de vida.
  if (!prev?.priceUsd && snap.priceUsd) await addEvent(slug, "indexado", `Par indexado no DEX Screener (${top?.dexId}).`);
  if (prev && prev.migrated === false && snap.migrated === true) await addEvent(slug, "graduou", "Curva concluída; liquidez migrada para DAMM v2 e travada.");
  if (snap.curveProgress != null && prev?.curveProgress != null) {
    for (const m of [0.25, 0.5, 0.75]) if (prev.curveProgress < m && snap.curveProgress >= m) await addEvent(slug, "marco", `Curva em ${Math.round(m * 100)}%.`);
  }
  if (prev?.liquidityUsd && snap.liquidityUsd != null && snap.liquidityUsd < prev.liquidityUsd * 0.5) {
    await addEvent(slug, "alerta", `Liquidez caiu mais de 50% em um ciclo (${Math.round(prev.liquidityUsd)} → ${Math.round(snap.liquidityUsd)} US$).`);
  }
  if (snap.buys24h != null && snap.sells24h != null && snap.buys24h + snap.sells24h > 50 && snap.sells24h > snap.buys24h * 2) {
    await addEvent(slug, "alerta", `Vendas 24 h (${snap.sells24h}) acima do dobro das compras (${snap.buys24h}).`);
  }
}

export function startMonitor(intervalMs = 60_000) {
  if (timer) return;
  timer = setInterval(() => void tick(), intervalMs);
  setTimeout(() => void tick(), 5_000);
  console.log(`[farol] monitor ligado (${intervalMs / 1000}s)`);
}
