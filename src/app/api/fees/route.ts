import { NextResponse } from "next/server";
import { z } from "zod";
import {
  APP_PLATFORM_FEE,
  creatorRate,
  creatorRevenue,
  GRADUATION_FEE_SOL,
  PUMP_FEES,
  SOL_TIERS,
  tierFor,
  totalRate,
  USDC_TIERS,
} from "@/lib/adapters/pumpfees";

const Body = z.object({
  phase: z.enum(["curva", "pumpswap"]),
  quote: z.enum(["SOL", "USDC"]).default("SOL"),
  mcap: z.number().nonnegative().default(0),
  volume: z.number().nonnegative().default(0),
  share: z.number().min(0).max(1).default(1),
});

export async function GET() {
  return NextResponse.json({
    source: PUMP_FEES,
    graduationFeeSol: GRADUATION_FEE_SOL,
    appPlatformFee: APP_PLATFORM_FEE,
    solTiers: SOL_TIERS.map((t) => ({ ...t, upTo: Number.isFinite(t.upTo) ? t.upTo : null })),
    usdcTiers: USDC_TIERS.map((t) => ({ ...t, upTo: Number.isFinite(t.upTo) ? t.upTo : null })),
  });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const { phase, quote, mcap, volume, share } = parsed.data;
  const tier = phase === "pumpswap" ? tierFor(mcap, quote) : null;
  return NextResponse.json({
    ok: true,
    creatorRate: creatorRate(phase, mcap, quote),
    totalRate: totalRate(phase, mcap, quote),
    tier,
    revenue: creatorRevenue(volume, phase, mcap, share, quote),
    source: PUMP_FEES,
  });
}
