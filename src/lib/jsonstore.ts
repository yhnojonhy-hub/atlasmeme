import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./env";

/**
 * Arquivo JSON com escrita atômica e fila por arquivo.
 * Um processo só (piloto). Trocar por Postgres mantendo esta interface quando houver vários clientes.
 */
const locks = new Map<string, Promise<void>>();

export function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(
    file,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function dataPath(...parts: string[]) {
  return path.join(DATA_DIR, ...parts);
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

export async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function updateJson<T>(file: string, fallback: T, mutate: (current: T) => T | Promise<T>): Promise<T> {
  return withFileLock(file, async () => {
    const next = await mutate(await readJson(file, fallback));
    await writeJson(file, next);
    return next;
  });
}
