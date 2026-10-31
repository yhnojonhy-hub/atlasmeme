/**
 * Cache em memória com TTL por chave. Suficiente para um único processo (piloto).
 * Em produção com várias réplicas, troque por Redis mantendo esta interface.
 */
type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return { value: hit.value, hit: true };
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return { value, hit: false };
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export const TTL = {
  price: 10_000,
  pairs: 15_000,
  mint: 5 * 60_000,
  health: 30_000,
} as const;
