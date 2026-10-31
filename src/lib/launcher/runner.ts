import { getProject } from "../projects/store";
import { appendLog, getRun, patchStep, updateRun } from "./store";
import { STEPS } from "./steps";
import type { Run, Step, StepId, StepResult } from "./types";

/**
 * Executa os passos em ordem. Para em "espera" quando um passo precisa do operador;
 * `advance()` retoma do primeiro passo não concluído. Um passo nunca roda duas vezes
 * em paralelo para a mesma execução.
 */
const running = new Set<string>();

export type StepContext = {
  run: Run;
  step: Step;
  log: (line: string) => Promise<void>;
  /** Projeto já publicado (a partir do passo "site"). */
  project: () => Promise<NonNullable<Awaited<ReturnType<typeof getProject>>>>;
  /** Parâmetros passados pela ação do operador (ex.: confirmação). */
  input?: Record<string, unknown>;
};

export async function advance(runId: string, input?: { stepId?: StepId; payload?: Record<string, unknown> }) {
  if (running.has(runId)) return getRun(runId);
  running.add(runId);
  try {
    let run = await getRun(runId);
    if (!run) throw new Error("Execução não encontrada.");
    // Repetir um passo já pulado/concluído (ex.: domínio depois de adicionar chaves): volta a pendente.
    if (input?.stepId) {
      const target = run.steps.find((s) => s.id === input.stepId);
      if (target && (target.status === "pulado" || target.status === "concluido" || target.status === "falhou")) {
        await patchStep(runId, input.stepId, { status: "pendente", finishedAt: undefined });
      }
    } else if (run.status === "concluido") return run;
    if (run.status === "falhou") {
      const failed = run.steps.find((s) => s.status === "falhou");
      if (failed) await patchStep(runId, failed.id, { status: "pendente" });
    }

    for (const def of STEPS) {
      run = (await getRun(runId))!;
      const step = run.steps.find((s) => s.id === def.id)!;
      if (step.status === "concluido" || step.status === "pulado") continue;

      const isTarget = !input?.stepId || input.stepId === def.id;
      await patchStep(runId, def.id, { status: "executando", startedAt: step.startedAt ?? new Date().toISOString(), needs: undefined, action: undefined });
      await updateRun(runId, (r) => ({ ...r, status: "executando" }));

      const ctx: StepContext = {
        run,
        step,
        log: (line) => appendLog(runId, def.id, line).then(() => undefined),
        project: async () => {
          const p = await getProject(run!.slug);
          if (!p) throw new Error("Projeto ainda não publicado.");
          return p;
        },
        input: isTarget ? input?.payload : undefined,
      };

      let result: StepResult;
      try {
        result = await def.run(ctx);
      } catch (e) {
        result = { status: "falhou", error: e instanceof Error ? e.message : String(e) };
      }

      for (const line of result.log ?? []) await ctx.log(line);

      if (result.status === "falhou") {
        await ctx.log(`Falhou: ${result.error}`);
        await patchStep(runId, def.id, { status: "falhou", finishedAt: new Date().toISOString() });
        await updateRun(runId, (r) => ({ ...r, status: "falhou" }));
        return getRun(runId);
      }
      if (result.status === "espera") {
        await patchStep(runId, def.id, { status: "espera", needs: result.needs, action: result.action, output: { ...step.output, ...result.output } });
        await updateRun(runId, (r) => ({ ...r, status: "espera" }));
        return getRun(runId);
      }
      await patchStep(runId, def.id, {
        status: result.status,
        finishedAt: new Date().toISOString(),
        output: { ...step.output, ...result.output },
      });
    }

    await updateRun(runId, (r) => ({ ...r, status: "concluido" }));
    return getRun(runId);
  } finally {
    running.delete(runId);
  }
}

/** Dispara em segundo plano e devolve imediatamente. */
export function kick(runId: string, input?: Parameters<typeof advance>[1]) {
  void advance(runId, input).catch((e) => console.error("[farol] lançador:", e));
}
