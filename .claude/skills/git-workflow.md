# Skill: git-workflow (Conventional Commits + Branch Naming)

Applies to all openlynk changes. Keep history phase-scoped and reviewable.

## 1. Conventional Commits (REQUIRED format)
```
<type>(<scope>): <short imperative summary>
```
- Types: `feat | fix | chore | docs | refactor | test | ci | perf | revert`. No other types.
- Scopes: `api | web | shared | infra | claude | repo`. Use exactly one. Omit scope ONLY for root-level changes (`chore: ...`).
- Summary: imperative, lowercase after colon, max 72 chars, no trailing period.
- Body (when needed): what + why, plus phase reference (`Phase 2`), migration filenames, breaking-change notes.

Examples:
```
feat(api): add links reorder endpoint with gapless position
fix(web): forward auth cookie on server-side dashboard fetch
chore(shared): add reserved username blocklist constants
docs(repo): update self-hosting guide for blank vps
ci(infra): add production dockerfiles for api and web
```

## 2. Branch Naming (REQUIRED)
```
<type>/<scope>-<short-kebab-desc>[-<issue-no>]
```
- `type` mirrors commit types (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`).
- Examples: `feat/api-links-reorder`, `fix/web-auth-cookie-forward`, `chore/shared-username-blocklist`, `ci/infra-prod-dockerfiles`.
- One phase per branch. Never mix Phase 3 dashboard work into a Phase 2 backend branch.

## 3. Rules
- NEVER commit directly to `main`. Always a short-lived branch + review.
- NEVER commit `.env`, `*.local`, `node_modules/`, build output (`.nuxt/`, `.output/`, `dist/`). These are gitignored — if staged, unstage immediately.
- `bun.lock` changes go in their own `chore(repo)` commit, separate from feature code.
- Migration SQL (`apps/api/src/db/migrations/*.sql`) MUST be committed together with its `schema.ts` change in the same commit. Never commit generated SQL alone.
- Before push: `bun run typecheck` clean, `bun run lint` clean, migration checklist from `database-migration.md` satisfied.
