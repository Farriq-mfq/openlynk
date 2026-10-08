export function apiError(code: string, message: string) {
  return { error: { code, message } };
}

export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? process.env.WEB_URL ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// SameSite=Lax is the primary CSRF defense; this origin check is the second layer.
// Safe methods always pass. Mutations require a matching Origin (or Referer fallback).
export function csrfAllowed(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }
  const raw = request.headers.get("origin") ?? request.headers.get("referer");
  if (!raw) return false;
  let origin: string;
  try {
    origin = new URL(raw).origin;
  } catch {
    return false;
  }
  return allowedOrigins().includes(origin);
}
