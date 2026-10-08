# Skill: database-migration (Drizzle + PostgreSQL + Bun)

Use for ANY schema change in `apps/api/src/db/schema.ts`. No direct SQL edits to migration output.

## 0. Preconditions
- Read `.claude/rules/3-database.md` first. Every table needs `id uuid PK`, `created_at`, `updated_at`, snake_case columns, explicit `onDelete: 'cascade'`.
- Analytics tables MUST NOT gain PII columns (no `ip_address`, `user_agent`, full URLs). See rule 3.5.
- Confirm `DATABASE_URL` points to local dev DB, never prod. Ask before running any migrate/push against a non-local URL.

## 1. Edit schema (source of truth)
1. Edit ONLY `apps/api/src/db/schema.ts` (+ `relations` in same file or `relations.ts`).
2. Keep `packages/shared/src/types.ts` in sync manually (no auto-import from Drizzle into shared).
3. Validate: `bunx tsc --noEmit` in `apps/api`, then `bun run typecheck` at root.

## 2. Generate migration (Bun only)
```bash
bunx drizzle-kit generate --config=apps/api/drizzle.config.ts
```
- NEVER hand-write files in `apps/api/src/db/migrations/`. NEVER use `npm/npx`.
- Review the generated `.sql`: must contain only intended DDL, snake_case identifiers, `ON DELETE CASCADE` where specified, required indexes from rule 3.3.
- Destructive ops (`DROP TABLE`, `DROP COLUMN`, type narrowing) REQUIRE explicit user approval before proceeding.

## 3. Apply locally
```bash
bun run db:migrate
# fallback: bunx drizzle-kit migrate --config=apps/api/drizzle.config.ts
```
- `drizzle-kit push` is FORBIDDEN (no direct schema push). Always generate + migrate.
- After migrate: smoke-test affected Elysia routes (`bun run dev:api` + curl `/health`, relevant `/api/v1/*`).

## 4. Ship checklist
- [ ] `schema.ts` + generated migration + no other app code in the same change
- [ ] `drizzle.config.ts` dialect `postgresql`, schema path correct, out dir `apps/api/src/db/migrations`
- [ ] Rollback note in PR/phase summary (which migration reverts what)
- [ ] Phase summary lists migration filename + tables touched
