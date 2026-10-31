import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { apiSession } from "@/lib/session";
import { addEntry, addFixedCost, EntrySchema, financeOverview, FixedCostSchema, removeEntry, removeFixedCost } from "@/lib/finance";

export const dynamic = "force-dynamic";

async function admin(req: Request) {
  const s = await apiSession(req);
  return s && s.role === "admin";
}
const deny = () => NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
const fail = (e: unknown) =>
  NextResponse.json({ ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "Dados inválidos." : e instanceof Error ? e.message : "Erro" }, { status: 400 });

export async function GET(req: Request) {
  if (!(await admin(req))) return deny();
  const balances = new URL(req.url).searchParams.get("saldos") !== "0";
  return NextResponse.json({ ok: true, ...(await financeOverview({ balances })) }, { headers: { "cache-control": "no-store" } });
}

const Body = z.union([z.object({ kind: z.literal("fixo"), data: FixedCostSchema }), z.object({ kind: z.literal("lancamento"), data: EntrySchema })]);

/** Lança custo: fixo mensal (infra) ou avulso (de um projeto ou geral). */
export async function POST(req: Request) {
  if (!(await admin(req))) return deny();
  try {
    const b = Body.parse(await req.json());
    const row = b.kind === "fixo" ? await addFixedCost(b.data) : await addEntry(b.data);
    return NextResponse.json({ ok: true, row }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  if (!(await admin(req))) return deny();
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const kind = u.searchParams.get("kind");
  if (!id || (kind !== "fixo" && kind !== "lancamento")) return NextResponse.json({ ok: false, error: "Informe id e kind." }, { status: 400 });
  if (kind === "fixo") await removeFixedCost(id);
  else await removeEntry(id);
  return NextResponse.json({ ok: true });
}
