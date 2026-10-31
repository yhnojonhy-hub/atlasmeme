import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession } from "@/lib/session";
import { setPassword } from "@/lib/users";

export const dynamic = "force-dynamic";

const Body = z.object({ current: z.string().min(1), next: z.string().min(10).max(200) });

/** Troca a própria senha (exige a senha atual). */
export async function POST(req: Request) {
  const s = await apiSession(req);
  if (!s || s.via !== "cookie") return NextResponse.json({ ok: false, error: "Entre com e-mail e senha para trocar a senha." }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false, error: "Nova senha com pelo menos 10 caracteres." }, { status: 400 });
  try {
    await setPassword(s.uid, body.data.next, { current: body.data.current });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 400 });
  }
}
