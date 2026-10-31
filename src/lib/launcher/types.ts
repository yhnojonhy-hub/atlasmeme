import { z } from "zod";

/**
 * O Lançador transforma um brief mínimo em projeto completo: identidade, carteiras,
 * site, domínio, kit social, curva, lançamento, listagem e acompanhamento.
 * Cada passo é idempotente, grava o que produziu e pode parar em "espera" quando
 * precisa de algo que só o operador tem (chave de API, SOL na carteira, confirmação).
 */
export const STEP_IDS = [
  "identidade",
  "carteiras",
  "site",
  "dominio",
  "social",
  "curva",
  "lancamento",
  "listagem",
  "acompanhamento",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_TITLE: Record<StepId, string> = {
  identidade: "Identidade",
  carteiras: "Carteiras",
  site: "Site",
  dominio: "Domínio",
  social: "Kit social",
  curva: "Curva e taxas",
  lancamento: "Lançamento on-chain",
  listagem: "Listagem e indexação",
  acompanhamento: "Acompanhamento",
};

export const StepStatus = z.enum(["pendente", "executando", "concluido", "espera", "pulado", "falhou"]);
export type StepStatus = z.infer<typeof StepStatus>;

export const StepSchema = z.object({
  id: z.enum(STEP_IDS),
  status: StepStatus.default("pendente"),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  log: z.array(z.string()).default([]),
  /** O que falta para continuar (quando em espera). */
  needs: z.string().optional(),
  /** Ação que o operador pode disparar para destravar (ex.: "confirmar-lancamento"). */
  action: z.string().optional(),
  output: z.record(z.string(), z.unknown()).default({}),
});
export type Step = z.infer<typeof StepSchema>;

export const BriefSchema = z.object({
  name: z.string().min(2).max(60),
  ticker: z.string().min(1).max(12).transform((s) => s.toUpperCase()),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  /** Tema em uma linha: o que é, para quem. Sem promessa de preço. */
  theme: z.string().min(3).max(140),
  about: z.string().max(2000).default(""),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  links: z
    .object({
      x: z.string().url().optional().or(z.literal("")),
      telegram: z.string().url().optional().or(z.literal("")),
      discord: z.string().url().optional().or(z.literal("")),
    })
    .default({ x: "", telegram: "", discord: "" }),
  /** Economia da curva (padrão: o que o mercado faz hoje em Meteora DBC). */
  tradingFeeBps: z.number().int().min(10).max(1000).default(200),
  creatorSharePct: z.number().min(0).max(100).default(80),
  initialMarketCapSol: z.number().positive().default(30),
  migrationMarketCapSol: z.number().positive().default(400),
  /** Parcela da oferta travada para a equipe (vesting linear após graduação). 0 = sem alocação. */
  teamAllocationPct: z.number().min(0).max(20).default(0),
  teamVestingMonths: z.number().int().min(0).max(48).default(12),
  /** Tentar registrar domínio próprio (.xyz) além do subdomínio do Farol. */
  wantOwnDomain: z.boolean().default(true),
  /** Lançar on-chain automaticamente ao final (ainda exige FAROL_LAUNCH_ENABLED e SOL na carteira). */
  autoLaunch: z.boolean().default(false),
});
export type Brief = z.input<typeof BriefSchema>;
export type BriefParsed = z.infer<typeof BriefSchema>;

export const RunStatus = z.enum(["executando", "espera", "concluido", "falhou"]);

export const RunSchema = z.object({
  id: z.string(),
  slug: z.string(),
  brief: BriefSchema,
  status: RunStatus.default("executando"),
  steps: z.array(StepSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Custos reais pagos pela automação (domínio, rent de contas), em US$. */
  costsUsd: z.array(z.object({ item: z.string(), usd: z.number(), at: z.string() })).default([]),
});
export type Run = z.infer<typeof RunSchema>;

export type StepResult =
  | { status: "concluido"; output?: Record<string, unknown>; log?: string[] }
  | { status: "pulado"; output?: Record<string, unknown>; log?: string[] }
  | { status: "espera"; needs: string; action?: string; output?: Record<string, unknown>; log?: string[] }
  | { status: "falhou"; error: string; log?: string[] };

export function newSteps(): Step[] {
  return STEP_IDS.map((id) => ({ id, status: "pendente", log: [], output: {} }));
}
