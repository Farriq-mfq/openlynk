# 3 — Database Standards (Drizzle ORM + PostgreSQL)

## 3.1 Mandatory Table Shape
Every table MUST include:
```ts
id: uuid("id").primaryKey().defaultRandom(),
created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
```
- No table without this metadata. No `serial` PKs. UUID via `gen_random_uuid()`.
- All column names MUST be `snake_case`. All TypeScript property keys mirror column names exactly.
- Every FK MUST declare explicit `references(() => parent.id, { onDelete: "cascade" })`. No orphan rows.

## 3.2 Core Tables & Relations
- `admins`: single-owner auth identity (`email unique`, `password_hash`, `name`, `status: active | disabled`). Exactly one row per installation, created by the first `POST /api/v1/auth/register`. No profile fields here.
- `profiles`: `admin_id unique -> admins.id cascade`, `username unique`, `display_name`, `bio`, `avatar_url`, `is_published`, appearance columns (`theme`, `background_color`, `text_color`, `accent_color`, `font_family`, `button_style`) + `theme_config jsonb`.
- `links`: `profile_id -> profiles.id cascade`, `title`, `url`, `icon`, `is_active`, `position integer`.
- `profile_views`: `profile_id -> profiles.id cascade`, `viewed_at`, `referrer_domain`, `country_code`, `device_type`, `session_hash`.
- `link_clicks`: `link_id -> links.id cascade` + denormalized `profile_id -> profiles.id cascade`, `clicked_at`, same anonymized columns.
- `refresh_tokens`: `admin_id -> admins.id cascade`, `token_hash unique`, `expires_at`. Required for rotation/revocation.
- Relations: `admins 1-1 profiles 1-N links 1-N link_clicks`, `profiles 1-N profile_views`.

## 3.3 Indices (REQUIRED)
- `profiles.username UNIQUE` + `index(profiles.username)` + `index(profiles.admin_id)`.
- `index(links.profile_id, links.position)` and `index(links.profile_id, links.is_active)`.
- `index(profile_views.profile_id, profile_views.viewed_at)`.
- `index(link_clicks.link_id, link_clicks.clicked_at)` + `index(link_clicks.profile_id, link_clicks.clicked_at)`.
- `index(refresh_tokens.admin_id)`.
- `position` MUST be gapless `0..N` per `profile_id`. Reorder MUST run in a transaction.

## 3.4 Naming & Validation
- `username`: `^[a-z0-9_]{3,30}$`, lowercase, enforced in DB constraint (citek or check) AND TypeBox schema. Blocklist from `packages/shared` constants (`login, register, dashboard, api, admin, _nuxt`).
- `url`: `https://` only, max 2048 chars, TypeBox `format: 'uri'`. Strip HTML from `title` (1–120 chars), `bio` (max 280).
- Colors as `^#[0-9a-fA-F]{6}$`. Enums (`theme`, `button_style`, `device_type`) as whitelisted string unions.

## 3.5 Privacy-First Analytics (HARD CONSTRAINT)
- Analytics tables MUST NEVER contain `ip_address`, `user_agent`, `fingerprint`, `email`, full `referrer_url`, or query strings.
- Permitted columns ONLY: `referrer_domain` (hostname/eTLD+1, max 255), `country_code` (nullable 2-char, proxy header only), `device_type` enum (`mobile|desktop|tablet|other`), `session_hash` (HMAC-SHA256 with daily-rotated `ANALYTICS_SALT`, truncated).
- Derive-then-drop: parse IP/UA in memory, write enum/hash, discard raw values. Never log raw values.
- Dashboard reads MUST be aggregated (`date_trunc('day')`, `count(*)`, `count(DISTINCT session_hash)`). No per-visitor drilldown UI.
