# CLAUDE.md — openlynk Startup Guide

Open-source self-hosted link-in-bio. Monorepo: Bun + Elysia.js + Drizzle + PostgreSQL / Nuxt 3 SSR + Vue 3 + Tailwind. Docker Compose for prod.

## Layout (canonical)
```
openlynk/
├── apps/
│   ├── api/            # Bun + Elysia, :3001, routes under /api/v1
│   └── web/            # Nuxt 3 SSR, :3000, /[username] public + /dashboard protected
├── packages/
│   └── shared/         # src/types.ts, src/schemas.ts (TypeBox), src/constants.ts — no runtime deps
├── docker-compose.yml  # postgres + api + web (Phase 5 only)
├── .env.example
└── README.md
```
Import rule: `apps/* -> packages/shared` only. Never `shared -> apps`, never `api <-> web`.

## Mandatory commands (Bun only — never npm/npx/yarn/pnpm)
```bash
bun install
bun run dev            # all via turbo
bun run dev:web        # :3000
bun run dev:api        # :3001
bun run build          # turbo build all
bun run typecheck      # turbo typecheck all
bun run lint           # turbo lint all
bun test               # bun native tests (per-package)
bunx tsc --noEmit      # single-package typecheck fallback
```
DB (Phase 2+, always ask first): `bunx drizzle-kit generate`, `bun run db:migrate`, `bun run db:studio`.

## Rules index (MUST read before coding)
- `.claude/rules/1-tech-stack.md` — Bun/Elysia/Nuxt SSR/Vue/Tailwind locks.
- `.claude/rules/2-architecture.md` — monorepo bounds + phase protocol.
- `.claude/rules/3-database.md` — Drizzle, snake_case, timestamps, privacy analytics.
- `.claude/rules/4-security.md` — Bun.password, HttpOnly JWT, tenancy, TypeBox validation.

## Skills index
- `.claude/skills/database-migration.md` — Drizzle schema + migration workflow.
- `.claude/skills/monorepo-imports.md` — cross-package import boundaries.
- `.claude/skills/git-workflow.md` — conventional commits + branch naming.
- `.claude/skills/docker-troubleshooting.md` — container + DB connection diagnostics.

## Phase protocol (STRICT)
Active order: 1 Architecture → 2 Backend → 3 Dashboard → 4 Public SSR → 5 Docker.
1. Work ONLY on the active phase. No future-phase files.
2. End each phase with: completed, file paths, decisions/assumptions, how to test.
3. End with verbatim: `Are you ready to proceed to Phase X?` then STOP until user confirms.
