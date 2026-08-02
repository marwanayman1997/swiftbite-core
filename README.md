# swiftbite-core

SwiftBite — a food ordering platform for browsing menus, placing orders, and tracking deliveries in real time.

## Stack

- Node.js + TypeScript (ESM)
- Express
- Knex + PostgreSQL
- Zod (env validation)
- class-validator (request DTO validation)
- JWT auth (access + refresh tokens, delivered via cookies)

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

## API

All routes are mounted under `/api`.

| Method | Path                     | Description                          |
| ------ | ------------------------ | ------------------------------------- |
| GET    | `/health`                | DB connectivity check                 |
| POST   | `/auth/register`         | Register a new user                   |
| POST   | `/auth/login`            | Log in                                |
| POST   | `/auth/forget-password`  | Request a password reset OTP          |
| POST   | `/auth/reset-password`   | Reset password with OTP               |
| GET    | `/user/me`               | Get the current user (auth required)  |
| PATCH  | `/user/me`               | Update the current user (auth required) |
| GET    | `/customer/addresses`            | List the current user's addresses (auth required) |
| POST   | `/customer/addresses`            | Add an address (auth required)        |
| PATCH  | `/customer/addresses/{addressId}` | Update an address (auth required)     |
| DELETE | `/customer/addresses/{addressId}` | Delete an address (auth required)     |

## Project structure

```
src/
  app/            # feature modules (auth, user, customer-address, health)
  common/         # shared config, error handling, logging, validation, auth guard
  migrations/     # Knex migrations
```
