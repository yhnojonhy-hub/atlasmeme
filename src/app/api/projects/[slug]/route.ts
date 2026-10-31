import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProject, updateProject } from "@/lib/projects/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getProject(slug);
  if (!p) return NextResponse.json({ ok: false, error: "Projeto não encontrado." }, { status: 404 });
  return NextResponse.json(p);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const patch = await req.json();
    const p = await updateProject(slug, patch);
    return NextResponse.json({ ok: true, project: p });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "Dados inválidos.", issues: e.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 400 });
  }
}
