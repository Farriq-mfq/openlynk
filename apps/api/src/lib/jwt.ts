import { SignJWT, jwtVerify } from "jose";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

let warned = false;

function secret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (raw) return new TextEncoder().encode(raw);
  const prod = process.env.NODE_ENV === "production" || process.env.BUN_ENV === "production";
  if (prod) throw new Error("JWT_SECRET is required in production");
  if (!warned) {
    console.warn("[api] JWT_SECRET unset — using insecure dev fallback. Set it in apps/api/.env");
    warned = true;
  }
  return new TextEncoder().encode("dev-only-insecure-secret");
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function signRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export interface VerifiedToken {
  sub: string;
  jti?: string;
}

export async function verifyToken(token: string): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      jti: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch {
    return null;
  }
}

export function sha256Hex(input: string): string {
  return new Bun.CryptoHasher("sha256").update(input).digest("hex");
}

export interface CookieOpts {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

function baseCookieOpts(): Omit<CookieOpts, "maxAge"> {
  const prod = process.env.NODE_ENV === "production" || process.env.BUN_ENV === "production";
  return { httpOnly: true, secure: prod, sameSite: "lax", path: "/" };
}

export const accessCookieOpts = (): CookieOpts => ({
  ...baseCookieOpts(),
  maxAge: ACCESS_TTL_SECONDS,
});

export const refreshCookieOpts = (): CookieOpts => ({
  ...baseCookieOpts(),
  maxAge: REFRESH_TTL_SECONDS,
});
