# swiftbite-core

SwiftBite — a food ordering platform for browsing menus, placing orders, and tracking deliveries in real time.

## Stack

- Node.js + TypeScript (ESM)
- Express
- Knex + PostgreSQL (+ PostGIS, for branch geolocation/delivery-radius queries)
- Redis (response caching, idempotency key storage)
- Mailjet (transactional email — password reset OTPs, member invitations)
- tsyringe (dependency injection for controllers/services)
- Zod (env validation)
- class-validator + class-transformer (request DTO validation)
- JWT auth (access + refresh tokens, delivered via httpOnly cookies)

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

## Scripts

- `npm run dev` — start the server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build (`dist/server.js`)

## Authentication & authorization

Registering or logging in sets `access_token` and `refresh_token` as httpOnly cookies. Endpoints marked **Auth required** need a valid `access_token` cookie; missing/invalid tokens return `401`.

- **System roles** (`SystemRole`): `customer` · `delivery_agent` · `restaurant_user` · `system_admin`. Self-registration as `system_admin` is blocked. Endpoints marked **system_admin only** or **Owner or admin** check this role / restaurant ownership directly.
- **Restaurant RBAC**: within a restaurant, a `restaurant_user` can additionally hold a restaurant-scoped role (`owner` · `branch_manager` · `staff`) via restaurant membership, each with its own resource:action permission set (seeded in the DB, see `GET /roles/:role/permissions`). Endpoints marked **RBAC (`resource:action`)** require both restaurant membership and that permission; `system_admin` bypasses these checks. Branch-scoped endpoints additionally check the member's assigned `branchIds`.

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
    auth/                 # authenticate middleware, RBAC middleware, shared auth errors
    cache/                  # withCache middleware, cache provider wiring
    config/                  # Zod-validated env
    correlation/              # correlation-id middleware
    di/                        # tsyringe container + injection tokens
    email/                      # email provider wiring (Mailjet instance)
    error/                        # AppError + global error handler
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
```

Each feature module under `src/app/` follows the same layered shape: `entity/` (DB row → domain object), `dto/` (request validation), `repository/` (Knex queries), `service/` (business logic, authorization — `@injectable()`, DI-resolved), `controller/` (HTTP glue — `@injectable()`, DI-resolved), `routes.ts` (resolves its controller via `container.resolve()`).
