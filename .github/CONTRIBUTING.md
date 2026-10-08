# Contributing

## Local setup

Requires Bun >= 1.3 and a local PostgreSQL >= 16.

```bash
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun run db:migrate
bun run dev   # api :3001, web :3000
```

## Checks

```bash
bun run typecheck   # required before every PR
bun run lint        # placeholder, no linter configured yet
```

There is no test runner in this repo — do not invent test commands.

## Flow

Fork, then a short-lived branch named `<type>/<scope>-<short-desc>`
(e.g. `fix/web-auth-cookie-forward`). Open a PR against `main`; never commit
to `main` directly. Never commit `.env` files or build output.

Commits follow Conventional Commits, e.g. `feat(api): add links reorder
endpoint`. See `.claude/skills/git-workflow.md` for the full convention.
