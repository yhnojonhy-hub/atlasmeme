import { NextResponse } from "next/server";
import { PUBLIC_URL } from "@/lib/env";
import { getProject } from "@/lib/projects/store";

export const dynamic = "force-dynamic";

/** Metadados off-chain do token (padrão Metaplex), apontados pela URI do mint. */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getProject(slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const site = p.hostnames[0] ? `https://${p.hostnames[0]}` : `${PUBLIC_URL}/p/${p.slug}`;
  return NextResponse.json(
    {
      name: p.name,
      symbol: p.ticker,
      description: `${p.tagline} Fatos, carteiras declaradas e taxas: ${site}`,
      image: `${PUBLIC_URL}/api/projects/${p.slug}/image`,
      external_url: site,
      attributes: [
        { trait_type: "launchpad", value: p.launch?.venue ?? "manual" },
        { trait_type: "trading_fee_bps", value: p.launch?.tradingFeeBps ?? null },
        { trait_type: "liquidity", value: "100% locked after graduation" },
      ],
      extensions: {
        website: site,
        twitter: p.links.x || undefined,
        telegram: p.links.telegram || undefined,
        discord: p.links.discord || undefined,
      },
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
