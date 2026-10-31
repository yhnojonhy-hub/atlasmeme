import { createHmac, randomBytes } from "node:crypto";
import { env } from "../env";

/**
 * X (Twitter) API v2 — publicação em nome de uma conta já existente e conectada (OAuth 1.0a user context).
 * Papel no Farol: publicar o anúncio e o calendário do projeto na conta oficial.
 * Não faz: criar contas, seguir em massa, comentar em massa. Uma conta, declarada, por projeto.
 */
export const X_API = {
  name: "X API (conta oficial)",
  url: "https://developer.x.com/en/docs/x-api",
  role: "Publicar posts na conta oficial do projeto conectada por chaves OAuth.",
};

export function xConfigured() {
  return !!(env("X_API_KEY") && env("X_API_SECRET") && env("X_ACCESS_TOKEN") && env("X_ACCESS_SECRET"));
}

function pct(s: string) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function oauthHeader(method: string, url: string) {
  const p: Record<string, string> = {
    oauth_consumer_key: env("X_API_KEY")!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: env("X_ACCESS_TOKEN")!,
    oauth_version: "1.0",
  };
  const base = [method.toUpperCase(), pct(url), pct(Object.keys(p).sort().map((k) => `${pct(k)}=${pct(p[k])}`).join("&"))].join("&");
  const key = `${pct(env("X_API_SECRET")!)}&${pct(env("X_ACCESS_SECRET")!)}`;
  p.oauth_signature = createHmac("sha1", key).update(base).digest("base64");
  return `OAuth ${Object.keys(p).sort().map((k) => `${pct(k)}="${pct(p[k])}"`).join(", ")}`;
}

export async function postTweet(text: string): Promise<{ id: string; text: string }> {
  if (!xConfigured()) throw new Error("Chaves do X não configuradas.");
  const url = "https://api.x.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: oauthHeader("POST", url), "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const j = (await res.json()) as { data?: { id: string; text: string }; detail?: string; title?: string };
  if (!res.ok || !j.data) throw new Error(j.detail ?? j.title ?? `X API HTTP ${res.status}`);
  return j.data;
}
