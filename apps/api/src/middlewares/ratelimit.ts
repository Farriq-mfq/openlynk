// Single-instance in-memory limiter. Adequate for self-hosted MVP (one api
// container); replace with a shared store only if horizontal scaling is added.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    const oldest = [...hits.entries()].sort((a, b) => a[1][0]! - b[1][0]!)[0];
    if (oldest) hits.delete(oldest[0]);
  }
  return recent.length > max;
}
