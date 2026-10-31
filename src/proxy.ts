import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, COOKIE, isAdminOnly, isProtectedApi, readSessionToken, tokenMatches } from "@/lib/auth";

/**
 * 1) Trava de acesso (checagem otimista, só assinatura do cookie — sem disco):
 *    /app, /novo e as APIs que escrevem/gastam exigem sessão; /app/admin e /app/financeiro exigem admin.
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

/**
 * Papel atual por id de usuário, lido de users.json e recarregado só quando o arquivo muda (mtime):
 * revoga na hora sessões de usuários removidos ou rebaixados. Um stat() por requisição protegida.
 */
let roles: Record<string, "admin" | "operador"> | null = null;
let rolesMtime = -1;
function roleOf(uid: string): "admin" | "operador" | null {
  const file = path.join(DATA_DIR, "users.json");
  let mtime = 0;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    roles = null;
    rolesMtime = -1;
    return null;
  }
  if (mtime !== rolesMtime) {
    try {
      const users = JSON.parse(readFileSync(file, "utf8")) as { id: string; role: "admin" | "operador" }[];
      roles = Object.fromEntries(users.map((u) => [u.id, u.role]));
    } catch {
      roles = null;
    }
    rolesMtime = mtime;
  }
  return roles?.[uid] ?? null;
}

function liveSession(req: NextRequest) {
  if (tokenMatches(req.headers.get("x-farol-token"))) return { role: "admin" as const };
  const s = readSessionToken(req.cookies.get(COOKIE)?.value);
  if (!s) return null;
  const role = roleOf(s.uid);
  return role ? { role } : null;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // "/app" sem a barra também casa com /apple-touch-icon.png e manda o ícone para o login.
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  const guarded = isApp || pathname === "/novo" || isProtectedApi(pathname, method);
  if (guarded && authEnabled()) {
    const isApi = pathname.startsWith("/api");
    const session = liveSession(req);
    if (!session) {
      if (isApi) return NextResponse.json({ ok: false, error: "Entre com e-mail e senha para continuar." }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
    if (isAdminOnly(pathname) && session.role !== "admin") {
      if (isApi) return NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
      const url = req.nextUrl.clone();
      url.pathname = "/app/iniciar";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (pathname === "/app") {
      const url = req.nextUrl.clone();
      url.pathname = session.role === "admin" ? "/app/admin" : "/app/iniciar";
      return NextResponse.redirect(url);
    }
  }
  if (pathname === "/entrar" && authEnabled() && liveSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/p/") || isApp || pathname === "/entrar") {
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
