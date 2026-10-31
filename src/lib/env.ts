import path from "node:path";

/** Variável vazia conta como ausente (ex.: `CHAVE=` no .env). */
export function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export function envBool(name: string) {
  const v = env(name)?.toLowerCase();
  return v === "1" || v === "true" || v === "sim" || v === "yes";
}

export function envNum(name: string, fallback: number) {
  const v = Number(env(name));
  return Number.isFinite(v) ? v : fallback;
}

export const DATA_DIR = env("FAROL_DATA_DIR") || path.join(process.cwd(), "data");

/** Domínio-base onde cada projeto ganha `slug.DOMINIO` sem custo (DNS wildcard). */
export const BASE_DOMAIN = env("FAROL_BASE_DOMAIN");
export const PUBLIC_URL = env("FAROL_PUBLIC_URL") || "http://localhost:3000";
