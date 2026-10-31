import { env, envNum } from "../env";
import { fetchJson } from "./types";

/**
 * Porkbun — registrador com API e .xyz a ~US$ 2 no primeiro ano.
 * Papel no Farol: registrar o domínio próprio do projeto e apontar o DNS para a VM.
 * Não faz: renovações automáticas (ficam por conta do operador; o Farol registra o custo e a data).
 * Segurança: respeita o limite PORKBUN_MAX_USD por registro e usa `dryRun` antes de cobrar.
 */
export const PORKBUN = {
  name: "Porkbun (domínios)",
  url: "https://porkbun.com/api/json/v3/documentation",
  role: "Registro de domínio próprio (.xyz) e DNS apontando para a VM.",
};

const BASE = "https://api.porkbun.com/api/json/v3";

export function porkbunConfigured() {
  return !!(env("PORKBUN_API_KEY") && env("PORKBUN_SECRET_KEY"));
}

function auth() {
  return { apikey: env("PORKBUN_API_KEY"), secretapikey: env("PORKBUN_SECRET_KEY") };
}

type CheckResp = {
  status: string;
  response?: { avail?: "yes" | "no"; price?: string; premium?: "yes" | "no"; additional?: { renewal?: { price?: string } } };
  message?: string;
};

export async function checkDomain(domain: string) {
  const r = await fetchJson<CheckResp>(`${BASE}/domain/checkDomain/${domain}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(auth()),
    timeoutMs: 15000,
  });
  if (r.status !== "SUCCESS") throw new Error(r.message ?? "Porkbun: falha ao consultar domínio");
  return {
    available: r.response?.avail === "yes",
    premium: r.response?.premium === "yes",
    priceUsd: Number(r.response?.price ?? NaN),
    renewalUsd: Number(r.response?.additional?.renewal?.price ?? NaN),
  };
}

export async function registerDomain(domain: string, priceUsd: number, opts: { dryRun?: boolean } = {}) {
  const max = envNum("PORKBUN_MAX_USD", 3);
  if (priceUsd > max) throw new Error(`Domínio custa US$ ${priceUsd.toFixed(2)}, acima do limite PORKBUN_MAX_USD=${max}.`);
  const body = { ...auth(), cost: Math.round(priceUsd * 100), agreeToTerms: "yes", dryRun: opts.dryRun ? true : undefined };
  const r = await fetchJson<{ status: string; message?: string; response?: Record<string, unknown> }>(`${BASE}/domain/create/${domain}`, {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": `farol-${domain}` },
    body: JSON.stringify(body),
    timeoutMs: 30000,
  });
  if (r.status !== "SUCCESS") throw new Error(r.message ?? "Porkbun: registro recusado");
  return r.response ?? {};
}

export async function createDnsRecord(domain: string, rec: { type: "A" | "CNAME" | "TXT"; name?: string; content: string; ttl?: number }) {
  const r = await fetchJson<{ status: string; message?: string; id?: number }>(`${BASE}/dns/create/${domain}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...auth(), type: rec.type, name: rec.name ?? "", content: rec.content, ttl: String(rec.ttl ?? 600) }),
    timeoutMs: 15000,
  });
  if (r.status !== "SUCCESS") throw new Error(r.message ?? "Porkbun: falha ao criar DNS");
  return r.id;
}
