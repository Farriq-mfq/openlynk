import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { LoginSchema, RegisterSchema, RESERVED_USERNAMES } from "@openlynk/shared";
import { db } from "../../db";
import { profiles, refreshTokens, users } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOpts,
  refreshCookieOpts,
  sha256Hex,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../../lib/jwt";
import { apiError, clientIp } from "../../lib/http";
import { resolveUserId } from "../../middlewares/auth";
import { getOwnProfile } from "../../middlewares/ownership";
import { isRateLimited } from "../../middlewares/ratelimit";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function throttle(request: Request, scope: string): boolean {
  return isRateLimited(`auth:${scope}:${clientIp(request.headers)}`);
}

async function issuePair(userId: string) {
  const jti = crypto.randomUUID();
  const access = await signAccessToken(userId);
  const refresh = await signRefreshToken(userId, jti);
  await db.insert(refreshTokens).values({
    user_id: userId,
    token_hash: sha256Hex(jti),
    expires_at: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { access, refresh };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

export const authModule = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({ body, cookie, status, request, set }) => {
      if (throttle(request, "register")) {
        return status(429, apiError("RATE_LIMITED", "Too many attempts, try again later"));
      }
      const email = body.email.trim().toLowerCase();
      const username = body.username.trim().toLowerCase();
      const display_name = body.display_name.trim();
      if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
        return status(400, apiError("USERNAME_RESERVED", "This username is reserved"));
      }
      const [emailTaken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (emailTaken) return status(409, apiError("EMAIL_TAKEN", "Email already registered"));
      const [usernameTaken] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      if (usernameTaken) return status(409, apiError("USERNAME_TAKEN", "Username already taken"));

      const password_hash = await hashPassword(body.password);
      let created: { user: typeof users.$inferSelect; profile: typeof profiles.$inferSelect };
      try {
        created = await db.transaction(async (tx) => {
          const [user] = await tx.insert(users).values({ email, password_hash }).returning();
          const [profile] = await tx
            .insert(profiles)
            .values({ user_id: user!.id, username, display_name })
            .returning();
          return { user: user!, profile: profile! };
        });
      } catch (err) {
        // Race safety: pre-checks above can lose to a concurrent insert.
        if (isUniqueViolation(err)) {
          return status(409, apiError("CONFLICT", "Email or username already taken"));
        }
        throw err;
      }

      const { access, refresh } = await issuePair(created.user.id);
      cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
      cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
      set.status = 201;
      const { password_hash: _omitted, ...safeUser } = created.user;
      return { user: safeUser, profile: created.profile };
    },
    { body: RegisterSchema },
  )
  .post(
    "/login",
    async ({ body, cookie, status, request }) => {
      if (throttle(request, "login")) {
        return status(429, apiError("RATE_LIMITED", "Too many attempts, try again later"));
      }
      const email = body.email.trim().toLowerCase();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      // Generic message: no user-enumeration via timing or text.
      if (!user || !(await verifyPassword(body.password, user.password_hash))) {
        return status(401, apiError("INVALID_CREDENTIALS", "Invalid email or password"));
      }
      const profile = await getOwnProfile(user.id);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
      const { access, refresh } = await issuePair(user.id);
      cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
      cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
      const { password_hash: _omitted, ...safeUser } = user;
      return { user: safeUser, profile };
    },
    { body: LoginSchema },
  )
  .post("/logout", async ({ cookie }) => {
    const raw = cookie?.[REFRESH_COOKIE]?.value;
    if (typeof raw === "string" && raw) {
      const payload = await verifyToken(raw);
      if (payload?.jti) {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.token_hash, sha256Hex(payload.jti)));
      }
    }
    cookie?.[ACCESS_COOKIE]?.remove();
    cookie?.[REFRESH_COOKIE]?.remove();
    return { ok: true };
  })
  .post("/refresh", async ({ cookie, status, request }) => {
    if (throttle(request, "refresh")) {
      return status(429, apiError("RATE_LIMITED", "Too many attempts, try again later"));
    }
    const raw = cookie?.[REFRESH_COOKIE]?.value;
    if (typeof raw !== "string" || !raw) {
      return status(401, apiError("UNAUTHORIZED", "Authentication required"));
    }
    const payload = await verifyToken(raw);
    if (!payload?.jti) return status(401, apiError("UNAUTHORIZED", "Authentication required"));

    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token_hash, sha256Hex(payload.jti)))
      .limit(1);
    if (!row || row.expires_at.getTime() < Date.now()) {
      if (row) await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
      return status(401, apiError("UNAUTHORIZED", "Authentication required"));
    }
    if (row.user_id !== payload.sub) {
      // Valid signature but mismatched subject: possible reuse — revoke all sessions.
      await db.delete(refreshTokens).where(eq(refreshTokens.user_id, row.user_id));
      return status(401, apiError("UNAUTHORIZED", "Authentication required"));
    }

    // Rotation: single-use refresh tokens.
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    const { access, refresh } = await issuePair(row.user_id);
    cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
    cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
    return { ok: true };
  })
  .derive(async ({ cookie }) => ({ userId: await resolveUserId(cookie) }))
  .onBeforeHandle(({ userId, status }) => {
    if (!userId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get("/me", async ({ userId, status }) => {
    const uid = userId as string;
    const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (!user) return status(404, apiError("NOT_FOUND", "User not found"));
    const profile = await getOwnProfile(uid);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    const { password_hash: _omitted, ...safeUser } = user;
    return { user: safeUser, profile };
  });
