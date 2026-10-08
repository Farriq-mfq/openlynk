# 1 — Tech Stack Constraints (STRICT, NON-NEGOTIABLE)

Applies to: `apps/api`, `apps/web`, `packages/shared`.

## 1.1 Backend — Bun + Elysia.js + TypeScript
- Runtime MUST be Bun. No Node runtime code, no `node:`-only APIs unless Bun supports them.
- Framework MUST be Elysia.js. Group all routes under `/api/v1`.
- Language MUST be TypeScript `strict: true`. No `any` without justification. Prefer `unknown` + narrowing.
- ORM MUST be Drizzle ORM with `postgres` driver. No Prisma, TypeORM, Knex, raw `pg` queries outside Drizzle.
- DB MUST be PostgreSQL. No SQLite, MySQL, MongoDB.
- Validation MUST use TypeBox (`@sinclair/typebox` via Elysia `t`) in `apps/api`, mirrored in `packages/shared`. Zod allowed ONLY in `apps/web` forms if needed, never as API source of truth.

## 1.2 Frontend — Nuxt 3 + Vue 3 + Tailwind CSS
- Framework MUST be Nuxt 3 with SSR enabled. Do NOT disable SSR. Do NOT convert public pages to SPA-only.
- Public profile route `/:username` MUST be SSR with `useAsyncData` + dynamic `useSeoMeta` (OG/X tags). No client-only fetching for first paint.
- Vue MUST use Composition API with `<script setup lang="ts">`. No Options API in new code.
- Styling MUST be Tailwind CSS utility-first. No global CSS frameworks, no inline `<style>` for layout except scoped theme variables.
- State MUST use Vue composables (`composables/useAuth.ts`, `composables/useLinks.ts`). No Pinia/Vuex unless explicitly approved.
- Auth state MUST derive from HttpOnly cookies via API (`credentials: 'include'`), never from localStorage.

## 1.3 Package Manager — Bun Native Only
- MUST use `bun add`, `bun remove`, `bun install`, `bun run`, `bunx`. NEVER `npm`, `npx`, `yarn`, `pnpm`.
- Workspaces are Bun workspaces. Root `packageManager: bun`.
- Lockfile is `bun.lock`. Do NOT commit `package-lock.json` or `yarn.lock`.
- Turbo tasks invoked via `bun run dev | build | typecheck`. Never bypass with raw `turbo` binary.

## 1.4 Forbidden
- No Redis, no message broker, no extra infra service unless MVP scope is formally amended.
- No `bcrypt`, `argon2` npm packages. Password hashing is `Bun.password` only (see `4-security.md`).
- No ORM-less SQL string concatenation. All queries via Drizzle query builder.
