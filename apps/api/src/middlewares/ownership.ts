import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { admins, links, profiles } from "../db/schema";

// Single-admin tenancy: callers pass the JWT-verified adminId, never a
// client-supplied admin_id/profile_id. Null = not found (callers 404).
export async function getAdminProfile(adminId: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.admin_id, adminId))
    .limit(1);
  return rows[0] ?? null;
}

// Active-status guard: a disabled admin loses API access even with a valid JWT.
export async function isAdminActive(adminId: string): Promise<boolean> {
  const rows = await db
    .select({ status: admins.status })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);
  return rows[0]?.status === "active";
}

export async function getOwnedLink(adminId: string, linkId: string) {
  const rows = await db
    .select({ link: links })
    .from(links)
    .innerJoin(profiles, eq(links.profile_id, profiles.id))
    .where(and(eq(links.id, linkId), eq(profiles.admin_id, adminId)))
    .limit(1);
  return rows[0]?.link ?? null;
}
