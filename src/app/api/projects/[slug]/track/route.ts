import { NextResponse } from "next/server";
import { getSolUsd } from "@/lib/adapters/dexscreener";
import { getProject } from "@/lib/projects/store";
import { getTrack, summarize } from "@/lib/tracker/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getProject(slug);
  if (!p) return NextResponse.json({ ok: false, error: "Projeto não encontrado." }, { status: 404 });
  const t = await getTrack(slug);
  if (!t) return NextResponse.json({ ok: true, tracking: p.tracking, track: null });
  const solUsd = await getSolUsd();
  const hours = Number(new URL(req.url).searchParams.get("hours") ?? 48);
  const cut = Date.now() - hours * 3600_000;
  return NextResponse.json({
    ok: true,
    tracking: p.tracking,
    solUsd,
    summary: summarize(t, solUsd),
    snapshots: t.snapshots.filter((s) => Date.parse(s.at) >= cut),
    costs: t.costsUsd,
    claims: t.claimsUsd,
    startedAt: t.startedAt,
  });
}
