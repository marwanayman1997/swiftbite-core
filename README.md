# swiftbite-core

SwiftBite — a food ordering platform for browsing menus, placing orders, and tracking deliveries in real time.

## Stack

- Node.js + TypeScript (ESM)
- Express
- Knex + PostgreSQL (+ PostGIS, for branch geolocation/delivery-radius queries)
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
   npx tsx node_modules/.bin/knex migrate:latest --knexfile src/common/knex/knexfile.ts
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start the server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build (`dist/server.js`)

## Authentication

Registering or logging in sets `access_token` and `refresh_token` as httpOnly cookies. Endpoints marked **Auth required** expect a valid `access_token` cookie (checked by the `authenticate` middleware); missing/invalid tokens return `401`. Endpoints marked with a role (e.g. **system_admin only**, **owner or admin**) additionally check `req.user.role` / resource ownership and return `403` if the check fails.

### Roles (`SystemRole`)

`customer` · `delivery_agent` · `restaurant_user` · `system_admin`

Self-registration as `system_admin` is blocked (`POST /auth/register` rejects it with `403`).

## API reference

Base URL: all routes below are mounted under `/api`.

### Quick reference

| Method | Path                                       | Auth                  |
| ------ | ------------------------------------------- | ---------------------- |
| GET    | `/health`                                   | Public                 |
| POST   | `/auth/register`                            | Public                 |
| POST   | `/auth/login`                               | Public                 |
| POST   | `/auth/forget-password`                     | Public                 |
| POST   | `/auth/reset-password`                      | Public                 |
| GET    | `/user/me`                                  | Auth required          |
| PATCH  | `/user/me`                                  | Auth required          |
| GET    | `/customer/addresses`                       | Auth required          |
| POST   | `/customer/addresses`                       | Auth required          |
| PATCH  | `/customer/addresses/:addressId`            | Auth required          |
| DELETE | `/customer/addresses/:addressId`            | Auth required          |
| GET    | `/restaurants`                              | Public                 |
| GET    | `/restaurants/:id`                          | Public                 |
| POST   | `/restaurants`                              | system_admin only      |
| PATCH  | `/restaurants/:id`                          | Owner or admin         |
| PATCH  | `/restaurants/:id/status`                   | system_admin only      |
| GET    | `/restaurants/:restaurantId/branches`       | Public                 |
| POST   | `/restaurants/:restaurantId/branches`       | Owner or admin         |
| GET    | `/branches/nearby`                          | Public                 |
| PATCH  | `/branches/:id`                             | Owner or admin         |
| PATCH  | `/branches/:id/status`                      | system_admin only      |

---

### Health

#### `GET /health`
Checks DB connectivity.

**Response `200`:** `OK` (plain text)
**Response `500`:** `{ "message": "Database is currently down" }`

---

### Auth

#### `POST /auth/register`
Registers a new user. Sets auth cookies on success. If `role` is `restaurant_user`, a `restaurant` object is required and a restaurant row is created in the same transaction as the user.

**Request:**
```json
{
  "email": "string, valid email",
  "phone": "string, 10-11 chars",
  "name": "string, min 1 char",
  "password": "string, strong password (min 8 chars, upper+lower+number+symbol)",
  "role": "customer | delivery_agent | restaurant_user | system_admin (system_admin is rejected)",
  "restaurant": {
    "name": "string, min 1 char",
    "logoURL": "string, optional",
    "primaryCountry": "string, min 1 char"
  }
}
```
`restaurant` is required only when `role` is `restaurant_user`.

**Response `201`:**
```json
{
  "message": "User successfully registered",
  "accessToken": "string",
  "refreshToken": "string",
  "user": { "id": 0, "email": "", "phone": "", "systemRole": "", "createdAt": "" },
  "restaurant": { "...": "present only when role is restaurant_user" }
}
```

**Errors:** `400` user already exists (same email/phone) · `403` attempted `system_admin` registration.

#### `POST /auth/login`
**Request:** `{ "email": "string", "password": "string" }`

**Response `200`:**
```json
{
  "message": "Login successful",
  "accessToken": "string",
  "refreshToken": "string",
  "user": { "id": 0, "email": "", "phone": "", "systemRole": "", "createdAt": "" }
}
```
**Errors:** `401` incorrect email or password.

#### `POST /auth/forget-password`
Generates an OTP (10-minute expiry) and "sends" it (currently logged to the server console, not actually emailed).

**Request:** `{ "email": "string" }`
**Response `200`:** `{ "message": "OTP email sent" }` (always, even if the email doesn't exist — avoids leaking account existence)

#### `POST /auth/reset-password`
**Request:**
```json
{
  "email": "string",
  "otp": "string, exactly 6 chars",
  "newPassword": "string, strong password"
}
```
**Response `200`:** `{ "message": "Password reset successfully, please login again" }`
**Errors:** `401` invalid/expired/already-consumed OTP.

---

### User

#### `GET /user/me` — Auth required
**Response `200`:** `{ "id": 0, "email": "", "name": "", "phone": "", "systemRole": "" }`
**Errors:** `404` user not found.

#### `PATCH /user/me` — Auth required
Partial update of the caller's own profile.

**Request:** `{ "name": "string, optional", "phone": "string, optional, 10-11 chars" }`
**Response `200`:** `{ "message": "User profile updated", "user": { "id": 0, "email": "", "name": "", "phone": "", "systemRole": "" } }`

---

### Customer addresses

All endpoints scoped to the authenticated user's own addresses (never another user's).

#### `GET /customer/addresses` — Auth required
**Response `200`:** `{ "data": [Address, ...] }`

#### `POST /customer/addresses` — Auth required
**Request:**
```json
{
  "label": "string",
  "country": "string",
  "city": "string",
  "street": "string",
  "building": "string, optional",
  "apartmentNumber": "string, optional",
  "type": "office | home | public_place",
  "lat": 0,
  "lng": 0,
  "isDefault": false
}
```
Setting `isDefault: true` automatically unsets any other address of the caller's that was previously default.

**Response `201`:** `{ "message": "Address added", "address": Address }`

#### `PATCH /customer/addresses/:addressId` — Auth required
Partial update; all fields from the create body are optional. Same `isDefault` single-default behavior as create.

**Response `200`:** `{ "message": "Address updated", "address": Address }`
**Errors:** `404` address not found or not owned by the caller.

#### `DELETE /customer/addresses/:addressId` — Auth required
**Response `200`:** `{ "message": "Address deleted" }`
**Errors:** `404` address not found or not owned by the caller.

**`Address` shape:** `{ id, label, country, city, street, building, apartmentNumber, type, lat, lng, isDefault }`

---

### Restaurants

#### `GET /restaurants` — Public
**Response `200`:** `{ "data": [Restaurant, ...] }`

#### `GET /restaurants/:id` — Public
**Response `200`:** `{ id, ownerId, name, logoURL, primaryCountry, status, createdAt, updatedAt }`
**Errors:** `404` · `400` invalid (non-numeric) id.

#### `POST /restaurants` — **system_admin only**
Creates a restaurant and its owner user together in a single DB transaction.

**Request:**
```json
{
  "owner": {
    "email": "string, valid email",
    "phone": "string, 10-11 chars",
    "name": "string",
    "password": "string, strong password"
  },
  "name": "string",
  "logoUrl": "string, optional",
  "primaryCountry": "string"
}
```
The owner is created with role `restaurant_user`.

**Response `201`:**
```json
{
  "message": "Restaurant created successfully",
  "restaurant": { "id": 0, "ownerId": 0, "name": "", "logoURL": "", "primaryCountry": "", "status": "pending", "createdAt": "" },
  "owner": { "id": 0, "email": "", "phone": "", "name": "", "systemRole": "restaurant_user" }
}
```
**Errors:** `403` caller isn't `system_admin` · `400` owner email/phone already in use.

#### `PATCH /restaurants/:id` — **Owner or admin**
Partial update of a restaurant's own profile fields (not status).

**Request:** `{ "name": "string, optional", "logoUrl": "string, optional", "primaryCountry": "string, optional" }`
**Response `200`:** `{ "message": "Restaurant updated successfully", "restaurant": { "id", "name", "logoURL", "primaryCountry", "status", "updatedAt" } }`
**Errors:** `404` restaurant not found · `403` caller is neither the restaurant's owner nor `system_admin`.

#### `PATCH /restaurants/:id/status` — **system_admin only**
**Request:** `{ "status": "active | suspended | disabled | pending" }`
**Response `200`:** `{ "message": "Restaurant status updated successfully", "restaurant": { "id", "status" } }`
**Errors:** `403` · `404` · `400` invalid status value.

**`Restaurant` status values (`RestaurantStatus`):** `active` · `suspended` · `disabled` · `pending` (new restaurants start `pending`)

---

### Branches

A branch (`restaurant_branches` table) is a physical location of a restaurant, with its own delivery radius, hours, and PostGIS-backed geolocation.

#### `GET /restaurants/:restaurantId/branches` — Public
Lists all branches for a restaurant. Returns an empty list (not a `404`) if the restaurant has none or doesn't exist.

**Response `200`:**
```json
{
  "data": [
    {
      "id": 0, "restaurantId": 0, "label": "", "countryCode": "",
      "addressText": "", "lat": 0, "lng": 0, "isActive": false,
      "opensAt": "HH:MM:SS", "closesAt": "HH:MM:SS", "acceptOrders": true,
      "deliveryRadius": 0, "currency": "EGP", "commission": 0
    }
  ]
}
```

#### `POST /restaurants/:restaurantId/branches` — **Owner or admin**
Creates a branch. New branches start `isActive: false` (must be activated via the status endpoint) and `acceptOrders: true`, `commission: 0`.

**Request:**
```json
{
  "countryCode": "string",
  "label": "string",
  "addressText": "string",
  "lat": 0,
  "lng": 0,
  "opensAt": "HH:MM",
  "closesAt": "HH:MM",
  "deliveryRadius": 0,
  "currency": "EGP | SAR"
}
```
**Response `201`:** `{ "message": "Branch added successfully", "branch": Branch }`
**Errors:** `404` restaurant not found · `403` caller is neither the restaurant's owner nor `system_admin`.

#### `GET /branches/nearby?lat=&lng=` — Public
Finds active branches (of `active`-status restaurants) whose delivery radius covers the given coordinates, using PostGIS `ST_DWithin`.

**Response `200`:** `{ "data": [...] }` — each row includes branch + parent restaurant name/logo.

#### `PATCH /branches/:id` — **Owner or admin**
Partial update of a branch's own fields (ownership is resolved via the branch's parent restaurant).

**Request:**
```json
{
  "label": "string, optional",
  "addressText": "string, optional",
  "lat": 0,
  "lng": 0,
  "opensAt": "HH:MM, optional",
  "closesAt": "HH:MM, optional",
  "deliveryRadius": 0,
  "currency": "EGP | SAR, optional",
  "acceptOrders": true
}
```
**Response `200`:** `{ "message": "Branch updated successfully", "branch": { ...Branch, "updatedAt": "" } }`
**Errors:** `404` branch not found · `403` caller is neither the branch's restaurant owner nor `system_admin`.

#### `PATCH /branches/:id/status` — **system_admin only**
Admin-only fields, kept separate from the general update endpoint above.

**Request:** `{ "isActive": true, "commission": 0 }`
**Response `200`:** `{ "message": "Branch status updated successfully", "branch": { "id", "isActive", "acceptOrders", "commission" } }`
**Errors:** `403` · `404` · `400` negative commission.

**`Branch` shape:** `{ id, restaurantId, label, countryCode, addressText, lat, lng, isActive, opensAt, closesAt, acceptOrders, deliveryRadius, currency, commission }`
**Currency values:** `EGP` · `SAR`

---

## Project structure

```
src/
  app/
    auth/               # register, login, password reset (+ restaurant self-signup)
    user/                # current-user profile
    customer-address/    # customer delivery addresses (CRUD)
    restaurant/           # restaurant CRUD, status management
    branch/               # restaurant branches, geolocation search
    health/               # DB health check
  common/
    auth/                 # authenticate middleware, shared auth errors
    config/                # Zod-validated env
    correlation/            # correlation-id middleware
    error/                  # AppError + global error handler
    knex/                    # knex instance + knexfile
    logger/                   # logger
    types/                     # Express Request augmentation (req.user, req.correlationId)
    utils/                      # cookie helpers, time helpers
    validation/                  # validateBody / validateParams (class-validator wrapper)
  migrations/                     # Knex migrations
```

Each feature module under `src/app/` follows the same layered shape: `entity/` (DB row → domain object), `dto/` (request validation), `repository/` (Knex queries), `service/` (business logic, authorization), `controller/` (HTTP glue), `routes.ts`.
