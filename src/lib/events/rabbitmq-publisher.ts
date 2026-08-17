import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import type { ConfirmChannel } from "amqplib";
import { env } from "../config/env.ts";

let connection: AmqpConnectionManager | null = null;
let channel: ChannelWrapper | null = null;

// The core.events topic exchange is declared here (worker-owned, defensively
// idempotent) — order-service only ever binds a queue to it.
export async function initEventsPublisher(): Promise<void> {
  connection = amqp.connect([env.rabbitmq.url]);
  connection.on("connect", () => console.log("[outbox] rabbitmq connected"));
  connection.on("disconnect", (params) => {
    console.error("[outbox] rabbitmq disconnected:", params.err?.message);
  });

  channel = connection.createChannel({
    setup: (ch: ConfirmChannel) =>
      ch.assertExchange(env.rabbitmq.coreEventsExchange, "topic", {
        durable: true,
      }),
  });

  await channel.waitForConnect();
}

// Resolves only once the broker confirms the publish (amqp-connection-manager
// uses a confirm channel under the hood) — this is the "publisher confirms"
// requirement from implementation-plan.md §0.5.
export async function publishEvent(
  routingKey: string,
  payload: unknown,
): Promise<void> {
  if (!channel) {
    throw new Error(
      "Events publisher not initialized — call initEventsPublisher() first",
    );
  }
  await channel.publish(
    env.rabbitmq.coreEventsExchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true },
  );
}

export async function closeEventsPublisher(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
