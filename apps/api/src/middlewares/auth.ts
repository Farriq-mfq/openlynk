import { ACCESS_COOKIE, verifyToken } from "../lib/jwt";

// Resolves the JWT subject from the access_token HttpOnly cookie.
// IMPORTANT (Elysia 1.4): derive() state does NOT propagate types through
// .use(plugin), so every protected module calls this inside its OWN local
// .derive() instead of sharing a plugin. See probe notes in git history.
export async function resolveUserId(
  cookie: Record<string, { value?: unknown } | undefined> | undefined,
): Promise<string | null> {
  const raw = cookie?.[ACCESS_COOKIE]?.value;
  if (typeof raw !== "string" || !raw) return null;
  const payload = await verifyToken(raw);
  return payload?.sub ?? null;
}
