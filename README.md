# OpenLynk Monorepo

Monorepo Bun workspaces:

- `apps/api` — API dengan **Bun + Elysia + TypeScript**
- `apps/web` — Frontend dengan **Nuxt 4 + Vue + TypeScript**

## Prasyarat

- Bun >= 1.3 (`bun --version`)
- Node >= 20 (untuk Nuxt build, opsional)

## Mulai

```bash
bun install
bun run dev
```

Jalan per-app:

```bash
bun run dev:api  # http://localhost:3001
bun run dev:web     # http://localhost:3000
```

## Struktur

```
openlynk/
  apps/
    api/  # Elysia API (port 3001)
      src/index.ts
    web/     # Nuxt 4 app (port 3000)
      app/
      nuxt.config.ts
  package.json   # bun workspaces
  turbo.json     # task orchestration
  tsconfig.json  # base tsconfig
```

## Env

- `apps/api/.env` → lihat `.env.example` (`PORT`, `CORS_ORIGIN`, `WEB_URL`)
- `apps/web/.env` → lihat `.env.example` (`NUXT_PUBLIC_API_BASE`)

## Scripts root

| Script | Fungsi |
|---|---|
| `bun run dev` | jalan semua via turbo |
| `bun run build` | build semua |
| `bun run typecheck` | typecheck semua |

## API Server

- `GET /` → info service
- `GET /health` → healthcheck
- `GET /api/hello?name=X` → contoh JSON
