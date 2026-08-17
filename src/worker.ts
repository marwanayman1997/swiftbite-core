import "reflect-metadata";
import { Cron } from "croner";
import { env } from "./lib/config/env.ts";
import { db } from "./lib/knex/knex.ts";
import {
  initEventsPublisher,
  closeEventsPublisher,
} from "./lib/events/rabbitmq-publisher.ts";
import { drainOutbox } from "./lib/events/drain-outbox.ts";

let running = false;

async function main(): Promise<void> {
  await initEventsPublisher();
  console.log("[worker] outbox publisher ready");

  new Cron(env.outbox.drainCron, async () => {
    if (running) return;
    running = true;
    try {
      const result = await drainOutbox();
      if (result.dispatched > 0 || result.failed > 0) {
        console.log(
          `[worker] drainOutbox dispatched=${result.dispatched} failed=${result.failed}`,
        );
      }
    } catch (err) {
      console.error("[worker] drainOutbox failed:", err);
    } finally {
      running = false;
    }
  });

  console.log(`[worker] outbox drain scheduled: ${env.outbox.drainCron}`);
}

main().catch((err) => {
  console.error("[worker] failed to start:", err);
  process.exit(1);
});

async function shutdown(): Promise<void> {
  console.log("[worker] shutting down...");
  await closeEventsPublisher();
  await db.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
