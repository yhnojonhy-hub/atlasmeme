import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProject, listProjects } from "@/lib/projects/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await listProjects();
  return NextResponse.json(
    list.map((p) => ({ slug: p.slug, name: p.name, ticker: p.ticker, stage: p.stage, mint: p.mint ?? "" })),
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = await createProject(body);
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "Dados inválidos.", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 400 });
  }
}
