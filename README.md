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

## Self-hosting (Docker)

Prasyarat: Docker + Docker Compose plugin di VPS. Tidak perlu Bun/Node/Postgres lokal.

```bash
cp .env.example .env
# edit .env — wajib ganti POSTGRES_PASSWORD, JWT_SECRET, ANALYTICS_SALT
# production: sesuaikan CORS_ORIGIN, WEB_URL, API_PUBLIC_URL, NUXT_PUBLIC_API_BASE
#   ke domain publik, mis. https://example.com dan https://api.example.com
docker compose up --build -d
```

Yang terjadi saat boot: `postgres` start + healthcheck, `api` jalanin
`db:migrate` otomatis lalu serve di `:3001`, `web` serve di `:3000`.

Setup pertama: buka web (`/`), isi form `/setup` — pendaftar pertama jadi
admin, setelah itu registrasi tertutup (`403`). Tidak ada seeder.

Data persisten di volume `pgdata` (postgres) dan `uploads` (file avatar/background).
Backup cepat: `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`.

Update: `git pull && docker compose up --build -d` (migrasi jalan otomatis).
