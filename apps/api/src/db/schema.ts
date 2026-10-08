import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { ThemeConfig } from "@openlynk/shared";

// admins — single-owner auth identity. One row per installation, created by
// the first POST /api/v1/auth/register (bootstrap). No profile fields here.
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// profiles — 1 row for the installation (single owner). Public page + appearance.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    admin_id: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" })
      .unique(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    display_name: varchar("display_name", { length: 80 }).notNull(),
    bio: varchar("bio", { length: 280 }),
    avatar_url: text("avatar_url"),
    is_published: boolean("is_published").default(true).notNull(),
    theme: varchar("theme", { length: 32 }).default("minimal").notNull(),
    background_color: varchar("background_color", { length: 7 }).default("#ffffff").notNull(),
    text_color: varchar("text_color", { length: 7 }).default("#111111").notNull(),
    accent_color: varchar("accent_color", { length: 7 }).default("#4f46e5").notNull(),
    font_family: varchar("font_family", { length: 64 }).default("inter").notNull(),
    button_style: varchar("button_style", { length: 16 }).default("rounded").notNull(),
    theme_config: jsonb("theme_config").$type<ThemeConfig>().default({}).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("profiles_username_idx").on(t.username),
    index("profiles_admin_id_idx").on(t.admin_id),
    // Static format guard; full validation (blocklist, normalization) lives in TypeBox schemas.
    check("profiles_username_format", sql`${t.username} ~ '^[a-z0-9_]{3,30}$'`),
  ],
);

// links — gapless position 0..N per profile. Reorder runs in a transaction.
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profile_id: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    url: text("url").notNull(),
    icon: varchar("icon", { length: 64 }),
    is_active: boolean("is_active").default(true).notNull(),
    position: integer("position").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("links_profile_position_idx").on(t.profile_id, t.position),
    index("links_profile_active_idx").on(t.profile_id, t.is_active),
  ],
);

// profile_views — privacy-first. NEVER add ip_address, user_agent, fingerprint,
// email, full referrer URLs, or query strings to this table.
export const profileViews = pgTable(
  "profile_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profile_id: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    viewed_at: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
    referrer_domain: varchar("referrer_domain", { length: 255 }),
    country_code: varchar("country_code", { length: 2 }),
    device_type: varchar("device_type", { length: 16 }),
    session_hash: varchar("session_hash", { length: 64 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("profile_views_profile_time_idx").on(t.profile_id, t.viewed_at)],
);

// link_clicks — profile_id denormalized for fast per-profile dashboard queries.
export const linkClicks = pgTable(
  "link_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    link_id: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    profile_id: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    clicked_at: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
    referrer_domain: varchar("referrer_domain", { length: 255 }),
    country_code: varchar("country_code", { length: 2 }),
    device_type: varchar("device_type", { length: 16 }),
    session_hash: varchar("session_hash", { length: 64 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("link_clicks_link_time_idx").on(t.link_id, t.clicked_at),
    index("link_clicks_profile_time_idx").on(t.profile_id, t.clicked_at),
  ],
);

// refresh_tokens — rotation + revocation. Stateless JWT alone cannot log out.
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    admin_id: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull().unique(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("refresh_tokens_admin_idx").on(t.admin_id)],
);

export const adminsRelations = relations(admins, ({ one }) => ({
  profile: one(profiles, { fields: [admins.id], references: [profiles.admin_id] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  admin: one(admins, { fields: [profiles.admin_id], references: [admins.id] }),
  links: many(links),
  profile_views: many(profileViews),
  link_clicks: many(linkClicks),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  profile: one(profiles, { fields: [links.profile_id], references: [profiles.id] }),
  clicks: many(linkClicks),
}));

export const linkClicksRelations = relations(linkClicks, ({ one }) => ({
  link: one(links, { fields: [linkClicks.link_id], references: [links.id] }),
  profile: one(profiles, { fields: [linkClicks.profile_id], references: [profiles.id] }),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  profile: one(profiles, { fields: [profileViews.profile_id], references: [profiles.id] }),
}));
