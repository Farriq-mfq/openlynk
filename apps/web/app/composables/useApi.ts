// Shared $fetch client for the Elysia API.
// Client: browser sends HttpOnly cookies via credentials:include.
// Server (SSR): forwards the incoming request cookie header (Api never sees localStorage).
export function apiMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: unknown }).data as
      | { error?: { code?: string; message?: string } }
      | undefined;
    if (typeof data?.error?.message === "string" && data.error.message) {
      return data.error.message;
    }
  }
  return fallback;
}

export function apiCode(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: unknown }).data as { error?: { code?: string } } | undefined;
    if (typeof data?.error?.code === "string") return data.error.code;
  }
  return null;
}

export function useApi() {
  const config = useRuntimeConfig();
  const base = import.meta.server
    ? config.apiBaseInternal || config.public.apiBase
    : config.public.apiBase;
  const headers: Record<string, string> = {};
  if (import.meta.server) {
    const cookie = useRequestHeaders(["cookie"]).cookie;
    if (cookie) headers.cookie = cookie;
  }
  return $fetch.create({
    baseURL: `${base}/api/v1`,
    credentials: "include",
    headers,
  });
}
