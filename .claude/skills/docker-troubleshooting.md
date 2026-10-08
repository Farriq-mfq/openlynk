# Skill: docker-troubleshooting (Compose + Postgres Diagnostics)

Scope: Phase 5 infrastructure. Do NOT create or restructure `docker-compose.yml` / Dockerfiles outside Phase 5 — this skill is for DIAGNOSIS only until then.

## 1. Triage Order (follow top-down, stop at first fix)
1. `docker compose ps` — which service is unhealthy/exited? (`postgres`, `api`, `web` only — no Redis exists in this stack.)
2. `docker compose logs --tail=100 <service>` — read the FIRST error, not the last. Cascading failures hide the root cause.
3. `docker compose exec postgres pg_isready -U postgres` — if this fails, fix the DB before touching api/web.

## 2. Database Connection Mismatches (most common)
- Inside containers the host MUST be `postgres` (compose service name), never `localhost`. `localhost` inside `api` means the api container itself.
  - Correct (compose net): `DATABASE_URL=postgres://user:pass@postgres:5432/openlynk`
  - Local dev only: `DATABASE_URL=postgres://user:pass@localhost:5432/openlynk`
- Checklist: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in compose match the credentials segment of `DATABASE_URL` in `api`/`web` env. A password with `# ? @ : /` MUST be URL-encoded.
- Migrations run against the WRONG db when local `.env` leaks into compose. Verify with: `docker compose exec api printenv DATABASE_URL` vs your shell `echo $DATABASE_URL` — they must differ by host (`postgres` vs `localhost`).
- `ECONNREFUSED postgres:5432` at api boot = postgres not ready yet. Fix with compose `depends_on: postgres: condition: service_healthy` + `pg_isready` healthcheck, NOT with code retries alone.

## 3. Container Failure Patterns
- `api` exits 1 on boot: missing env (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`) or Drizzle migration pending. Check logs for `missing` / `relation does not exist` (latter = run `db:migrate` against compose DB first).
- `web` 500 on `/:username` with `ECONNREFUSED`: `NUXT_PUBLIC_API_BASE` points to `localhost:3001` from the BROWSER — correct for local dev, but server-side SSR fetch inside the `web` container needs `http://api:3001`. Split into server-side vs public base URLs.
- Port conflicts (`address already in use`): host already runs `:3000/:3001/:5432` (local `bun run dev` still up). Stop local dev before `docker compose up`, or remap ports.
- Stale build: code changed but container serves old bundle. `docker compose build --no-cache api web` then `docker compose up -d --force-recreate`. Never debug stale layers first.

## 4. Evidence Commands (Bun-safe, read-only first)
```bash
docker compose ps
docker compose logs --tail=100 postgres
docker compose logs --tail=100 api
docker compose exec postgres pg_isready -U postgres
docker compose exec postgres psql -U postgres -c "\dt"
```
- Ask before: any `down -v` (DESTROYS the postgres volume), any migrate against compose DB, any `prune` or `rm`.
- Never `docker compose down -v` on a volume holding real data without explicit user confirmation + backup note.
