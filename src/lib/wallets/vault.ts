import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "../env";
import { dataPath, readJson, writeJson } from "../jsonstore";

/**
 * Cofre de carteiras do Lançador.
 * - Cada carteira é um keypair ed25519 gerado aqui, cifrado com AES-256-GCM.
 * - A chave de cifra deriva de FAROL_SECRET (scrypt). Sem FAROL_SECRET, nenhuma carteira é criada.
 * - A chave privada só sai por exportação explícita, autenticada pelo mesmo segredo.
 * Toda carteira criada aqui é declarada no site do projeto, por função. Nunca é apresentada como terceiro.
 */
type VaultEntry = {
  pubkey: string;
  role: string;
  label: string;
  slug: string;
  createdAt: string;
  kdf: { salt: string; N: number };
  cipher: { iv: string; tag: string; data: string };
};

function masterSecret() {
  const s = env("FAROL_SECRET");
  if (!s || s.length < 16) throw new Error("FAROL_SECRET ausente ou curto (mínimo 16 caracteres). Defina no .env para criar carteiras.");
  return s;
}

function deriveKey(secret: string, salt: Buffer, N = 16384) {
  return scryptSync(secret, salt, 32, { N, r: 8, p: 1 });
}

function file(pubkey: string) {
  return dataPath("vault", `${pubkey}.json`);
}

export function vaultReady() {
  const s = env("FAROL_SECRET");
  return !!s && s.length >= 16;
}

export async function createWallet(opts: { slug: string; role: string; label: string }) {
  const secret = masterSecret();
  const kp = Keypair.generate();
  const salt = randomBytes(16);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(Buffer.from(kp.secretKey)), c.final()]);
  const entry: VaultEntry = {
    pubkey: kp.publicKey.toBase58(),
    role: opts.role,
    label: opts.label,
    slug: opts.slug,
    createdAt: new Date().toISOString(),
    kdf: { salt: salt.toString("base64"), N: 16384 },
    cipher: { iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") },
  };
  await writeJson(file(entry.pubkey), entry);
  return { pubkey: entry.pubkey, role: entry.role, label: entry.label };
}

export async function loadKeypair(pubkey: string): Promise<Keypair> {
  const entry = await readJson<VaultEntry | null>(file(pubkey), null);
  if (!entry) throw new Error(`Carteira ${pubkey} não está no cofre.`);
  const key = deriveKey(masterSecret(), Buffer.from(entry.kdf.salt, "base64"), entry.kdf.N);
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(entry.cipher.iv, "base64"));
  d.setAuthTag(Buffer.from(entry.cipher.tag, "base64"));
  const secretKey = Buffer.concat([d.update(Buffer.from(entry.cipher.data, "base64")), d.final()]);
  const kp = Keypair.fromSecretKey(new Uint8Array(secretKey));
  if (kp.publicKey.toBase58() !== pubkey) throw new Error("Cofre corrompido: chave pública não confere.");
  return kp;
}

export async function listWallets(slug?: string) {
  const dir = dataPath("vault");
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const out: { pubkey: string; role: string; label: string; slug: string; createdAt: string }[] = [];
  for (const n of names) {
    if (!n.endsWith(".json")) continue;
    const e = await readJson<VaultEntry | null>(dataPath("vault", n), null);
    if (e && (!slug || e.slug === slug)) out.push({ pubkey: e.pubkey, role: e.role, label: e.label, slug: e.slug, createdAt: e.createdAt });
  }
  return out;
}

/** Exporta a chave privada em base58 (formato aceito por Phantom/Solflare). Exige o segredo mestre. */
export async function exportSecret(pubkey: string, providedSecret: string) {
  const s = masterSecret();
  const a = Buffer.from(providedSecret);
  const b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Segredo inválido.");
  const kp = await loadKeypair(pubkey);
  return bs58.encode(kp.secretKey);
}
