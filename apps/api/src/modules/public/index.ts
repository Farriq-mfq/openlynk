import { Elysia } from "elysia";
import { and, asc, eq } from "drizzle-orm";
import { LinkIdParamsSchema, UsernameParamsSchema } from "@openlynk/shared";
import { db } from "../../db";
import { linkClicks, links, profileViews, profiles } from "../../db/schema";
import { anonymizeSignal } from "../../lib/analytics";
import { apiError, clientIp } from "../../lib/http";

function publicProfileShape(p: typeof profiles.$inferSelect) {
  const { admin_id: _aid, ...rest } = p;
  return rest;
}

export const publicModule = new Elysia({ prefix: "/public" })
  // Singleton: the installation's single public profile. Lets `/` render the
  // owner's page directly without a landing page or a username lookup.
  .get("/profile", async ({ status }) => {
    const [profile] = await db
      .select()
      .from(profiles)
      .orderBy(asc(profiles.created_at))
      .limit(1);
    if (!profile || !profile.is_published) {
      return status(404, apiError("NOT_FOUND", "Profile not found"));
    }
    const rows = await db
      .select()
      .from(links)
      .where(and(eq(links.profile_id, profile.id), eq(links.is_active, true)))
      .orderBy(asc(links.position));
    return { profile: publicProfileShape(profile), links: rows };
  })
  .get(
    "/:username",
    async ({ params, status }) => {
      const username = params.username.trim().toLowerCase();
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      if (!profile || !profile.is_published) {
        return status(404, apiError("NOT_FOUND", "Profile not found"));
      }
      const rows = await db
        .select()
        .from(links)
        .where(and(eq(links.profile_id, profile.id), eq(links.is_active, true)))
        .orderBy(asc(links.position));
      return { profile: publicProfileShape(profile), links: rows };
    },
    { params: UsernameParamsSchema },
  )
  .post(
    "/:username/view",
    async ({ params, request, status }) => {
      const username = params.username.trim().toLowerCase();
      const [profile] = await db
        .select({ id: profiles.id, is_published: profiles.is_published })
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      if (!profile || !profile.is_published) {
        return status(404, apiError("NOT_FOUND", "Profile not found"));
      }
      const rawIp = clientIp(request.headers);
      const signal = anonymizeSignal({
        ip: rawIp === "unknown" ? null : rawIp,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        country:
          request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code") ?? null,
      });
      await db.insert(profileViews).values({ profile_id: profile.id, ...signal });
      return { ok: true };
    },
    { params: UsernameParamsSchema },
  )
  .post(
    "/links/:id/click",
    async ({ params, request, status }) => {
      const [row] = await db
        .select({
          id: links.id,
          profile_id: links.profile_id,
          is_active: links.is_active,
          is_published: profiles.is_published,
        })
        .from(links)
        .innerJoin(profiles, eq(links.profile_id, profiles.id))
        .where(eq(links.id, params.id))
        .limit(1);
      if (!row || !row.is_active || !row.is_published) {
        return status(404, apiError("NOT_FOUND", "Link not found"));
      }
      const rawIp = clientIp(request.headers);
      const signal = anonymizeSignal({
        ip: rawIp === "unknown" ? null : rawIp,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        country:
          request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code") ?? null,
      });
      await db
        .insert(linkClicks)
        .values({ link_id: row.id, profile_id: row.profile_id, ...signal });
      return { ok: true };
    },
    { params: LinkIdParamsSchema },
  );
