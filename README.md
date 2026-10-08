# OpenLynk

Your own **link-in-bio page** on your own server. Think Linktree, but you own
it: one public page with all your links, no trackers, no monthly fee, no one
else's branding. No coding needed to use it — if you can fill in a form, you
can run your own page.

- **Public page** (`/:username`) — links, profile, themes, avatar & background images, SEO meta, privacy-first view/click analytics
- **Private dashboard** (`/dashboard`) — links manager with drag-and-drop ordering, appearance editor with theme presets + live preview, analytics
- **Single-admin model** — the first registration via `/setup` becomes the owner; registration closes afterwards. No SaaS, no teams, no roles
- **Uploads** — avatar and background images served by the API (PNG/JPEG/WebP/GIF, 2 MB cap, SVG rejected)
- **Docker-first self-hosting** — `docker compose up`, migrations run automatically on boot

## Using OpenLynk

1. **Create your account** — open `/setup` once and fill in the form. You become the owner; nobody else can register afterwards.
2. **Add your links** — sign in at `/login`, open the dashboard, add links and drag them into order. Change colors and your profile picture under Appearance and watch the live preview.
3. **Share your page** — your public page lives at `/yourname`. Put that one link in your bios. The dashboard shows how many people visited and clicked, without tracking any individual visitor.

## Get it running (Docker, recommended)

You need Docker + Docker Compose on the server. Nothing else to install.

```bash
cp .env.example .env
# edit .env — must change POSTGRES_PASSWORD, JWT_SECRET, ANALYTICS_SALT.
# production: point CORS_ORIGIN, WEB_URL, API_PUBLIC_URL, NUXT_PUBLIC_API_BASE
#   at your public domains, e.g. https://example.com and https://api.example.com
docker compose up --build -d
```

The database starts first, then the app (which prepares itself automatically).
Then open `/setup` in your browser to create the owner account.

- Your data lives in Docker volumes `pgdata` (database) and `uploads` (pictures), so it survives restarts and updates.
- Backup: `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
- Update: `git pull && docker compose up --build -d`

## For developers

Everything below is for people working on the code. As a user you can stop here.

### Tech stack

| Layer | Tech |
|---|---|
| Monorepo | Bun workspaces + Turborepo |
| API (`apps/api`) | Bun, Elysia, Drizzle ORM, PostgreSQL, JWT (HttpOnly cookies + rotation) |
| Web (`apps/web`) | Nuxt 4, Vue, Nuxt UI |
| Shared (`packages/shared`) | Types, TypeBox schemas, constants (no runtime deps on Elysia/Nuxt/Drizzle) |
| Ship | Docker Compose (postgres + api + web) |

### Quickstart — local dev

Prerequisites: **Bun >= 1.3**, **Node >= 20**, **PostgreSQL >= 16** running locally.

```bash
# 1. Install
bun install

# 2. Configure (one file per app)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edit apps/api/.env: DATABASE_URL, JWT_SECRET, ANALYTICS_SALT

# 3. Migrate
bun run db:migrate

# 4. Run everything (api :3001, web :3000)
bun run dev
```

Per app:

```bash
bun run dev:api  # http://localhost:3001
bun run dev:web     # http://localhost:3000
```

First run: open `/` — with no admin yet every page redirects to `/setup`.
Fill the form and the first account becomes the admin. Afterwards `/setup`
returns `403` and `/login` is the way in.

### Configuration

`apps/api/.env` (see `apps/api/.env.example`):

| Var | Purpose |
|---|---|
| `PORT` | API listen port (`3001`) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Token signing secret (**required in production**) |
| `ANALYTICS_SALT` | Daily-rotated salt for anonymized analytics hashes |
| `CORS_ORIGIN` | Allowed browser origins, comma-separated |
| `WEB_URL` | Public web base URL |
| `API_PUBLIC_URL` | Browser-reachable API base URL (used for uploaded-file URLs) |

`apps/web/.env` (see `apps/web/.env.example`):

| Var | Purpose |
|---|---|
| `NUXT_PUBLIC_API_BASE` | API base URL for the browser |
| `NUXT_API_BASE_INTERNAL` | API base URL for server-side rendering (e.g. `http://api:3001` in Docker) |

Root `.env` (Docker only, see `.env.example`): postgres credentials, host ports,
and mirrors of the above.

### Project structure

```
openlynk/
  apps/
    api/                 # Elysia API (:3001)
      src/
        index.ts         # entry: CORS, CSRF, error shape, route groups
        modules/         # auth, profile, links, analytics, public, uploads
        middlewares/     # auth (JWT), ownership, ratelimit
        db/              # schema.ts, migrations/, migrate.ts (boot)
        uploads/         # runtime user files (gitignored, volume in Docker)
      Dockerfile + docker-entrypoint.sh
    web/                 # Nuxt 4 app (:3000)
      app/               # pages/, layouts/, middleware/, composables/
      nuxt.config.ts
      Dockerfile
  packages/shared/       # types + TypeBox schemas + constants
  compose.yml            # postgres + api + web
  turbo.json / package.json / tsconfig.json
```

### Scripts (repo root)

| Script | Purpose |
|---|---|
| `bun run dev` | everything via Turbo |
| `bun run dev:api` / `bun run dev:web` | one app |
| `bun run build` | build all |
| `bun run typecheck` | typecheck all (required before push) |
| `bun run lint` | placeholder (no linter configured yet) |
| `bun run db:generate` / `db:migrate` / `db:studio` | Drizzle workflow (api package) |

### API overview (`/api/v1`)

- `GET /health`, `GET /` — service info
- Auth: `POST /auth/register` (first account only), `/auth/login`, `/auth/logout`, `/auth/refresh`, `GET /auth/me`, `GET /auth/setup-status`
- Profile: `GET|PUT /profile/me`, `PUT /profile/appearance`
- Links: `GET|POST /links`, `PUT /links/reorder`, `PUT|DELETE /links/:id`
- Analytics: `GET /analytics/summary`, `GET /analytics/links` (aggregates only, no PII)
- Public: `GET /public/profile`, `GET /public/:username` (+ view/click beacons)
- Uploads: `POST /uploads/image` (admin), `GET /uploads/:name` (public)

Auth uses `HttpOnly; Secure; SameSite=Lax` cookies; mutations additionally
require an allowlisted `Origin`. All admin reads/writes resolve ownership
server-side from the JWT — client-supplied ids are never trusted.

### Roadmap

- [x] Phase 1 — Architecture & database schema
- [x] Phase 2 — Backend (auth, links, middlewares)
- [x] Phase 3 — Admin dashboard
- [x] Phase 4 — Public SSR page
- [x] Phase 5 — Docker & self-hosting
- [ ] Phase 6+ — Products, orders, courses, events, appointments, donations, reviews, subscriptions, custom domains (see `.claude/rules/2-architecture.md`)

## License

No license file yet — all rights reserved by default until one is added.
