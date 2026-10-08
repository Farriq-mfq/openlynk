import { Elysia } from "elysia";
import { and, eq, ne } from "drizzle-orm";
import {
  AppearanceSchema,
  HTTP_URL_PATTERN,
  RESERVED_USERNAMES,
  UpdateProfileSchema,
} from "@openlynk/shared";
import { db } from "../../db";
import { profiles } from "../../db/schema";
import { apiError, stripTags } from "../../lib/http";
import { resolveAdminId } from "../../middlewares/auth";
import { getAdminProfile } from "../../middlewares/ownership";

export const profileModule = new Elysia({ prefix: "/profile" })
  .derive(async ({ cookie }) => ({ adminId: await resolveAdminId(cookie) }))
  .onBeforeHandle(({ adminId, status }) => {
    if (!adminId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get("/me", async ({ adminId, status }) => {
    const profile = await getAdminProfile(adminId as string);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    return { profile };
  })
  .put(
    "/me",
    async ({ body, adminId, status }) => {
      const aid = adminId as string;
      const profile = await getAdminProfile(aid);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));

      let username = profile.username;
      if (body.username !== undefined) {
        const next = body.username.trim().toLowerCase();
        if (next !== profile.username) {
          if ((RESERVED_USERNAMES as readonly string[]).includes(next)) {
            return status(400, apiError("USERNAME_RESERVED", "This username is reserved"));
          }
          const [taken] = await db
            .select({ id: profiles.id })
            .from(profiles)
            .where(and(eq(profiles.username, next), ne(profiles.id, profile.id)))
            .limit(1);
          if (taken) return status(409, apiError("USERNAME_TAKEN", "Username already taken"));
          username = next;
        }
      }

      const [updated] = await db
        .update(profiles)
        .set({
          username,
          display_name:
            body.display_name !== undefined ? stripTags(body.display_name.trim()) : undefined,
          bio: body.bio !== undefined ? (body.bio === null ? null : stripTags(body.bio.trim())) : undefined,
          avatar_url: body.avatar_url !== undefined ? body.avatar_url : undefined,
          is_published: body.is_published !== undefined ? body.is_published : undefined,
          updated_at: new Date(),
        })
        .where(eq(profiles.id, profile.id))
        .returning();
      return { profile: updated! };
    },
    { body: UpdateProfileSchema },
  )
  .put(
    "/appearance",
    async ({ body, adminId, status }) => {
      const profile = await getAdminProfile(adminId as string);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));

      // theme_config is free-form: pin the background URL to http(s) so no
      // javascript:/data: URI can reach the public page's inline style.
      const bgUrl = (body.theme_config as { background_image_url?: unknown } | undefined)
        ?.background_image_url;
      if (bgUrl !== undefined && bgUrl !== null && bgUrl !== "") {
        if (typeof bgUrl !== "string" || !HTTP_URL_PATTERN.test(bgUrl.trim())) {
          return status(400, apiError("INVALID_BACKGROUND_URL", "Background image must be an http(s) URL"));
        }
      }

      const [updated] = await db
        .update(profiles)
        .set({
          theme: body.theme !== undefined ? body.theme.trim() : undefined,
          background_color: body.background_color,
          text_color: body.text_color,
          accent_color: body.accent_color,
          font_family: body.font_family !== undefined ? body.font_family.trim() : undefined,
          button_style: body.button_style,
          // Full-replace semantics: the dashboard always sends the complete object.
          theme_config: body.theme_config !== undefined ? body.theme_config : undefined,
          updated_at: new Date(),
        })
        .where(eq(profiles.id, profile.id))
        .returning();
      return { profile: updated! };
    },
    { body: AppearanceSchema },
  );
