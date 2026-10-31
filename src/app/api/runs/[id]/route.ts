import { NextResponse } from "next/server";
import { getRun } from "@/lib/launcher/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ ok: false, error: "Execução não encontrada." }, { status: 404 });
  return NextResponse.json(run);
}
