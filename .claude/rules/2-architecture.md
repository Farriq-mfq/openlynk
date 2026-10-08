# 2 — Monorepo Architecture & Phase Protocol (STRICT)

## 2.1 Monorepo Bounds
```
openlynk/
├── apps/
│   ├── api/          # Bun + Elysia backend, port 3001
│   └── web/          # Nuxt 3 frontend, port 3000
├── packages/
│   └── shared/       # Types + TypeBox schemas + constants ONLY
├── docker-compose.yml
├── .env.example
└── README.md
```
- Canonical paths are `apps/api` and `apps/web`.
- `apps/api` MUST NOT import from `apps/web`. `apps/web` MUST NOT import from `apps/api`.
- Allowed directions: `apps/api -> packages/shared`, `apps/web -> packages/shared`. NEVER `packages/shared -> apps/*`.
- `packages/shared` MUST have zero runtime deps on Elysia, Nuxt, Drizzle, or `postgres`. Types + schemas + constants only.
- API routes live under `apps/api/src/modules/<domain>/`. Web routes follow Nuxt conventions: `pages/`, `composables/`, `components/`, `middleware/`, `server/utils/` (cookie forwarding only, no business logic).

## 2.2 Ownership
- `apps/api`: owns auth, validation, authorization, DB access, analytics ingestion/aggregation.
- `apps/web`: owns rendering, forms, dashboard UX, SEO meta, cookie-forwarding fetches.
- `packages/shared`: owns `src/types.ts`, `src/schemas.ts`, `src/constants.ts` (reserved usernames, theme defaults, limits). Any duplicated type across apps MUST be moved here.

## 2.3 Incremental Development Protocol (ENFORCED)
Phases:
- Phase 1: Architecture & DB schema (design only, no app code).
- Phase 2: Backend (Elysia REST v1, auth, links CRUD + reorder, middlewares).
- Phase 3: Nuxt Admin Dashboard (protected UI, link drag-drop).
- Phase 4: Public SSR Page (`/:username`, SEO, themes, beacon analytics).
- Phase 5: Docker & Self-Hosting (Dockerfiles, compose, VPS README).

Rules:
1. Work EXCLUSIVELY on the active phase. Do NOT scaffold, code, or create files for future phases.
2. Do NOT modify a prior phase's contracts without explicit user approval.
3. At the end of every phase output: (a) what was completed, (b) file paths generated, (c) architectural decisions/assumptions, (d) how to test this phase.
4. End every phase message with the EXACT verbatim question: `Are you ready to proceed to Phase X?` (X = next number).
5. STOP after asking. Do NOT begin the next phase until the user replies affirmatively.
