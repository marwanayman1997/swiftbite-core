import knex from "knex";
import { env } from "../config/env.js";
import type { Knex } from "knex";

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  pool: {
    max: env.DB_POOL_MAX,
  },
  migrations: {
    directory: "./src/migrations",
    extension: "ts",
  },
};

export const db = knex(config);

export async function pingDB(): Promise<void> {
  await db.raw("SELECT 1");
}
