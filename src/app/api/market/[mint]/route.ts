import { NextResponse } from "next/server";
import { getPairs } from "@/lib/adapters/dexscreener";
import { isMint } from "@/lib/adapters/types";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isMint(mint)) {
    return NextResponse.json({ ok: false, error: "Endereço de mint inválido." }, { status: 400 });
  }
  const pairs = await getPairs(mint);
  return NextResponse.json(pairs, {
    headers: { "cache-control": "public, max-age=5, stale-while-revalidate=15" },
  });
}
