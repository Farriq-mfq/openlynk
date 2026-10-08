import { eq } from "drizzle-orm";
import { PASSWORD_MIN_LENGTH } from "@openlynk/shared";
import { db } from "./index";
import { admins, profiles } from "./schema";
import { hashPassword } from "../lib/password";

// Seeds the single administrator account from environment variables.
// Idempotent: re-running never duplicates or overwrites the existing admin.
// Also ensures the admin's public profile exists (login requires it).
// Credentials NEVER leave this process (no logging, no API, no responses).
const ADMIN_NAME = process.env.ADMIN_NAME?.trim();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim().toLowerCase() || "admin";

if (!ADMIN_NAME) {
  console.error("[seed] missing ADMIN_NAME");
  process.exit(1);
}
if (!ADMIN_EMAIL) {
  console.error("[seed] missing ADMIN_EMAIL");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < PASSWORD_MIN_LENGTH) {
  console.error(`[seed] ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`);
  process.exit(1);
}

const [existing] = await db.select({ email: admins.email }).from(admins).limit(1);
if (existing) {
  console.log(`[seed] admin already exists (${existing.email}) — nothing to do`);
  process.exit(0);
}

const password_hash = await hashPassword(ADMIN_PASSWORD);
const [created] = await db
  .insert(admins)
  .values({ email: ADMIN_EMAIL, password_hash, name: ADMIN_NAME, status: "active" })
  .returning({ id: admins.id, email: admins.email });

// Login and the public page require a profile row — create a minimal one.
// Only when the admin has none; never touches an existing profile.
const [hasProfile] = await db
  .select({ id: profiles.id })
  .from(profiles)
  .where(eq(profiles.admin_id, created!.id))
  .limit(1);
if (!hasProfile) {
  await db.insert(profiles).values({
    admin_id: created!.id,
    username: ADMIN_USERNAME,
    display_name: ADMIN_NAME,
  });
  console.log(`[seed] admin created (${created?.email}) with default profile (@${ADMIN_USERNAME})`);
} else {
  console.log(`[seed] admin created (${created?.email})`);
}
process.exit(0);
