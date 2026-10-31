import { randomBytes } from "node:crypto";
import { dataPath, readJson, updateJson } from "../jsonstore";
import { BriefSchema, newSteps, RunSchema, type Brief, type Run, type Step, type StepId } from "./types";

const FILE = dataPath("runs.json");

async function readAll(): Promise<Run[]> {
  const raw = await readJson<unknown[]>(FILE, []);
  const out: Run[] = [];
  for (const r of raw) {
    const p = RunSchema.safeParse(r);
    if (p.success) out.push(p.data);
    else console.error(`[farol] run ignorada em ${FILE}: ${(r as { id?: string })?.id ?? "?"}`);
  }
  return out;
}

export async function listRuns() {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRun(id: string) {
  return (await readAll()).find((r) => r.id === id) ?? null;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function createRun(input: Brief): Promise<Run> {
  const brief = BriefSchema.parse(input);
  const slug = brief.slug ?? slugify(brief.name);
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new Error("Nome não gera um endereço válido; informe o slug.");
  const now = new Date().toISOString();
  const run: Run = {
    id: `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    slug,
    brief: { ...brief, slug },
    status: "executando",
    steps: newSteps(),
    createdAt: now,
    updatedAt: now,
    costsUsd: [],
  };
  await updateJson<Run[]>(FILE, [], (list) => {
    if (list.some((r) => r.slug === slug && r.status !== "falhou")) {
      throw new Error(`Já existe uma execução ativa para "${slug}".`);
    }
    return [...list, run];
  });
  return run;
}

export async function updateRun(id: string, mutate: (run: Run) => Run): Promise<Run> {
  let updated: Run | undefined;
  await updateJson<Run[]>(FILE, [], (list) =>
    list.map((r) => {
      if (r.id !== id) return r;
      updated = { ...mutate(r), updatedAt: new Date().toISOString() };
      return updated;
    }),
  );
  if (!updated) throw new Error("Execução não encontrada.");
  return updated;
}

export async function patchStep(id: string, stepId: StepId, patch: Partial<Step>): Promise<Run> {
  return updateRun(id, (run) => ({
    ...run,
    steps: run.steps.map((s) => (s.id === stepId ? { ...s, ...patch, log: patch.log ?? s.log } : s)),
  }));
}

export async function appendLog(id: string, stepId: StepId, line: string) {
  const stamp = new Date().toISOString().slice(11, 19);
  return updateRun(id, (run) => ({
    ...run,
    steps: run.steps.map((s) => (s.id === stepId ? { ...s, log: [...s.log, `${stamp} ${line}`].slice(-200) } : s)),
  }));
}

export async function addCost(id: string, item: string, usd: number) {
  return updateRun(id, (run) => ({
    ...run,
    costsUsd: [...run.costsUsd, { item, usd, at: new Date().toISOString() }],
  }));
}
