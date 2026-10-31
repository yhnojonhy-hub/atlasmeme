/** Arranque do processo (Node): semente do administrador e monitor contínuo. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSeedAdmin } = await import("./lib/users");
  await ensureSeedAdmin();
  if (process.env.FAROL_MONITOR !== "0") {
    const { startMonitor } = await import("./lib/tracker/monitor");
    startMonitor(Number(process.env.FAROL_MONITOR_INTERVAL_MS) || 60_000);
  }
}
