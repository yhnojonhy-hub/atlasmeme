import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "./env";
import { dataPath, readJson, updateJson } from "./jsonstore";

/**
 * Usuários do painel, em data/users.json. Senha guardada só como hash scrypt (N=32768, salt aleatório).
 * Papéis: admin (vê e gerencia tudo, inclusive usuários e financeiro) e operador (opera projetos).
 */
export const ROLES = ["admin", "operador"] as const;
export type Role = (typeof ROLES)[number];

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  /** Marcado quando a senha veio de semente (env) e ainda não foi trocada. */
  mustChangePassword?: boolean;
};
export type PublicUser = Omit<User, "passwordHash">;

const FILE = dataPath("users.json");
const N = 32768;

export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(10, "Senha com pelo menos 10 caracteres.").max(200);

/** scrypt usa 128·N·r bytes; o padrão de maxmem (32 MiB) não comporta N=32768, r=8. */
const maxmem = (n: number) => 128 * n * 8 * 2;

function hashPassword(password: string, salt = randomBytes(16)) {
  const h = scryptSync(password.normalize("NFKC"), salt, 64, { N, r: 8, p: 1, maxmem: maxmem(N) });
  return `scrypt$${N}$${salt.toString("base64")}$${h.toString("base64")}`;
}

function checkPassword(password: string, stored: string) {
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = scryptSync(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: 8, p: 1, maxmem: maxmem(Number(n)) });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const strip = (u: User): PublicUser => {
  const { passwordHash: _omit, ...rest } = u;
  void _omit;
  return rest;
};

async function readAll() {
  return readJson<User[]>(FILE, []);
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await readAll()).map(strip);
}

export async function hasUsers() {
  return (await readAll()).length > 0;
}

export async function getUser(id: string): Promise<PublicUser | null> {
  const u = (await readAll()).find((x) => x.id === id);
  return u ? strip(u) : null;
}

export async function createUser(input: { email: string; password: string; name?: string; role?: Role; mustChangePassword?: boolean }): Promise<PublicUser> {
  const email = EmailSchema.parse(input.email);
  const password = PasswordSchema.parse(input.password);
  const role: Role = input.role ?? "operador";
  const user: User = {
    id: randomUUID(),
    email,
    name: input.name?.trim() || email.split("@")[0],
    role,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    mustChangePassword: input.mustChangePassword ?? false,
  };
  await updateJson<User[]>(FILE, [], (all) => {
    if (all.some((u) => u.email === email)) throw new Error("Já existe um usuário com este e-mail.");
    return [...all, user];
  });
  return strip(user);
}

/** Verifica e-mail + senha. Devolve o usuário (sem hash) ou null. Custo constante o bastante para não vazar existência. */
export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  const e = EmailSchema.safeParse(email);
  if (!e.success) return null;
  const u = (await readAll()).find((x) => x.email === e.data);
  const ok = u ? checkPassword(password, u.passwordHash) : checkPassword(password, dummyHash());
  if (!u || !ok) return null;
  await updateJson<User[]>(FILE, [], (all) => all.map((x) => (x.id === u.id ? { ...x, lastLoginAt: new Date().toISOString() } : x)));
  return strip(u);
}
let DUMMY: string | undefined;
/** Hash fictício para igualar o tempo quando o e-mail não existe. */
const dummyHash = () => (DUMMY ??= hashPassword("farol-dummy-password"));

export async function setPassword(id: string, next: string, opts: { current?: string; byAdmin?: boolean } = {}) {
  const password = PasswordSchema.parse(next);
  await updateJson<User[]>(FILE, [], (all) => {
    const u = all.find((x) => x.id === id);
    if (!u) throw new Error("Usuário não encontrado.");
    if (!opts.byAdmin && !checkPassword(opts.current ?? "", u.passwordHash)) throw new Error("Senha atual incorreta.");
    return all.map((x) => (x.id === id ? { ...x, passwordHash: hashPassword(password), mustChangePassword: false } : x));
  });
}

export async function updateUser(id: string, patch: { name?: string; role?: Role }) {
  await updateJson<User[]>(FILE, [], (all) => {
    if (!all.some((x) => x.id === id)) throw new Error("Usuário não encontrado.");
    const next = all.map((x) => (x.id === id ? { ...x, ...(patch.name ? { name: patch.name.trim() } : {}), ...(patch.role ? { role: patch.role } : {}) } : x));
    if (!next.some((x) => x.role === "admin")) throw new Error("Deve existir ao menos um administrador.");
    return next;
  });
}

export async function deleteUser(id: string) {
  await updateJson<User[]>(FILE, [], (all) => {
    const next = all.filter((x) => x.id !== id);
    if (next.length === all.length) throw new Error("Usuário não encontrado.");
    if (!next.some((x) => x.role === "admin")) throw new Error("Não é possível remover o último administrador.");
    return next;
  });
}

/**
 * Semente: se não há usuários e FAROL_ADMIN_EMAIL + FAROL_ADMIN_PASSWORD estão no ambiente,
 * cria o primeiro administrador. Depois disso a variável de senha pode (e deve) ser removida do .env.
 */
export async function ensureSeedAdmin() {
  const email = env("FAROL_ADMIN_EMAIL");
  const password = env("FAROL_ADMIN_PASSWORD");
  if (!email || !password) return null;
  if (await hasUsers()) return null;
  try {
    const u = await createUser({ email, password, role: "admin", name: env("FAROL_ADMIN_NAME"), mustChangePassword: true });
    console.log(`[farol] administrador inicial criado: ${u.email}. Remova FAROL_ADMIN_PASSWORD do .env.`);
    return u;
  } catch (e) {
    console.error("[farol] semente de administrador falhou:", e instanceof Error ? e.message : e);
    return null;
  }
}
