import http from "http";
import { createApp } from "./app.ts";
import { env } from "./common/config/env.ts";
import { db } from "./common/knex/knex.ts";

const app = createApp();
const server = http.createServer(app);

server.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});

async function shutdown(): Promise<void> {
  server.close(async (): Promise<void> => {
    console.log("DB is shutting down...");
    await db.destroy();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
