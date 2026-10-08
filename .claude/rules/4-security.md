# 4 — Security Rules (AUTH, TENANCY, VALIDATION)

Violations MUST be rejected. No exceptions without explicit user sign-off.

## 4.1 Password Hashing — Bun Native Only
- MUST use `Bun.password.hash(password)` for storage and `Bun.password.verify(password, hash)` for login.
- FORBIDDEN: `bcrypt`, `bcryptjs`, `argon2`, `scrypt` npm packages, custom SHA/MD5 hashing.
- Enforce password policy at schema level: min 8 chars, max 128 chars. Never log, return, or embed passwords/hashes in responses.

## 4.2 JWT via Secure HttpOnly Cookies (Nuxt 3 Compatible)
- Tokens MUST travel ONLY in `HttpOnly; Secure (in prod); SameSite=Lax; Path=/` cookies: `access_token` (15 min, `{sub}`), `refresh_token` (7d, `{sub, jti}` + row in `refresh_tokens`).
- FORBIDDEN: tokens in response bodies, URLs, or `localStorage`/`sessionStorage`.
- Login/refresh MUST use `Set-Cookie`. Logout MUST delete DB row + clear both cookies with `Max-Age=0`.
- There is exactly ONE account-creation path: `POST /api/v1/auth/register`, which succeeds ONLY when no admin exists (the first registration becomes the installation owner, admin + profile created in one transaction). Afterwards it MUST return `403 REGISTRATION_CLOSED`. There is no seeder-created admin and no other registration path. Concurrent first-registers MUST be serialized (advisory lock + unique-constraint fallback) so two admins can never be created.
- `GET /api/v1/auth/setup-status` is the ONLY public auth read besides login/register. It returns `{ setupRequired: boolean }` and MUST be rate-limited. It reveals setup state only — never admin data. The web middleware forces every page to `/setup` while `setupRequired` is true (so `/login` is unreachable pre-setup) and bounces `/setup` to `/login` once setup is done.
- `GET /api/v1/public/profile` serves the installation's single published profile (+ active links). It powers `/` directly, so no landing page and no username lookup are needed on the entry route.
- Refresh MUST rotate: verify cookie -> check `token_hash` -> delete old row -> issue new pair. Reuse of revoked `jti` MUST 401.
- Nuxt SSR MUST forward `cookie` header (`useRequestHeaders(['cookie'])`) to API and use `credentials: 'include'` client-side. CORS MUST be allowlist-only (`CORS_ORIGIN`), never `*`.
- Mutations REQUIRE `Origin`/`Referer` allowlist check as CSRF defense alongside `SameSite=Lax`.

## 4.3 Single-Admin Authorization (MANDATORY ON EVERY MUTATION)
- Auth middleware MUST resolve `adminId` from verified `access_token` before any `/links`, `/profile`, or `/analytics` handler. A `disabled` admin status MUST reject with 403 even with a valid JWT (checked at login, refresh, and `/me`).
- NEVER trust `admin_id` or `profile_id` from client body/query. Derive ownership server-side: `profiles.admin_id = auth.adminId`. There is exactly one admin; no roles, teams, or tenant scoping.
- Pattern for `POST/PUT/DELETE /links` and `PUT /profile/*`:
  1. `SELECT profiles WHERE admin_id = auth.adminId` (404 if none).
  2. For `:id` routes: `SELECT links JOIN profiles WHERE links.id = :id AND profiles.admin_id = auth.adminId` (404 on mismatch — prefer 404 to avoid ID oracle).
  3. Execute mutation scoped to resolved `profile_id`.
- Public endpoints (`GET /public/:username`) are read-only and MUST expose only `is_published = true` + `is_active = true` links. No email/hash leakage.

## 4.4 Input Validation — Block XSS & SQL Injection
- EVERY API input (body, params, query) MUST have a TypeBox schema in Elysia (`t.Object(...)`) imported from or mirrored in `packages/shared`. No unvalidated handlers.
- SQL injection: Drizzle query builder ONLY. No string-concatenated SQL. Any `sql``` usage MUST use parameterized bindings and requires justification.
- XSS: trim all strings; strip HTML tags from `title/bio/display_name`; validate `url` as `https://` URI (reject `javascript:`, `data:`); set `avatar_url` to https URI or null; API returns JSON only (no HTML interpolation). Public page MUST escape all user content (Vue default; never `v-html` on user data).
- Auth endpoints MUST rate-limit (e.g. 10 req/min/IP) and return generic `401 Invalid credentials` (no user-enumeration). Error payloads MUST NOT leak stack traces in production.
