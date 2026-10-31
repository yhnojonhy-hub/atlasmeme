/** Liga o monitor contínuo no processo do servidor (Node). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.FAROL_MONITOR !== "0") {
    const { startMonitor } = await import("./lib/tracker/monitor");
    startMonitor(Number(process.env.FAROL_MONITOR_INTERVAL_MS) || 60_000);
  }
}
