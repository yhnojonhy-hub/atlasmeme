import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { apiSession } from "@/lib/session";
import { createUser, deleteUser, listUsers, ROLES, setPassword, updateUser } from "@/lib/users";

export const dynamic = "force-dynamic";

async function admin(req: Request) {
  const s = await apiSession(req);
  return s && s.role === "admin" ? s : null;
}
const fail = (e: unknown, status = 400) =>
  NextResponse.json({ ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "Dados inválidos." : e instanceof Error ? e.message : "Erro" }, { status });

export async function GET(req: Request) {
  if (!(await admin(req))) return NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
  return NextResponse.json({ ok: true, users: await listUsers() });
}

const Create = z.object({ email: z.string(), password: z.string(), name: z.string().max(80).optional(), role: z.enum(ROLES).default("operador") });

export async function POST(req: Request) {
  if (!(await admin(req))) return NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
  try {
    const b = Create.parse(await req.json());
    const user = await createUser({ ...b, mustChangePassword: true });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

const Patch = z.object({ id: z.string().uuid(), name: z.string().max(80).optional(), role: z.enum(ROLES).optional(), password: z.string().optional() });

export async function PATCH(req: Request) {
  const s = await admin(req);
  if (!s) return NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
  try {
    const b = Patch.parse(await req.json());
    if (b.name || b.role) await updateUser(b.id, { name: b.name, role: b.role });
    if (b.password) await setPassword(b.id, b.password, { byAdmin: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  const s = await admin(req);
  if (!s) return NextResponse.json({ ok: false, error: "Só administradores." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (id === s.uid) return NextResponse.json({ ok: false, error: "Você não pode remover a si mesmo." }, { status: 400 });
  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
