import { cached, TTL } from "../cache";
import { fetchJson, timed, type Result } from "./types";

/**
 * DEX Screener — indexador público de pares. Só leitura, sem chave.
 * Papel no Farol: preço indicativo, liquidez, volume e estado de indexação do pool.
 * Não é aprovação, listagem paga nem garantia de cobertura.
 */
export const DEXSCREENER = {
  name: "DEX Screener",
  url: "https://docs.dexscreener.com/api/reference",
  role: "Preço, liquidez, volume e indexação de pares (leitura pública).",
};

export type Pair = {
  dexId: string;
  pairAddress: string;
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  priceNative?: string;
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number };
  txns?: { h24?: { buys: number; sells: number } };
  pairCreatedAt?: number;
  labels?: string[];
};

export async function getPairs(mint: string): Promise<Result<Pair[]>> {
  const key = `dex:pairs:${mint}`;
  let hit = false;
  return timed(
    DEXSCREENER.name,
    DEXSCREENER.url,
    async () => {
      const r = await cached(key, TTL.pairs, () =>
        fetchJson<Pair[]>(`https://api.dexscreener.com/token-pairs/v1/solana/${mint}`),
      );
      hit = r.hit;
      const pairs = Array.isArray(r.value) ? r.value : [];
      // Só pares em que o mint consultado é o token base: o preço mostrado é dele, não do par.
      const asBase = pairs.filter((p) => p.baseToken?.address === mint);
      const chosen = asBase.length > 0 ? asBase : pairs;
      return chosen.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    },
    () => hit,
  );
}

export async function pingDexscreener(): Promise<Result<{ status: string }>> {
  return timed(DEXSCREENER.name, DEXSCREENER.url, async () => {
    // Endpoint leve de perfis; serve como verificação de disponibilidade.
    await fetchJson<unknown>("https://api.dexscreener.com/token-profiles/latest/v1", {
      timeoutMs: 4000,
    });
    return { status: "online" };
  });
}
