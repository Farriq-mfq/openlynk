# AGENTS.md — openlynk

Bun + Turbo monorepo. API: Elysia (`apps/api`, :3001). Web: Nuxt (`apps/web`, :3000). No Postgres / Docker / Drizzle wired up yet — Phases 2–5 are pending.

## Commands (Bun only — never npm/npx/yarn/pnpm)

```bash
bun install
bun run dev            # everything via turbo (persistent)
bun run dev:api        # API only, :3001
bun run dev:web        # web only, :3000
bun run typecheck      # real verification (turbo)
bun run build          # turbo; outputs dist/**, .nuxt/**, .output/**
bun run lint           # placeholder — both packages just `echo`, no linter configured
```

Focused checks (prefer over root-wide runs):

```bash
bun --filter @openlynk/api typecheck   # tsc --noEmit in apps/api
bun --filter @openlynk/web typecheck   # nuxt typecheck (vue-tsc)
bunx tsc --noEmit                      # fallback inside apps/api
```

No test runner exists (no `test` script, no vitest/bun-test suites). Do not invent test commands. Shell here is PowerShell — chain with `;`, not `&&`.

Adding deps: `bun add --filter` fails on this Bun version (404s on workspace names). Edit the target `package.json` by hand, then run `bun install` from root. `bun --filter <pkg> <script>` works fine for *running* scripts (e.g. typecheck).

## Layout & boundaries

- `apps/api/src/index.ts` — Elysia entry (`/`, `/health`, `/api/hello`). Build: `bun build src/index.ts --target bun --outdir dist`; run: `bun dist/index.js`.
- `apps/web/` — Nuxt app under `app/` (`app.vue`, `app/pages/`); config `nuxt.config.ts`. `postinstall` runs `nuxt prepare`.
- `packages/shared` — planned (`types`, TypeBox schemas, constants) but **does not exist yet**. Never import `apps/api <-> apps/web` directly; once `shared` lands, import it via `@openlynk/shared`, never relative paths into another app. Details: `.claude/skills/monorepo-imports.md`.
- Env is per-app: copy `apps/api/.env.example` → `apps/api/.env` (`PORT`, `CORS_ORIGIN` comma-separated allowlist, `WEB_URL`) and same for web (`NUXT_PUBLIC_API_BASE`, default `http://localhost:3001`). `.env` is gitignored; only `.env.example` is committed. Never read or print `.env` contents.

## Quirks worth knowing

- Docs in `.claude/` say "Nuxt 3", but the installed reality is **Nuxt 4** (`nuxt ^4.0.3`, `compatibilityVersion: 4` in `nuxt.config.ts`). Trust the config; don't downgrade.
- API CORS uses `credentials: true` with origins split on commas — multiple origins go in one `CORS_ORIGIN` var.
- Web dev proxies `/api-proxy` → `NUXT_PUBLIC_API_BASE`; browser fetches use `runtimeConfig.public.apiBase`.
- TS is `strict`, `moduleResolution: Bundler`, `noEmit`; API tsconfig sets `types: ["bun"]`, `lib: ["ESNext"]`.
- Phase 5 infra exists: `compose.yml` + `apps/api/Dockerfile` + `apps/web/Dockerfile` + root `.env.example`. Uploads persist in the `uploads` volume; api entrypoint runs `db:migrate` on boot.
- No CI, no `opencode.json` yet.

## Working protocol

Phases run strictly 1 Architecture → 2 Backend → 3 Dashboard → 4 Public SSR → 5 Docker. Work only the active phase, don't scaffold future phases, and end each phase with: completed work, file paths, decisions/assumptions, how to test, plus the verbatim question `Are you ready to proceed to Phase X?` — then stop until confirmed.

Must-read before coding: `.claude/CLAUDE.md`, `.claude/rules/1-tech-stack.md` through `4-security.md`. Skills as needed: `database-migration`, `docker-troubleshooting`, `git-workflow` (conventional commits `type(scope): summary`, one phase per branch, never commit `.env`/build output).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
