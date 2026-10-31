import { DEXSCREENER, pingDexscreener } from "./dexscreener";
import { PUMP_FEES } from "./pumpfees";
import { pingRpc, rpcLabel, SOLANA_RPC } from "./solana";
import type { Result } from "./types";

/**
 * Registro das integrações. Cada uma declara o que faz e o que NÃO faz.
 * A aba "APIs" renderiza isto; não há integração escondida.
 */
export type Integration = {
  id: string;
  name: string;
  role: string;
  notDoes: string;
  docs: string;
  kind: "leitura on-chain" | "indexador" | "tabela de referência" | "interno";
  cacheTtl: string;
  requiresKey: boolean;
  configured: boolean;
  ping?: () => Promise<Result<unknown>>;
};

export function integrations(): Integration[] {
  const list: Integration[] = [
    {
      id: "solana-rpc",
      name: SOLANA_RPC.name,
      role: `${SOLANA_RPC.role} Endpoint: ${rpcLabel()}.`,
      notDoes: "Não assina nem envia transações; não guarda chaves.",
      docs: SOLANA_RPC.url,
      kind: "leitura on-chain",
      cacheTtl: "5 min (mint)",
      requiresKey: false,
      configured: true,
      ping: pingRpc,
    },
    {
      id: "dexscreener",
      name: DEXSCREENER.name,
      role: DEXSCREENER.role,
      notDoes: "Não compra listagem, perfil ou boost; não garante cobertura.",
      docs: DEXSCREENER.url,
      kind: "indexador",
      cacheTtl: "15 s (pares)",
      requiresKey: false,
      configured: true,
      ping: pingDexscreener,
    },
    {
      id: "pump-fees",
      name: PUMP_FEES.name,
      role: PUMP_FEES.role,
      notDoes: "Não executa claim nem lê saldo do cofre; tabela de referência versionada.",
      docs: PUMP_FEES.url,
      kind: "tabela de referência",
      cacheTtl: `estática (${PUMP_FEES.updatedAt})`,
      requiresKey: false,
      configured: true,
    },
    {
      id: "projects-store",
      name: "Registro de projetos (Farol)",
      role: "Guarda a configuração pública de cada projeto: token, carteiras declaradas, políticas e canais.",
      notDoes: "Não custodia ativos; não movimenta carteiras.",
      docs: "/app/apis",
      kind: "interno",
      cacheTtl: "arquivo em disco (volume)",
      requiresKey: false,
      configured: true,
    },
  ];
  return list;
}
