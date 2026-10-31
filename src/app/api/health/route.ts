import { NextResponse } from "next/server";
import { integrations } from "@/lib/adapters/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = integrations();
  const checks = await Promise.all(
    list.map(async (i) => {
      const ping = i.ping ? await i.ping() : null;
      return {
        id: i.id,
        name: i.name,
        role: i.role,
        notDoes: i.notDoes,
        docs: i.docs,
        kind: i.kind,
        cacheTtl: i.cacheTtl,
        configured: i.configured,
        status: ping ? (ping.ok ? "online" : "falha") : "estática",
        latencyMs: ping?.latencyMs ?? null,
        checkedAt: ping?.fetchedAt ?? new Date().toISOString(),
        detail: ping ? (ping.ok ? ping.data : ping.error) : null,
      };
    }),
  );
  const allOk = checks.every((c) => c.status !== "falha");
  return NextResponse.json(
    { ok: allOk, checks, app: { version: process.env.npm_package_version ?? "0.1.0", region: process.env.FAROL_REGION ?? "local" } },
    { status: allOk ? 200 : 503 },
  );
}
