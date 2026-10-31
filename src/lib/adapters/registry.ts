import { DEXSCREENER, pingDexscreener } from "./dexscreener";
import { METEORA_DBC } from "./meteora";
import { PORKBUN, porkbunConfigured } from "./porkbun";
import { PUMP_FEES } from "./pumpfees";
import { pingRpc, rpcLabel, SOLANA_RPC } from "./solana";
import type { Result } from "./types";
import { X_API, xConfigured } from "./x";
import { vaultReady } from "../wallets/vault";

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
  kind: "leitura on-chain" | "indexador" | "tabela de referência" | "interno" | "escrita on-chain" | "serviço externo";
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
      id: "meteora-dbc",
      name: METEORA_DBC.name,
      role: METEORA_DBC.role,
      notDoes: "Não compra o próprio token nem opera carteiras de terceiros; só cria config/pool, lê e reclama taxas das carteiras declaradas.",
      docs: METEORA_DBC.url,
      kind: "escrita on-chain",
      cacheTtl: "sem cache (transações) · leitura por ciclo do monitor",
      requiresKey: true,
      configured: process.env.FAROL_LAUNCH_ENABLED === "1",
    },
    {
      id: "vault",
      name: "Cofre de carteiras (Farol)",
      role: "Gera e guarda cifradas as carteiras de operação e tesouraria de cada projeto; assina lançamento e claims.",
      notDoes: "Não cria carteiras disfarçadas de usuários; toda carteira é declarada no site por função.",
      docs: "/app/carteiras",
      kind: "interno",
      cacheTtl: "arquivo cifrado em disco (volume)",
      requiresKey: true,
      configured: vaultReady(),
    },
    {
      id: "porkbun",
      name: PORKBUN.name,
      role: PORKBUN.role,
      notDoes: "Não renova sozinho; não registra acima de PORKBUN_MAX_USD.",
      docs: PORKBUN.url,
      kind: "serviço externo",
      cacheTtl: "sem cache",
      requiresKey: true,
      configured: porkbunConfigured(),
    },
    {
      id: "x-api",
      name: X_API.name,
      role: X_API.role,
      notDoes: "Não cria contas, não segue nem comenta em massa; publica só o que o kit gerou.",
      docs: X_API.url,
      kind: "serviço externo",
      cacheTtl: "sem cache",
      requiresKey: true,
      configured: xConfigured(),
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
