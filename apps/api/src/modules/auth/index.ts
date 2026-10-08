import { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { LoginSchema, RegisterSchema, RESERVED_USERNAMES } from "@openlynk/shared";
import { db } from "../../db";
import { admins, profiles, refreshTokens } from "../../db/schema";
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
import { resolveAdminId } from "../../middlewares/auth";
import { getAdminProfile, isAdminActive } from "../../middlewares/ownership";
import { isRateLimited } from "../../middlewares/ratelimit";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function throttle(request: Request, scope: string): boolean {
  return isRateLimited(`auth:${scope}:${clientIp(request.headers)}`);
}

async function issuePair(adminId: string) {
  const jti = crypto.randomUUID();
  const access = await signAccessToken(adminId);
  const refresh = await signRefreshToken(adminId, jti);
  await db.insert(refreshTokens).values({
    admin_id: adminId,
    token_hash: sha256Hex(jti),
    expires_at: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { access, refresh };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

export const authModule = new Elysia({ prefix: "/auth" })
  // Single-admin bootstrap: this endpoint is open ONLY until the first admin
  // exists. The first registration becomes the installation owner (admin +
  // profile created together); every later call gets 403. There is no other
  // account creation path.
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
      let created: { admin: typeof admins.$inferSelect; profile: typeof profiles.$inferSelect } | null;
      try {
        created = await db.transaction(async (tx) => {
          // Serialize concurrent bootstraps: only one transaction can win.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('openlynk_admin_bootstrap'))`);
          const [taken] = await tx.select({ id: admins.id }).from(admins).limit(1);
          if (taken) return null;
          const password_hash = await hashPassword(body.password);
          const [admin] = await tx
            .insert(admins)
            .values({ email, password_hash, name: display_name, status: "active" })
            .returning();
          const [profile] = await tx
            .insert(profiles)
            .values({ admin_id: admin!.id, username, display_name })
            .returning();
          return { admin: admin!, profile: profile! };
        });
      } catch (err) {
        // Race safety net: concurrent winners collide on unique constraints.
        if (isUniqueViolation(err)) {
          return status(409, apiError("CONFLICT", "Registration is closed"));
        }
        throw err;
      }
      if (!created) {
        return status(403, apiError("REGISTRATION_CLOSED", "Registration is closed"));
      }
      const { access, refresh } = await issuePair(created.admin.id);
      cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
      cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
      set.status = 201;
      const { password_hash: _omitted, ...safeAdmin } = created.admin;
      return { admin: safeAdmin, profile: created.profile };
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
      const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      // Generic message: no admin-enumeration via timing or text.
      if (!admin || !(await verifyPassword(body.password, admin.password_hash))) {
        return status(401, apiError("INVALID_CREDENTIALS", "Invalid email or password"));
      }
      if (admin.status !== "active") {
        return status(403, apiError("ACCOUNT_DISABLED", "This account is disabled"));
      }
      const profile = await getAdminProfile(admin.id);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
      const { access, refresh } = await issuePair(admin.id);
      cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
      cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
      const { password_hash: _omitted, ...safeAdmin } = admin;
      return { admin: safeAdmin, profile };
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
    if (row.admin_id !== payload.sub) {
      // Valid signature but mismatched subject: possible reuse — revoke all sessions.
      await db.delete(refreshTokens).where(eq(refreshTokens.admin_id, row.admin_id));
      return status(401, apiError("UNAUTHORIZED", "Authentication required"));
    }
    if (!(await isAdminActive(row.admin_id))) {
      await db.delete(refreshTokens).where(eq(refreshTokens.admin_id, row.admin_id));
      return status(403, apiError("ACCOUNT_DISABLED", "This account is disabled"));
    }

    // Rotation: single-use refresh tokens.
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    const { access, refresh } = await issuePair(row.admin_id);
    cookie[ACCESS_COOKIE]?.set({ value: access, ...accessCookieOpts() });
    cookie[REFRESH_COOKIE]?.set({ value: refresh, ...refreshCookieOpts() });
    return { ok: true };
  })
  .derive(async ({ cookie }) => ({ adminId: await resolveAdminId(cookie) }))
  .onBeforeHandle(({ adminId, status }) => {
    if (!adminId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get("/me", async ({ adminId, status }) => {
    const aid = adminId as string;
    const [admin] = await db.select().from(admins).where(eq(admins.id, aid)).limit(1);
    if (!admin) return status(404, apiError("NOT_FOUND", "Admin not found"));
    if (admin.status !== "active") {
      return status(403, apiError("ACCOUNT_DISABLED", "This account is disabled"));
    }
    const profile = await getAdminProfile(aid);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    const { password_hash: _omitted, ...safeAdmin } = admin;
    return { admin: safeAdmin, profile };
  });
