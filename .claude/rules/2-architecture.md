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

## 2.4 Advanced Feature Roadmap (Phases 6–14)

Extended roadmap (design follows the same bounds as 2.1–2.2):

```
Phase 6  — Products
Phase 7  — Orders
Phase 8  — Courses
Phase 9  — Events
Phase 10 — Appointments
Phase 11 — Donations
Phase 12 — Reviews
Phase 13 — Subscriptions
Phase 14 — Custom Domains
```

- Ordering is load-bearing: Products (6) before Orders (7); Orders (7) before Courses (8), Events (9), Appointments (10), Subscriptions (13), since all sell through the Orders purchasable interface.
- The phase protocol in 2.3 applies unchanged to Phases 6–14: one active phase at a time, schema design first (`schema.ts` + migration SQL in the same commit), no scaffolding of later phases.
- Every new domain follows the standard split: `apps/api/src/modules/<domain>/` (routes + validation + authorization), `packages/shared` (enums + TypeBox schemas + constants), `apps/web/app/pages/dashboard/<domain>/` (protected admin), public SSR surfaces under `apps/web/app/pages/` backed by `apps/api/src/modules/public/`.

## 2.5 Phase 6 — Products

Generic creator product system. One `products` table with a `kind` discriminator (`digital | physical | service`) so Courses (8), Events (9), and Appointments (10) can later reuse the Orders purchasable contract without a product rewrite.

- Domain concepts: product (title, slug, description, `kind`, `status: draft | published | archived`, `visibility: public | unlisted | private`, `position` for manual ordering); `product_images` (ordered refs to storage keys, never bytes); `product_files` (deliverable refs; signed-URL delivery is a future concern, schema must already carry `storage_key + byte_size + mime`); `product_variants` (`sku`, price delta or absolute price, `position`); `inventory` (stock per variant, `allow_backorder` flag). Physical-only columns stay NULL for digital/service kinds.
- Ownership: every row resolves to exactly one `user_id` (variants/images/files via `product_id` join). Reuse `apps/api/src/middlewares/ownership.ts`; never trust client-supplied `user_id`.
- Backend boundary: `apps/api/src/modules/products/` — CRUD + `POST /api/products/:id/publish|unpublish|archive` + gapless `position` reorder (same pattern as links reorder). Public reads live in `apps/api/src/modules/public/` (`GET /api/public/:username/products`, published + `visibility = public` only).
- Shared boundary: `ProductKind`, `ProductStatus`, `ProductVisibility` enums + TypeBox create/update schemas in `packages/shared`. Price as integer minor units + `currency` column (see 2.14).
- Admin boundary: `apps/web/app/pages/dashboard/products.vue` (+ `products/[id].vue` editor). Public boundary: product section on `/:username` and future standalone product pages.
- Page Builder boundary: `product`, `product-collection`, `featured-product` blocks store references only (`product_id(s)` + layout options). Blocks resolve data at render time via the public API. NEVER duplicate product fields into block payloads.

## 2.6 Phase 7 — Orders

Reusable order + checkout system. Any future purchasable (products, courses, events, appointments, subscription initial payments) sells through this module without the Orders code importing domain logic back.

- Domain concepts: `orders` (buyer email minimal PII, totals snapshot, `currency`, `status: pending | paid | cancelled | refunded | partially_refunded`); `order_items` (polymorphic `purchasable_type + purchasable_id` plus immutable snapshots: `title`, `unit_amount`, `quantity` — order history MUST survive later edits/deletes of the source entity); `payments` (`provider`, `provider_ref`, `amount`, `currency`, `status: pending | succeeded | failed | refunded`); `entitlements` (what the purchase unlocked: `subject_type + subject_id + user/ref`); `refunds` (amount, reason, provider ref).
- Payment abstraction (REQUIRED, provider-agnostic): internal interface `createCheckout | handleWebhook | refund | getPaymentStatus`. Do NOT hardcode any provider. Future adapters (Stripe, Midtrans, Xendit, Paddle) implement the interface; provider selection is a per-order string column, never a branch scattered through business logic.
- Lifecycles: checkout (`pending` order + `pending` payment) → provider webhook (signature-verified) → `paid` → entitlement grants → fulfilled; refund path (`refunded | partially_refunded` + payment `refunded`). Webhook handlers MUST be idempotent (keyed on `provider + provider_ref` unique constraint).
- API boundary: `apps/api/src/modules/orders/` — `POST /api/checkout` (creates pending order + checkout session), `GET /api/orders` (owner-scoped list), `GET /api/orders/:id` (owner or buyer-token scoped), `POST /api/orders/:id/refund` (owner). Webhooks: `POST /api/webhooks/:provider` — public route, signature verification + raw-body handling, rate-limited, NEVER behind auth middleware.
- Authorization: creators read ONLY their own orders (`ownership.ts`); buyers access via short-lived token or email match — never by guessing sequential IDs (use UUID PKs).
- Admin boundary: `apps/web/app/pages/dashboard/orders.vue` (+ detail with refund action and payment timeline). No cart UI in dashboard; checkout is a public-surface concern.

## 2.7 Phase 8 — Courses

Online course platform. Strict hierarchy: `Course → Sections → Lessons`.

- Domain concepts: `courses` (title, slug, cover ref, `status: draft | published | archived`, price ref for sellable courses); `course_sections` (`position`); `lessons` (`kind: video | text | pdf | external_video`, `content_ref` for file-backed kinds via storage abstraction, `duration_sec`, `is_preview` for free samples, `position`); `enrollments` (`user_id | email`, `source: order | manual | free`); `lesson_progress` (`completed_at`, `position_sec` for video resume); course progress derived, never stored redundantly.
- Access control: reusable entitlement check — a lesson is viewable iff `is_preview` OR caller holds an `entitlements` row (granted by Orders purchase, manual grant, or free enrollment). Course code MUST NOT import `modules/orders`; integration flows one way (orders grants entitlements; courses only read entitlements).
- Backend boundary: `apps/api/src/modules/courses/` — course/section/lesson CRUD with `position` reorder, `publish` transitions, `POST /api/courses/:id/enroll`, `POST /api/lessons/:id/progress`. Public: published courses + preview lessons via `modules/public/`.
- Admin boundary: `dashboard/courses.vue`, course builder (sections/lessons nested editor), enrollments tab, progress overview. Analytics reuses the analytics module (enrollment/completion events, see 2.14).
- Page Builder boundary: `course`, `course-collection`, `featured-course` reference blocks (same reference-only rule as 2.5).

## 2.8 Phase 9 — Events

Online/offline events, webinars, workshops.

- Domain concepts: `events` (`kind: online | offline`, title, slug, description, `timezone` IANA name, `starts_at/ends_at` as `timestamptz` UTC, `location_text`, `meeting_url` (private until registration), `capacity` NULL = unlimited, `registration_deadline`, `status: draft | published | cancelled | ended`); `ticket_types` (name, price minor units, `quota`, `sales_start/ends_at`); `registrations` (`event_id + ticket_type_id`, attendee name/email minimal PII, `status: registered | cancelled | attended`, unique per attendee per event where applicable).
- Capacity safety (REQUIRED): enforce at the database/transaction level — atomic quota check-and-decrement (row lock or `UPDATE ... WHERE remaining > 0`) inside the registration transaction. Deadline, duplicate, and cancelled-event checks are additional guards, never the enforcement mechanism. `meeting_url` is exposed ONLY to `registered` attendees.
- Orders integration: paid tickets are `purchasable` items (Phase 7 grants an entitlement that the registration flow consumes); free events register directly without touching Orders. Event logic MUST NOT call payment providers.
- Backend boundary: `apps/api/src/modules/events/` — event/ticket CRUD, `POST /api/events/:id/register` (transactional), attendee list (owner-only), `POST /api/events/:id/cancel`. Public: published events + registration via `modules/public/`.
- Admin boundary: `dashboard/events.vue` (schedule editor with timezone picker, ticket manager, attendee table, capacity meter).
- Page Builder boundary: `event`, `event-collection`, `featured-event` reference blocks.

## 2.9 Phase 10 — Appointments

Booking for services (consultations, classes, rentals of time).

- Domain concepts: `services` (title, `duration_min`, price minor units + currency, `buffer_min`, `status`); `availability_rules` (weekly working hours per weekday); `availability_exceptions` (`date`, `kind: holiday | blocked | custom_hours`); `bookings` (`service_id`, `starts_at/ends_at` UTC, `timezone` of display, attendee name/email minimal PII, `status: pending | confirmed | cancelled | completed | no_show`, `cancelled_by/at`).
- Slot generation (server-side ONLY): expand working hours minus breaks/exceptions/bookings into bookable slots for a requested date range + IANA timezone. The client sends a chosen slot; the server re-validates it inside the booking transaction.
- Double-booking prevention (REQUIRED, two layers): (1) transactional conflict check (`SELECT ... FOR UPDATE` on overlapping bookings for the service) at creation AND confirmation time; (2) a DB exclusion/unique guard on the time range where the driver supports it. Frontend availability display is UX only and MUST NOT be trusted.
- Timezone handling: store UTC; accept + echo the attendee's IANA timezone; render conversions in `apps/web`. Never assume server timezone (see 2.14).
- Orders integration: optional deposit/full payment via the purchasable interface; booking holds `pending` until payment webhook confirms, with expiry of unpaid holds. No provider code in the booking domain.
- Backend boundary: `apps/api/src/modules/appointments/` — services CRUD, `GET /api/services/:id/availability?from&to&timezone`, `POST /api/bookings` (transactional), `POST /api/bookings/:id/confirm|cancel|complete|no-show` (owner transitions; attendees cancel via token).
- Admin boundary: `dashboard/appointments.vue` (services, hours editor, exceptions calendar, bookings list with status actions).
- Page Builder boundary: `appointment` (booking widget ref → `service_id`) and `service` reference blocks.

## 2.10 Phase 11 — Donations

Lightweight creator support. Deliberately NOT built on the product/order tables (no fulfillment, no inventory) but reuses the Phase 7 payment abstraction's one-time path.

- Domain concepts: `donation_settings` (one row per user: `enabled`, preset amounts array, `allow_custom`, `currency`, optional goal + `goal_amount`); `donations` (amount minor units + currency snapshot, message nullable, `donor_name` nullable, `is_anonymous` default false, `status: pending | succeeded | failed`, provider + provider ref for reconciliation).
- Privacy (REQUIRED): donor email/PII is NEVER exposed publicly; public totals and lists show `donor_name` ONLY when `is_anonymous = false`, otherwise render as "Anonymous". Store the minimum PII needed for receipts/disputes.
- Backend boundary: `apps/api/src/modules/donations/` — settings CRUD (owner), `POST /api/donate/:username` (public, rate-limited), owner-only donation list. Webhook confirmation reuses the provider webhook pipeline from Phase 7.
- Admin boundary: `dashboard/donations.vue` (settings + preset editor + donations table, no donor emails in list view).
- Page Builder boundary: `donation` / `support` reference blocks (settings ref + style options only).

## 2.11 Phase 12 — Reviews

One reusable review system for all entity types. NO per-entity review tables.

- Domain concepts: `reviews` (polymorphic `subject_type: product | course | event | service | profile` + `subject_id`, `rating` 1–5 CHECK constraint, title, content, `display_name`, `avatar_ref` nullable, `verified` boolean, `status: pending | approved | rejected | hidden`, `author_ref` for logged-in authors). Public surfaces render ONLY `status = approved`.
- Verification: `verified = true` iff the author holds a matching entitlement/registration/enrollment/booking (checked server-side at moderation time, re-checkable). Verification is a derived flag, not user input.
- Anti-abuse (baseline): reuse `middlewares/ratelimit.ts` on creation; one review per subject per author identity (unique index on `subject + author_ref` plus email-based dedupe for guests); lengths capped in shared schemas; moderation queue defaults every review to `pending`.
- Backend boundary: `apps/api/src/modules/reviews/` — `POST /api/reviews` (public, rate-limited), owner moderation transitions (`approve | reject | hide`), owner-only list per subject. No public mutation of `verified` or others' reviews.
- Admin boundary: moderation queue in each domain dashboard section (or a shared `dashboard/reviews.vue`) with approve/reject/hide actions.
- Page Builder boundary: `reviews` / `testimonials` blocks (subject ref + `subject_type` + layout/limit options only).

## 2.12 Phase 13 — Subscriptions

Two tracks that MUST NOT share tables: (A) customer subscriptions — end-users paying creators recurringly; (B) OpenLynk SaaS plans (`Free | Pro | Business`) — creators paying the platform. Shared vocabulary (statuses, billing periods) lives in `packages/shared`; enforcement is centralized.

- Reusable concepts: `subscription_plans` (per track: name, `billing_period: monthly | yearly`, price minor units + currency, `feature_limits` JSONB against the central catalog); `subscriptions` (`plan_id`, subscriber ref, `status: trialing | active | past_due | cancelled | expired`, `current_period_start/end`); `subscription_items` (what is subscribed: plan-bundled or à-la-carte purchasable ref); `entitlements` (the SAME table Phase 7 writes — subscriptions grant/expire rows here); `usage_counters` (for metered limits: storage bytes, team seats).
- SaaS feature-limit catalog (central, extensible): `products, courses, events, appointments, custom_domains, team_members, storage, analytics`. Do NOT hardcode limits in route handlers — every gated operation calls a single `requireEntitlement`/`checkLimit` helper in `apps/api` that reads the subscriber's plan + usage. Adding a feature = adding a catalog key, not editing call sites.
- Billing: provider abstraction from Phase 7 extended with `createSubscription | cancelSubscription | handleInvoiceWebhook`; webhooks drive `past_due → active | expired` transitions idempotently. Dunning/retries are provider concerns, not app state machines.
- Backend boundary: `apps/api/src/modules/subscriptions/` (customer track: plans CRUD per creator, subscribe/cancel, subscriber list) + a separate `apps/api/src/modules/billing/` namespace for the SaaS track (platform-owned, admin-only plan definitions). The two MUST NOT import each other; both write to `entitlements` through one helper.
- Admin boundary: plan editor + subscribers table per creator; SaaS plan management is a platform concern outside the creator dashboard.

## 2.13 Phase 14 — Custom Domains

Creators point `creator.example.com`, `example.com`, or `www.example.com` at their OpenLynk profile.

- Domain concepts: `custom_domains` (`hostname` UNIQUE CITEXT, `user_id`, `verification_token`, `status: pending | verifying | verified | active | failed | disabled`, `verified_at`, `last_checked_at`). One active hostname per profile constraint at the app layer; uniqueness of hostname at the DB layer.
- Verification (REQUIRED): DNS TXT record containing the token; status advances only after a server-side DNS lookup confirms it. Token rotation on demand; re-verification required when the hostname's ownership signals change. Rejects: duplicate assignment (hostname already active for another user), unverified activation, and any path that trusts client assertions.
- Request security: hostname resolution uses an allowlist lookup (`custom_domains WHERE status = active` + platform domains) — unknown Host values fall through to the canonical domain, never to another user's profile (host-header attack surface stays closed). Trust `X-Forwarded-Host` ONLY from configured proxies.
- Resolution chain: `Incoming request → reverse proxy → Nuxt SSR → resolve hostname → OpenLynk profile`. The Nuxt layer (`apps/web`) calls a lightweight `apps/api` lookup (cached) and renders `/:username` content under the custom host. Do NOT build a custom SSL/ACME system — TLS terminates at the reverse proxy / CDN (Nginx, Caddy, Traefik, Cloudflare).
- Domain-aware rendering: canonical URL, Open Graph URL, SEO meta, and sitemap entries MUST use the active custom hostname when present (central helper in `apps/web`, fed by the same resolution result).
- Backend boundary: `apps/api/src/modules/domains/` — claim (`POST /api/domains`, generates token + DNS instructions), `POST /api/domains/:id/verify` (server-side DNS check, rate-limited), activate/disable/remove (owner-only), internal `GET /api/internal/resolve-host?hostname=` (proxy-trusted, used by web SSR).
- Admin boundary: `dashboard/domains.vue` (claim form, DNS instructions with copy button, status timeline `pending → verifying → verified → active`, remove with confirmation).

## 2.14 Cross-Phase Requirements (Phases 6–14)

Non-negotiable for every module above.

- Multi-tenancy: every creator-owned row carries `user_id` (directly or via a join that resolves to exactly one owner). All owner-scoped reads/writes go through `middlewares/auth.ts` + `middlewares/ownership.ts`. No endpoint may accept `user_id` from the client for scoping.
- Auth separation: authentication (who) and authorization (whose) stay separate concerns, reusing the Phase 2 architecture. Protected operation = authenticate → load resource → verify ownership/entitlement → act.
- Money: integer minor units (`INTEGER/BIGINT`) + explicit `currency` (`CHAR(3)`) on every financial column. No floats. Snapshots of price/currency are frozen on orders, order items, tickets sold, and donations at write time.
- Time: `timestamptz` UTC everywhere; a separate IANA `timezone` text column wherever a wall-clock matters (events, bookings, availability). Never assume server timezone; conversion happens at the edges (`apps/web` display, API input normalization).
- Files: PostgreSQL stores storage keys + metadata, NEVER file bytes. One storage abstraction in `apps/api` (`local` driver now; S3-compatible later) used by product files/images, lesson content, and avatars. Signed/confirmed delivery is a future capability the schema must already allow (`storage_key`, `byte_size`, `mime`).
- Page Builder: reference-only integration for all blocks (`product`, `course`, `event`, `appointment`, `donation`, `reviews`, `*_collection`, `featured_*`). Blocks carry entity IDs + presentation options; content resolves via public APIs at render time. Duplicating domain fields into block payloads is a schema-review failure.
- Analytics: new domains emit events through the existing analytics module; allowed event names: `product_view, add_to_cart, checkout_started, purchase, course_view, course_enrollment, event_view, event_registration, appointment_view, appointment_booking, donation_created, subscription_started, subscription_cancelled`. No extra PII in event payloads beyond what `modules/analytics` already accepts.

## 2.15 Single-Admin / Single-Owner Model (SUPERSEDES multi-user assumptions)

OpenLynk is NOT a public SaaS. It is a self-hosted single-owner installation: one administrator owns the entire instance. This section OVERRIDES any multi-user/multi-tenant reading of §§2.4–2.14.

```
Single Admin
  └── Profile (single public identity)
        ├── Links / Page blocks / Appearance
        ├── Products → Orders (customers are EXTERNAL buyers, never admins)
        ├── Courses → Students (external enrollees)
        ├── Events → Attendees (external)
        ├── Appointments → Bookings (external)
        ├── Donations (external donors, no accounts)
        ├── Reviews (external authors, admin-moderated)
        ├── Subscriptions (customer memberships; platform SaaS plans NOT required)
        ├── Analytics
        └── Custom Domains (domain → installation, never domain → user)
```

- Identity: `admins` table (`email unique`, `password_hash`, `name`, `status: active | disabled`). No `users` table, no roles/teams/organizations. Bootstrap is first-register-is-admin: `POST /api/v1/auth/register` succeeds only while zero admins exist (creating admin + profile atomically); afterwards it returns `403 REGISTRATION_CLOSED`. No seeder, no other account-creation path.
- Auth surface: `POST /api/v1/auth/register` (bootstrap-only), `POST /api/v1/auth/login`, `POST /api/v1/auth/logout` (+ refresh), `GET /api/v1/auth/me`, `GET /api/v1/auth/setup-status` (public setup bit). Pre-setup, the middleware routes every page to the `/register` setup screen (`/login` unreachable); post-setup, `/register` bounces to `/login`. The `/register` page is the first-setup screen; dashboard (`/dashboard/*`, guarded by `auth.global.ts`) requires an `active` admin JWT; `/login` stays public. A `disabled` status rejects at login, refresh, and `/me`.
- Tenancy: every protected read/write resolves through `profiles.admin_id = auth.adminId` (helpers `getAdminProfile`/`getOwnedLink`). Do NOT add `userId`/`ownerId`/`tenantId`/`organizationId`/`workspaceId` to new tables — relate new entities to the profile chain (or keep them installation-global where ownership is meaningless, e.g. donation settings). New modules MUST NOT reintroduce per-user scoping.
- Customers/students/attendees/donors are external records (email + minimal PII), never admin accounts, and never gain dashboard access.
- SaaS billing (Phase 13 platform track: Free/Pro/Business) is deferred and NOT required for the self-hosted installation. Customer-facing subscriptions/memberships may proceed without it.
- Public URL stays `/:username` for compatibility (single profile), served from `/`; the installation itself is the one creator/business.
