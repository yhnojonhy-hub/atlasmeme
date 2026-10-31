import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { adminToken, COOKIE, isProtectedApi, tokenMatches } from "@/lib/auth";

/**
 * 1) Trava de operador: com FAROL_ADMIN_TOKEN, /app e as APIs que escrevem exigem token.
 * 2) Sites por hostname: `slug.FAROL_BASE_DOMAIN` e domínios próprios registrados no projeto
 *    são servidos como /p/slug. Custo zero por site: um DNS wildcard e um certificado wildcard.
 */
const DATA_DIR = process.env.FAROL_DATA_DIR?.trim() || path.join(process.cwd(), "data");
const BASE = process.env.FAROL_BASE_DOMAIN?.trim().toLowerCase();
let hosts: Record<string, string> = {};
let loadedAt = 0;

function hostMap() {
  if (Date.now() - loadedAt > 10_000) {
    try {
      hosts = JSON.parse(readFileSync(path.join(DATA_DIR, "hostnames.json"), "utf8"));
    } catch {
      hosts = {};
    }
    loadedAt = Date.now();
  }
  return hosts;
}

function operatorOk(req: NextRequest) {
  if (!adminToken()) return true;
  return tokenMatches(req.headers.get("x-farol-token") ?? req.cookies.get(COOKIE)?.value);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (pathname.startsWith("/app") || pathname === "/novo" || isProtectedApi(pathname, method)) {
    if (!operatorOk(req)) {
      if (pathname.startsWith("/api")) return NextResponse.json({ ok: false, error: "Token de operador ausente ou inválido." }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/p/") || pathname.startsWith("/app") || pathname === "/entrar") {
    return NextResponse.next();
  }
  let slug: string | undefined = hostMap()[host];
  if (!slug && BASE && host.endsWith(`.${BASE}`)) {
    const label = host.slice(0, -(BASE.length + 1));
    if (label && label !== "www" && !label.includes(".")) slug = label;
  }
  if (!slug) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? `/p/${slug}` : `/p/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg|favicon.ico).*)"] };
