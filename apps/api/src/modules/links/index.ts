import { Elysia } from "elysia";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import {
  CreateLinkSchema,
  LinkIdParamsSchema,
  ReorderLinksSchema,
  UpdateLinkSchema,
} from "@openlynk/shared";
import { db } from "../../db";
import { links } from "../../db/schema";
import { apiError, stripTags } from "../../lib/http";
import { resolveUserId } from "../../middlewares/auth";
import { getOwnedLink, getOwnProfile } from "../../middlewares/ownership";

export const linksModule = new Elysia({ prefix: "/links" })
  .derive(async ({ cookie }) => ({ userId: await resolveUserId(cookie) }))
  .onBeforeHandle(({ userId, status }) => {
    if (!userId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get("/", async ({ userId, status }) => {
    const profile = await getOwnProfile(userId as string);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    const rows = await db
      .select()
      .from(links)
      .where(eq(links.profile_id, profile.id))
      .orderBy(asc(links.position));
    return { links: rows };
  })
  .post(
    "/",
    async ({ body, set, userId, status }) => {
      const profile = await getOwnProfile(userId as string);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
      // Gapless invariant: next position is always the current count.
      const existing = await db
        .select({ id: links.id })
        .from(links)
        .where(eq(links.profile_id, profile.id));
      const [created] = await db
        .insert(links)
        .values({
          profile_id: profile.id,
          title: stripTags(body.title.trim()),
          url: body.url.trim(),
          icon: body.icon?.trim() || null,
          is_active: body.is_active ?? true,
          position: existing.length,
        })
        .returning();
      set.status = 201;
      return { link: created! };
    },
    { body: CreateLinkSchema },
  )
  .put(
    "/reorder",
    async ({ body, userId, status }) => {
      const profile = await getOwnProfile(userId as string);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
      const current = await db
        .select({ id: links.id })
        .from(links)
        .where(eq(links.profile_id, profile.id));
      const sameSet =
        current.length === body.ids.length && current.every((c) => body.ids.includes(c.id));
      if (!sameSet) {
        return status(
          400,
          apiError("IDS_MISMATCH", "ids must contain exactly the profile's link ids"),
        );
      }
      await db.transaction(async (tx) => {
        for (let i = 0; i < body.ids.length; i++) {
          await tx
            .update(links)
            .set({ position: i, updated_at: new Date() })
            .where(and(eq(links.id, body.ids[i]!), eq(links.profile_id, profile.id)));
        }
      });
      const rows = await db
        .select()
        .from(links)
        .where(eq(links.profile_id, profile.id))
        .orderBy(asc(links.position));
      return { links: rows };
    },
    { body: ReorderLinksSchema },
  )
  .put(
    "/:id",
    async ({ body, params, userId, status }) => {
      const link = await getOwnedLink(userId as string, params.id);
      if (!link) return status(404, apiError("LINK_NOT_FOUND", "Link not found"));
      const [updated] = await db
        .update(links)
        .set({
          title: body.title !== undefined ? stripTags(body.title.trim()) : undefined,
          url: body.url !== undefined ? body.url.trim() : undefined,
          icon: body.icon !== undefined ? (body.icon === null ? null : body.icon.trim() || null) : undefined,
          is_active: body.is_active,
          updated_at: new Date(),
        })
        .where(eq(links.id, link.id))
        .returning();
      return { link: updated! };
    },
    { body: UpdateLinkSchema, params: LinkIdParamsSchema },
  )
  .delete(
    "/:id",
    async ({ params, userId, status }) => {
      const link = await getOwnedLink(userId as string, params.id);
      if (!link) return status(404, apiError("LINK_NOT_FOUND", "Link not found"));
      await db.transaction(async (tx) => {
        await tx.delete(links).where(eq(links.id, link.id));
        // Close the gap so positions stay 0..N.
        // Arithmetic via parameterized sql — no string-concatenated SQL anywhere.
        await tx
          .update(links)
          .set({ position: sql`${links.position} - 1`, updated_at: new Date() })
          .where(and(eq(links.profile_id, link.profile_id), gt(links.position, link.position)));
      });
      return { ok: true };
    },
    { params: LinkIdParamsSchema },
  );
