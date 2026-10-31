import { z } from "zod";

/**
 * Um Projeto é a configuração pública de uma comunidade + (opcionalmente) um token.
 * Tudo aqui é declarado pelo responsável e exibido como tal.
 * Carteiras são identificadas por função — equipe, tesouraria, vesting, liquidez —
 * nunca disfarçadas de usuários independentes.
 */
export const WalletRole = z.enum([
  "equipe",
  "tesouraria",
  "vesting",
  "liquidez",
  "marketing",
  "operacao",
]);

export const Stage = z.enum([
  "descoberta",
  "comunidade",
  "ensaio",
  "lancado",
  "encerrado",
]);

export const ProjectSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "use letras minúsculas, números e hífen"),
  name: z.string().min(2).max(60),
  ticker: z.string().min(1).max(12).toUpperCase(),
  tagline: z.string().max(140).default(""),
  about: z.string().max(2000).default(""),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#F2B134"),
  stage: Stage.default("descoberta"),
  network: z.literal("solana").default("solana"),
  mint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional().or(z.literal("")),
  launchpad: z.enum(["pump.fun", "raydium-launchlab", "outro", "nenhum"]).default("nenhum"),
  links: z
    .object({
      site: z.string().url().optional().or(z.literal("")),
      x: z.string().url().optional().or(z.literal("")),
      telegram: z.string().url().optional().or(z.literal("")),
      discord: z.string().url().optional().or(z.literal("")),
    })
    .default({ site: "", x: "", telegram: "", discord: "" }),
  wallets: z
    .array(
      z.object({
        address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
        role: WalletRole,
        label: z.string().max(80).default(""),
        evidenceUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .default([]),
  supply: z
    .object({
      total: z.number().positive().default(1_000_000_000),
      allocations: z
        .array(
          z.object({
            name: z.string().max(40),
            pct: z.number().min(0).max(100),
            vesting: z.string().max(120).default(""),
          }),
        )
        .default([]),
    })
    .default({ total: 1_000_000_000, allocations: [] }),
  policies: z
    .object({
      mintAuthority: z.enum(["revogada", "ativa", "nao-informada"]).default("nao-informada"),
      freezeAuthority: z.enum(["revogada", "ativa", "nao-informada"]).default("nao-informada"),
      liquidity: z.string().max(400).default(""),
      teamSales: z.string().max(400).default(""),
      feesUse: z.string().max(400).default(""),
    })
    .default({
      mintAuthority: "nao-informada",
      freezeAuthority: "nao-informada",
      liquidity: "",
      teamSales: "",
      feesUse: "",
    }),
  disclosures: z
    .array(z.string().max(300))
    .default([
      "A equipe mantém posição no token e recebe taxas do criador quando aplicável.",
      "Não há promessa de valorização, rendimento ou proteção de capital.",
      "Capitalização de mercado não é dinheiro disponível para saque.",
    ]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectInput = z.input<typeof ProjectSchema>;

export const STAGE_LABEL: Record<Project["stage"], string> = {
  descoberta: "Descoberta",
  comunidade: "Comunidade sem token",
  ensaio: "Ensaio técnico",
  lancado: "Lançado",
  encerrado: "Encerrado",
};

export const ROLE_LABEL: Record<z.infer<typeof WalletRole>, string> = {
  equipe: "Equipe",
  tesouraria: "Tesouraria",
  vesting: "Vesting",
  liquidez: "Liquidez",
  marketing: "Marketing",
  operacao: "Operação",
};
