import { NextResponse } from "next/server";
import { adminToken, COOKIE, tokenMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Entra como operador: grava o token em cookie httpOnly. */
export async function POST(req: Request) {
  if (!adminToken()) return NextResponse.json({ ok: true, open: true });
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  if (!tokenMatches(body.token)) return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  res.cookies.set(COOKIE, body.token!, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
