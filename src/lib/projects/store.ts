import { promises as fs } from "node:fs";
import path from "node:path";
import { ProjectSchema, type Project, type ProjectInput } from "./schema";

/**
 * Armazenamento em arquivo JSON (data/projects.json), montado como volume no Docker.
 * Simples de inspecionar, versionar e migrar para Postgres quando houver vários clientes.
 */
const DATA_DIR = process.env.FAROL_DATA_DIR?.trim() || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "projects.json");

let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAll(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const arr = JSON.parse(raw) as unknown[];
    const out: Project[] = [];
    for (const p of arr) {
      const r = ProjectSchema.safeParse(p);
      if (r.success) out.push(r.data);
      else
        console.error(
          `[farol] projeto ignorado em ${FILE}: ${(p as { slug?: string })?.slug ?? "?"} — ${r.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
    }
    return out;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(list: Project[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function listProjects() {
  return readAll();
}

export async function getProject(slug: string) {
  return (await readAll()).find((p) => p.slug === slug) ?? null;
}

export async function createProject(input: ProjectInput) {
  const parsed = ProjectSchema.parse(input);
  return withLock(async () => {
    const list = await readAll();
    if (list.some((p) => p.slug === parsed.slug)) {
      throw new Error(`Já existe um projeto com o endereço "${parsed.slug}".`);
    }
    const now = new Date().toISOString();
    const project: Project = { ...parsed, createdAt: now, updatedAt: now };
    await writeAll([...list, project]);
    return project;
  });
}

export async function updateProject(slug: string, patch: Partial<ProjectInput>) {
  return withLock(async () => {
    const list = await readAll();
    const idx = list.findIndex((p) => p.slug === slug);
    if (idx < 0) throw new Error("Projeto não encontrado.");
    const merged = ProjectSchema.parse({ ...list[idx], ...patch, slug });
    merged.updatedAt = new Date().toISOString();
    list[idx] = merged;
    await writeAll(list);
    return merged;
  });
}
