import http from "http";
import { createApp } from "./app.js";
import { env } from "./common/config/env.js";
import { db } from "./common/knex/knex.js";

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`Server is listening on port ${env.PORT}`);
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
