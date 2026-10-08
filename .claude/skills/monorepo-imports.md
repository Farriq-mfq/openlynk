# Skill: monorepo-imports (Cross-Package Boundaries)

Enforce on EVERY new file. Violations MUST be fixed before typecheck passes.

## 1. Allowed Graph
```
apps/api  -> packages/shared   (types, TypeBox schemas, constants)
apps/web  -> packages/shared   (types, schemas, constants)
packages/shared -> NOTHING      (zero imports from apps/*)
apps/api <-> apps/web          (FORBIDDEN in both directions)
```
- Workspace package names: `@openlynk/api`, `@openlynk/web`, `@openlynk/shared`.
- Shared code MUST be imported via workspace specifier (`@openlynk/shared`), never via relative paths like `../../../packages/shared` or `../../api/src/...`.

## 2. Forbidden Patterns (reject on sight)
- `apps/api` importing from `apps/web`, `apps/web` importing from `apps/api` (any depth, including `server/utils` reaching into api).
- `packages/shared` importing `elysia`, `nuxt`, `vue`, `drizzle-orm`, `postgres`, or any app-internal module.
- Duplicated `User/Profile/Link` interfaces in both apps instead of a single definition in `packages/shared/src/types.ts`.
- API validation schemas defined only in `apps/api` without a mirror in `packages/shared/src/schemas.ts`.

## 3. Correct Patterns
- API handler: `import { LinkSchema } from '@openlynk/shared'` then use in Elysia `t` validator.
- Web form: `import type { Link } from '@openlynk/shared'` + `import { LinkSchema } from '@openlynk/shared'`.
- New shared constant (e.g. reserved username): add to `packages/shared/src/constants.ts`, import from both apps. Never hardcode in two places.
- Adding a workspace dep: `bun add @openlynk/shared --filter @openlynk/api` (never hand-edit `node_modules` links).

## 4. Verification
```bash
# must return ZERO hits (run from repo root, excludes build output):
rg -l "apps/api|apps/web|@openlynk/(api|web)" packages/shared --glob '!node_modules'
rg -l "from ['\"].*apps/(api|web)" apps --glob '!node_modules' --glob '!.nuxt/**' --glob '!.output/**' --glob '!dist/**'
bun run typecheck
```
- [ ] `packages/shared/package.json` has NO dependency on elysia/nuxt/drizzle/postgres.
- [ ] No relative import crosses an `apps/*` boundary.
- [ ] New shared type exported from `packages/shared/src/types.ts` and consumed by at least one app.
