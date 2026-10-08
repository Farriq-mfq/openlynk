import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { links, profiles } from "../db/schema";

// Server-derived tenancy: callers pass the JWT-verified userId, never a
// client-supplied user_id/profile_id. Null = not found or not owned (callers 404).
export async function getOwnProfile(userId: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.user_id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOwnedLink(userId: string, linkId: string) {
  const rows = await db
    .select({ link: links })
    .from(links)
    .innerJoin(profiles, eq(links.profile_id, profiles.id))
    .where(and(eq(links.id, linkId), eq(profiles.user_id, userId)))
    .limit(1);
  return rows[0]?.link ?? null;
}
