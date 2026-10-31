import { NextResponse } from "next/server";
import { z } from "zod";
import { exportSecret, listWallets, vaultReady } from "@/lib/wallets/vault";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("projeto") ?? undefined;
  return NextResponse.json({ ready: vaultReady(), wallets: await listWallets(slug) });
}

const Body = z.object({ pubkey: z.string().min(32), secret: z.string().min(16) });

/** Exporta a chave privada (base58) de uma carteira do cofre. Exige o segredo mestre no corpo. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false, error: "Informe pubkey e segredo." }, { status: 400 });
  try {
    const secretKey = await exportSecret(body.data.pubkey, body.data.secret);
    return NextResponse.json({ ok: true, pubkey: body.data.pubkey, secretKey }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erro" }, { status: 403 });
  }
}
