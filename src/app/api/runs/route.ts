import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { kick } from "@/lib/launcher/runner";
import { createRun, listRuns } from "@/lib/launcher/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.brief.name,
      ticker: r.brief.ticker,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      done: r.steps.filter((s) => s.status === "concluido" || s.status === "pulado").length,
      total: r.steps.length,
      current: r.steps.find((s) => s.status !== "concluido" && s.status !== "pulado")?.id ?? null,
    })),
  );
}

export async function POST(req: Request) {
  try {
    const run = await createRun(await req.json());
    kick(run.id);
    return NextResponse.json({ ok: true, run }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ ok: false, error: "Brief inválido.", issues: e.issues }, { status: 400 });
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 400 });
  }
}
