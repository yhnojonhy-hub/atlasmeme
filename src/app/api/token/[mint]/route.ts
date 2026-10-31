import { NextResponse } from "next/server";
import { getMintInfo } from "@/lib/adapters/solana";
import { isMint } from "@/lib/adapters/types";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isMint(mint)) {
    return NextResponse.json({ ok: false, error: "Endereço de mint inválido." }, { status: 400 });
  }
  const info = await getMintInfo(mint);
  return NextResponse.json(info, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
