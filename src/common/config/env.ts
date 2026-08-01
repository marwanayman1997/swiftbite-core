import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables: ${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
