import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "./users";

/**
 * Sessão sem estado: cookie httpOnly com payload {uid, role, exp} assinado por HMAC-SHA256.
 * - O proxy só valida a assinatura (barato, sem disco), como recomenda o guia do Next.js.
 * - O layout do painel e as rotas de API fazem a verificação autoritativa.
 * - `x-farol-token` (FAROL_ADMIN_TOKEN) segue aceito para scripts, como administrador.
 * Sem FAROL_SECRET e sem FAROL_ADMIN_TOKEN (uso local), nada é protegido.
 */
export const COOKIE = "farol_sess";
export const SESSION_DAYS = 14;

export type Session = { uid: string; role: Role; exp: number; via: "cookie" | "token" };

export function adminToken() {
  const t = process.env.FAROL_ADMIN_TOKEN?.trim();
  return t && t.length >= 12 ? t : undefined;
}

function signingKey() {
  const k = process.env.FAROL_SESSION_SECRET?.trim() || process.env.FAROL_SECRET?.trim() || adminToken();
  return k && k.length >= 16 ? k : undefined;
}

/** Proteção ligada quando há chave para assinar sessões (ou token de scripts). */
export function authEnabled() {
  return !!signingKey() || !!adminToken();
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64url");

export function createSessionToken(uid: string, role: Role, days = SESSION_DAYS) {
  const key = signingKey();
  if (!key) throw new Error("Sem chave de sessão: defina FAROL_SECRET (ou FAROL_SESSION_SECRET).");
  const payload = b64(JSON.stringify({ uid, role, exp: Date.now() + days * 86_400_000 }));
  return `${payload}.${sign(payload, key)}`;
}

export function readSessionToken(token: string | undefined | null): Session | null {
  const key = signingKey();
  if (!key || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; role: Role; exp: number };
    if (typeof p.uid !== "string" || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return { uid: p.uid, role: p.role === "admin" ? "admin" : "operador", exp: p.exp, via: "cookie" };
  } catch {
    return null;
  }
}

export function tokenMatches(candidate: string | null | undefined) {
  const expected = adminToken();
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Sessão a partir de uma Request (API): header de script ou cookie. */
export function sessionFromRequest(req: Request): Session | null {
  if (!authEnabled()) return { uid: "local", role: "admin", exp: Infinity, via: "token" };
  if (tokenMatches(req.headers.get("x-farol-token"))) return { uid: "script", role: "admin", exp: Infinity, via: "token" };
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return readSessionToken(m?.[1]);
}

export function cookieOptions(req: Request, maxAge = SESSION_DAYS * 86_400) {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge };
}

/** Rotas de API que mudam estado, gastam ou expõem dados internos. */
export function isProtectedApi(pathname: string, method: string) {
  if (pathname.startsWith("/api/runs")) return true;
  if (pathname.startsWith("/api/wallets")) return true;
  if (pathname.startsWith("/api/users")) return true;
  if (pathname.startsWith("/api/finance")) return true;
  if (/^\/api\/projects\/[^/]+\/claim/.test(pathname)) return true;
  if (pathname.startsWith("/api/projects") && method !== "GET" && method !== "HEAD") return true;
  return false;
}

/** Áreas só de administrador. */
export function isAdminOnly(pathname: string) {
  return pathname.startsWith("/app/admin") || pathname.startsWith("/app/financeiro") || pathname.startsWith("/api/users") || pathname.startsWith("/api/finance");
}
