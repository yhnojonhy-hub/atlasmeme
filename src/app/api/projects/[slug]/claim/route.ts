import { NextResponse } from "next/server";
import { getSolUsd } from "@/lib/adapters/dexscreener";
import { envBool } from "@/lib/env";
import { claimFeesForProject } from "@/lib/launcher/steps";
import { addClaim } from "@/lib/tracker/store";

export const dynamic = "force-dynamic";

/** Reclama as taxas da curva para as carteiras do projeto e lança em caixa. Transação real. */
export async function POST(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!envBool("FAROL_LAUNCH_ENABLED")) {
    return NextResponse.json({ ok: false, error: "Transações on-chain desligadas (FAROL_LAUNCH_ENABLED)." }, { status: 403 });
  }
  try {
    const solUsd = await getSolUsd();
    const r = await claimFeesForProject(slug, solUsd);
    if (r.sol > 0) await addClaim(slug, { usd: r.usd ?? 0, sol: r.sol, tx: r.creator ?? r.partner });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 400 });
  }
}
