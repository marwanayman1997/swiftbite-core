# swiftbite-core

SwiftBite — a food ordering platform for browsing menus, placing orders, and tracking deliveries in real time.

## Stack

- Node.js + TypeScript (ESM)
- Express
- Knex + PostgreSQL (+ PostGIS, for branch geolocation/delivery-radius queries)
- Redis (response caching, idempotency key storage)
- RabbitMQ (`amqp-connection-manager`) — transactional outbox → topic exchange, consumed by `swiftbite-orders`
- Mailjet (transactional email — password reset OTPs, member invitations)
- tsyringe (dependency injection for controllers/services)
- Zod (env validation)
- class-validator + class-transformer (request DTO validation)
- JWT auth (access + refresh tokens, delivered via httpOnly cookies)

> **Known issue:** the configured Mailjet account is currently returning `401 — "temporarily blocked"`. Password-reset and member-invitation emails will fail to send until this is resolved on Mailjet's side. `POST /restaurants/:restaurantId/members` degrades gracefully (the member is still created; the response's `emailSent: false` signals the invite email didn't go out — see the RBAC section below), but `POST /auth/forget-password` has no such fallback today.

## Getting started

1. Copy the env template and fill in your local values:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run database migrations:

   ```bash
   npx tsx node_modules/.bin/knex migrate:latest --knexfile src/lib/knex/knexfile.ts
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Start the outbox worker (separate process — required for `swiftbite-orders` to receive branch/product/restaurant updates; the API server does not drain the outbox itself):

   ```bash
   npm run worker:dev
   ```

## Scripts

- `npm run dev` — start the API server with hot reload
- `npm run worker:dev` — start the outbox-drain worker with hot reload (see [Event outbox & background worker](#event-outbox--background-worker))
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled API server (`dist/server.js`)
- `npm run worker` — run the compiled worker (`dist/worker.js`)

## Authentication & authorization

Registering or logging in sets `access_token` and `refresh_token` as httpOnly cookies. Endpoints marked **Auth required** need a valid `access_token` cookie; missing/invalid tokens return `401`.

- **System roles** (`SystemRole`): `customer` · `delivery_agent` · `restaurant_user` · `system_admin`. Self-registration as `system_admin` is blocked. Endpoints marked **system_admin only** or **Owner or admin** check this role / restaurant ownership directly.
- **Restaurant RBAC**: within a restaurant, a `restaurant_user` can additionally hold a restaurant-scoped role (`owner` · `branch_manager` · `staff`) via restaurant membership, each with its own resource:action permission set (seeded in the DB, see `GET /roles/:role/permissions`). Endpoints marked **RBAC (`resource:action`)** require both restaurant membership and that permission; `system_admin` bypasses these checks. Branch-scoped endpoints additionally check the member's assigned `branchIds`.
- The permission set seeded here also includes `orders:*`, `payments:*`, `deliveries:assign`, and `finance:*` (`read`, `payout_create`) — those resources don't have endpoints in *this* service; they're enforced by `swiftbite-orders` via its own `rbac()` middleware, which resolves a role's permissions through `GET /internal/rbac/permissions` (cached). `owner` gets all of them by default; `branch_manager` gets `finance:read` plus the order-management subset; `staff` gets neither `finance:*` permission.
- Inviting a member (`POST /restaurants/:restaurantId/members`) sends an OTP-based invitation email — see the Mailjet known-issue note above; the response's `emailSent` field tells you whether that email actually went out. The member record and its 7-day OTP are always created regardless.

## Response format

All responses use a single envelope, built by `sendSuccess`/`sendPaginated` (`src/lib/http/response.ts`):

```json
{ "success": true, "data": {}, "meta": {} }
```

`meta` is omitted unless present (e.g. pagination info). Errors (via the global error handler) return `{ "error": "message" }` with the corresponding HTTP status.

## Pagination & filtering

Endpoints marked **Paginated** in the table below accept:

- `limit` — max rows per page (default `20`, capped at `1000`)
- `cursor` — opaque cursor from the previous page's `meta.nextCursor`; omit for the first page
- `sortBy` — must be one of that endpoint's allowed sort fields, otherwise silently falls back to the default
- `sortOrder` — `asc` (default) or `desc`
- `filter[field][op]=value` — e.g. `filter[status][eq]=active`. Supported ops: `eq`, `gt`, `lt`, `gte`, `lte`, `like`, `in`. Only fields on that endpoint's allowlist are accepted; anything else is silently ignored.

Response shape: `{ "success": true, "data": [...], "meta": { "nextCursor": "...", "hasMore": true, "count": 20 } }`. Keep requesting with the latest `nextCursor` until `hasMore` is `false`.

## Caching

Endpoints marked **Cached** are backed by Redis (`withCache` middleware, `src/lib/cache/withCache.ts`) with a short TTL — a `X-Cache: HIT` / `MISS` response header shows whether it was served from cache. Cached responses are invalidated only by TTL expiry, not on writes, so these are restricted to public, low-churn, read-heavy endpoints.

## Idempotency

Endpoints marked **Idempotent** accept an `Idempotency-Key` header (any client-generated unique string) on `POST`/`PATCH`/`PUT` requests. The response for a given key is cached in Redis for 24h — retrying the same request with the same key replays the original response instead of re-executing the operation, so retries after a timeout/network error never create duplicate resources.

- **Idempotent (required)** — the header is mandatory; a request without it is rejected with `400`, and a Redis outage returns `503` rather than risk a duplicate write.
- **Idempotent (optional)** — the header is honored if present, but its absence doesn't block the request.

Implementation: `src/lib/idempotency/idempotency.ts`.

## Event outbox & background worker

`swiftbite-orders` needs to know when a branch, product, or restaurant changes (stock, price, accept-orders status, suspension) without polling this service. Rather than publish to RabbitMQ inline during the request (which would tie a write's success to the broker being reachable), writes that need to notify other services insert a row into the `events_outbox` table in the **same transaction** as the actual change, and a separate process drains it:

1. A request handler (e.g. `branch.service.ts` updating a branch) writes its row change **and** an `events_outbox` row in one `db.transaction()`. If the transaction commits, the event is durably queued; if it rolls back, no event was ever queued — no separate compensation logic needed.
2. The **worker process** (`src/worker.ts`, started independently via `npm run worker:dev`/`npm run worker`) polls the outbox on a cron schedule (`OUTBOX_DRAIN_CRON`, default: every second), claims a batch (`SELECT ... FOR UPDATE SKIP LOCKED`, size `OUTBOX_BATCH_SIZE`), and publishes each row to the `core.events` topic exchange (`RABBITMQ_CORE_EVENTS_EXCHANGE`) over RabbitMQ, keyed by its `eventType` (e.g. `branch.updated`, `product.price.changed`).
3. Successfully published rows are marked `dispatched_at` in a single batched `UPDATE ... WHERE id IN (...)` (not one query per row); a row whose publish attempt throws is marked with an incremented `attempts` + `last_error` instead and picked up again on the next drain cycle.

**Event types currently published:** `branch.updated`, `product.price.changed`, `product.stock.changed`, `restaurant.suspended`.

The worker is a **separate process from the API server** — running `npm run dev` alone will not deliver any events; `swiftbite-orders`' `core-events` consumer will simply never receive anything. Implementation: `src/lib/events/` (`outbox.repo.ts`, `drain-outbox.ts`, `rabbitmq-publisher.ts`), `src/worker.ts`.

## Internal endpoints (service-to-service)

A handful of `GET`/`POST` routes exist purely for `swiftbite-orders` to read/write core data synchronously (branch/product lookups it needs on the hot order-placement path, agent lookups, RBAC permission resolution) where waiting for an outbox event would be too slow or isn't the right fit. These are **not** part of the public API — they're guarded by a shared `api-key` header (`INTERNAL_API_KEY`), not a user JWT, via `requireInternalApiKey` (`src/lib/auth/api-key.ts`), and return `401` without a valid key regardless of any cookie/session present.

| Method | Path                                          | Purpose                                          |
| ------ | ---------------------------------------------- | ------------------------------------------------- |
| GET    | `/internal/branches/:id`                       | Branch + owning restaurant, denormalized for order-service's per-order snapshot |
| GET    | `/product/internal/branches/:id/products`      | Batch product price/stock/availability lookup (`?ids=1,2,3`) |
| POST   | `/product/internal/branches/:id/reserve-stock`  | Decrement stock after an order is placed (idempotent) |
| GET    | `/customer/addresses/internal/:id`              | Delivery address snapshot for an order            |
| GET    | `/user/internal/agents/:id`                     | Delivery agent identity lookup                    |
| GET    | `/internal/rbac/permissions?role=`              | Resolve a restaurant role's permission set (cached in order-service, see `rbac.ts`) |

## API reference

Base URL: all routes below are mounted under `/api`.

| Method | Path                                                     | Auth                              | Extras              |
| ------ | --------------------------------------------------------- | ---------------------------------- | -------------------- |
| GET    | `/health`                                                  | Public                             |                       |
| POST   | `/auth/register`                                           | Public                             | Idempotent (required) |
| POST   | `/auth/login`                                              | Public                             |                       |
| POST   | `/auth/forget-password`                                    | Public                             | Idempotent (required) |
| POST   | `/auth/reset-password`                                     | Public                             | Idempotent (required) |
| POST   | `/auth/accept-invite`                                      | Public (requires valid OTP)        | Idempotent (required) |
| POST   | `/auth/refresh`                                            | Public (requires refresh cookie)   |                       |
| GET    | `/user/me`                                                 | Auth required                      |                       |
| PATCH  | `/user/me`                                                 | Auth required                      |                       |
| GET    | `/customer/addresses`                                      | Auth required                      |                       |
| POST   | `/customer/addresses`                                      | Auth required                      | Idempotent (optional) |
| PATCH  | `/customer/addresses/:addressId`                           | Auth required                      |                       |
| DELETE | `/customer/addresses/:addressId`                           | Auth required                      |                       |
| GET    | `/restaurants`                                             | Public                             | Paginated · Cached    |
| GET    | `/restaurants/:id`                                         | Public                             | Cached                |
| POST   | `/restaurants`                                             | system_admin only                  | Idempotent (required) |
| PATCH  | `/restaurants/:id`                                         | RBAC (`core:restaurant:update`)    |                       |
| PATCH  | `/restaurants/:id/status`                                  | system_admin only                  |                       |
| GET    | `/restaurants/:restaurantId/branches`                      | Public                             | Paginated · Cached    |
| POST   | `/restaurants/:restaurantId/branches`                      | RBAC (`core:branch:create`)        | Idempotent (required) |
| GET    | `/branches/nearby`                                         | Public                             |                       |
| PATCH  | `/branches/:id`                                            | RBAC (`core:branch:update`)        |                       |
| PATCH  | `/branches/:id/status`                                     | system_admin only                  |                       |
| GET    | `/product/restaurants/:restaurantId/categories`            | Public                             | Cached                |
| GET    | `/product/branches/:branchId/products`                     | Public                             | Paginated · Cached    |
| GET    | `/product/products/:id`                                    | Public                             |                       |
| GET    | `/product/restaurants/:restaurantId/products`               | RBAC (`core:product:read`)         | Paginated             |
| POST   | `/product/restaurants/:restaurantId/products`               | RBAC (`core:product:create`)       | Idempotent (required) |
| PATCH  | `/product/products/:id`                                    | RBAC (`core:product:update`)       |                       |
| POST   | `/restaurants/:restaurantId/members`                       | RBAC (`core:member:create`)        | Idempotent (required) |
| GET    | `/restaurants/:restaurantId/members`                       | RBAC (`core:member:read`)          | Paginated             |
| PATCH  | `/restaurants/:restaurantId/members/:memberId`             | RBAC (`core:member:update`)        |                       |
| DELETE | `/restaurants/:restaurantId/members/:memberId`             | RBAC (`core:member:delete`)        |                       |
| PUT    | `/restaurants/:restaurantId/members/:memberId/branches`    | RBAC (`core:member:update`)        |                       |
| GET    | `/roles/:role/permissions`                                 | Public                             |                       |

## Project structure

```
src/
  app/
    auth/               # register, login, password reset, invite acceptance (+ restaurant self-signup)
      templates/          # password-reset email template
    user/                # current-user profile
    customer-address/    # customer delivery addresses (CRUD)
    restaurant/           # restaurant CRUD, status management
    branch/               # restaurant branches, geolocation search
    product/               # products, categories, per-branch price/stock
    rbac/                   # restaurant membership, roles, permissions
      templates/              # member-invitation email template
    health/                  # DB health check
  lib/
    auth/                 # authenticate middleware, RBAC middleware, api-key guard (internal endpoints), shared auth errors
    cache/                  # withCache middleware, cache provider wiring
    config/                  # Zod-validated env
    correlation/              # correlation-id middleware
    di/                        # tsyringe container + injection tokens
    email/                      # email provider wiring (Mailjet instance)
    error/                        # AppError + global error handler
    events/                        # transactional outbox repo + drain logic + RabbitMQ publisher (see Event outbox section above)
    http/                          # response envelope (sendSuccess/sendPaginated), pagination utils
    idempotency/                    # idempotency middleware (Idempotency-Key handling)
    knex/                             # knex instance + knexfile
    logger/                           # logger
    types/                             # Express Request augmentation (req.user, req.correlationId)
    utils/                             # cookie helpers
    validation/                        # validateBody / validateParams (class-validator wrapper)
  pkg/
    cache/                # Redis cache provider implementation
    email/                 # IEmailProvider interface + Mailjet adapter
    utils/                  # time helpers
  migrations/               # Knex migrations
  worker.ts                 # outbox-drain worker entrypoint (separate process from server.ts — see Scripts)
```

Each feature module under `src/app/` follows the same layered shape: `entity/` (DB row → domain object), `dto/` (request validation), `repository/` (Knex queries), `service/` (business logic, authorization — `@injectable()`, DI-resolved), `controller/` (HTTP glue — `@injectable()`, DI-resolved), `routes.ts` (resolves its controller via `container.resolve()`).
