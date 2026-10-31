import { NextResponse } from "next/server";
import { z } from "zod";
import { advance } from "@/lib/launcher/runner";
import { getRun } from "@/lib/launcher/store";
import { STEP_IDS } from "@/lib/launcher/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  stepId: z.enum(STEP_IDS).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  /** true: espera o pipeline avançar até parar; false: dispara e devolve. */
  wait: z.boolean().default(true),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!(await getRun(id))) return NextResponse.json({ ok: false, error: "Execução não encontrada." }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false, error: "Pedido inválido.", issues: body.error.issues }, { status: 400 });
  const { stepId, payload, wait } = body.data;
  if (!wait) {
    void advance(id, { stepId, payload }).catch((e) => console.error("[farol] advance:", e));
    return NextResponse.json({ ok: true, started: true });
  }
  const run = await advance(id, { stepId, payload });
  return NextResponse.json({ ok: true, run });
}
