import { cached, TTL } from "../cache";
import { fetchJson, timed, type Result } from "./types";

/**
 * RPC Solana (Helius quando houver chave; público como contingência).
 * Papel no Farol: ler o mint — oferta, decimais, autoridades, programa.
 * Não envia transações. Nenhuma chave privada passa por aqui.
 */
export const SOLANA_RPC = {
  name: "Solana RPC (Helius)",
  url: "https://www.helius.dev/docs",
  role: "Leitura on-chain do mint: oferta, autoridades e programa do token.",
};

export function rpcUrl() {
  const key = process.env.HELIUS_API_KEY;
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`;
  return process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
}

export function rpcLabel() {
  return process.env.HELIUS_API_KEY ? "Helius (chave configurada)" : "RPC público (sem chave)";
}

type RpcResp<T> = { result?: T; error?: { message: string } };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  const r = await fetchJson<RpcResp<T>>(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: 7000,
  });
  if (r.error) throw new Error(r.error.message);
  if (r.result === undefined) throw new Error("Resposta RPC vazia");
  return r.result;
}

export type MintInfo = {
  mint: string;
  program: "spl-token" | "token-2022" | "desconhecido";
  decimals: number;
  supplyRaw: string;
  supplyUi: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  extensions: string[];
};

type ParsedAccount = {
  value: null | {
    owner: string;
    data: {
      program?: string;
      parsed?: {
        type?: string;
        info?: {
          decimals: number;
          supply: string;
          mintAuthority: string | null;
          freezeAuthority: string | null;
          extensions?: { extension: string }[];
        };
      };
    };
  };
};

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export async function getMintInfo(mint: string): Promise<Result<MintInfo>> {
  let hit = false;
  return timed(
    SOLANA_RPC.name,
    SOLANA_RPC.url,
    async () => {
      const r = await cached(`rpc:mint:${mint}`, TTL.mint, async () => {
        const acc = await rpc<ParsedAccount>("getAccountInfo", [
          mint,
          { encoding: "jsonParsed", commitment: "finalized" },
        ]);
        if (!acc.value) throw new Error("Conta não encontrada na mainnet");
        const info = acc.value.data.parsed?.info;
        if (!info || acc.value.data.parsed?.type !== "mint")
          throw new Error("Endereço não é um mint de token");
        const program: MintInfo["program"] =
          acc.value.owner === TOKEN_2022
            ? "token-2022"
            : acc.value.data.program === "spl-token"
              ? "spl-token"
              : "desconhecido";
        const supplyUi = Number(info.supply) / 10 ** info.decimals;
        return {
          mint,
          program,
          decimals: info.decimals,
          supplyRaw: info.supply,
          supplyUi,
          mintAuthority: info.mintAuthority,
          freezeAuthority: info.freezeAuthority,
          extensions: (info.extensions ?? []).map((e) => e.extension),
        } satisfies MintInfo;
      });
      hit = r.hit;
      return r.value;
    },
    hit,
  );
}

export async function pingRpc(): Promise<Result<{ slot: number; endpoint: string }>> {
  return timed(SOLANA_RPC.name, SOLANA_RPC.url, async () => {
    const slot = await rpc<number>("getSlot", [{ commitment: "processed" }]);
    return { slot, endpoint: rpcLabel() };
  });
}
