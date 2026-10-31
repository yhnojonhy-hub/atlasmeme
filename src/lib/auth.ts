import { timingSafeEqual } from "node:crypto";

/**
 * Trava de operador. Com FAROL_ADMIN_TOKEN definido, o painel (/app) e toda rota que escreve
 * ou gasta (runs, carteiras, claim, projetos) exigem o token — por cookie (navegador) ou
 * header `x-farol-token` (scripts). Sem token configurado, nada é protegido (uso local).
 */
export const COOKIE = "farol_op";

export function adminToken() {
  const t = process.env.FAROL_ADMIN_TOKEN?.trim();
  return t && t.length >= 12 ? t : undefined;
}

export function tokenMatches(candidate: string | null | undefined) {
  const expected = adminToken();
  if (!expected) return true;
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Rotas de API que mudam estado ou gastam recursos. */
export function isProtectedApi(pathname: string, method: string) {
  if (pathname.startsWith("/api/runs")) return true;
  if (pathname.startsWith("/api/wallets")) return true;
  if (/^\/api\/projects\/[^/]+\/claim/.test(pathname)) return true;
  if (pathname.startsWith("/api/projects") && method !== "GET" && method !== "HEAD") return true;
  return false;
}
