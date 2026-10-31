import { NextResponse } from "next/server";
import { z } from "zod";
import { authEnabled, COOKIE, cookieOptions, createSessionToken, sessionFromRequest } from "@/lib/auth";
import { getUser, hasUsers, verifyCredentials } from "@/lib/users";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().min(3).max(254), password: z.string().min(1).max(200) });

/** Quem está logado. */
export async function GET(req: Request) {
  const s = sessionFromRequest(req);
  if (!s) return NextResponse.json({ ok: false, authenticated: false, enabled: authEnabled() }, { status: 401 });
  const user = s.via === "cookie" ? await getUser(s.uid) : { id: s.uid, email: s.via === "token" && !authEnabled() ? "local" : "script", name: s.via, role: s.role, createdAt: "" };
  if (!user) return NextResponse.json({ ok: false, authenticated: false, enabled: authEnabled() }, { status: 401 });
  return NextResponse.json({ ok: true, authenticated: true, enabled: authEnabled(), user, hasUsers: await hasUsers() });
}

/** Entra com e-mail e senha: grava a sessão em cookie httpOnly. */
export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ ok: true, open: true });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false, error: "Informe e-mail e senha." }, { status: 400 });
  const user = await verifyCredentials(body.data.email, body.data.password);
  if (!user) return NextResponse.json({ ok: false, error: "E-mail ou senha incorretos." }, { status: 401 });
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(COOKIE, createSessionToken(user.id, user.role), cookieOptions(req));
  return res;
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", cookieOptions(req, 0));
  return res;
}
