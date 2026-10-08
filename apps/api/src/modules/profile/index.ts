import { Elysia } from "elysia";
import { and, eq, ne } from "drizzle-orm";
import {
  AppearanceSchema,
  RESERVED_USERNAMES,
  UpdateProfileSchema,
} from "@openlynk/shared";
import { db } from "../../db";
import { profiles } from "../../db/schema";
import { apiError, stripTags } from "../../lib/http";
import { resolveUserId } from "../../middlewares/auth";
import { getOwnProfile } from "../../middlewares/ownership";

export const profileModule = new Elysia({ prefix: "/profile" })
  .derive(async ({ cookie }) => ({ userId: await resolveUserId(cookie) }))
  .onBeforeHandle(({ userId, status }) => {
    if (!userId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .get("/me", async ({ userId, status }) => {
    const profile = await getOwnProfile(userId as string);
    if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));
    return { profile };
  })
  .put(
    "/me",
    async ({ body, userId, status }) => {
      const uid = userId as string;
      const profile = await getOwnProfile(uid);
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
    async ({ body, userId, status }) => {
      const profile = await getOwnProfile(userId as string);
      if (!profile) return status(404, apiError("PROFILE_NOT_FOUND", "Profile not found"));

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
