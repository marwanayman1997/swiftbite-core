import { db } from "../knex/knex.ts";
import { env } from "../config/env.ts";
import {
  claimUndispatchedBatch,
  markOutboxEventsDispatched,
  markOutboxEventFailed,
} from "./outbox.repo.ts";
import { publishEvent } from "./rabbitmq-publisher.ts";

export async function drainOutbox(): Promise<{
  dispatched: number;
  failed: number;
}> {
  const trx = await db.transaction();
  let dispatched = 0;
  let failed = 0;

  try {
    const batch = await claimUndispatchedBatch(trx, env.outbox.batchSize);
    const dispatchedIds: number[] = [];

    for (const event of batch) {
      try {
        await publishEvent(event.eventType, {
          eventId: event.eventId,
          eventType: event.eventType,
          occurredAt: event.createdAt.toISOString(),
          payload: event.payload,
        });
        dispatchedIds.push(event.id);
        dispatched++;
      } catch (err) {
        await markOutboxEventFailed(trx, event.id, (err as Error).message);
        failed++;
      }
    }

    // One bulk UPDATE for the whole batch instead of one per event — was
    // previously N individual UPDATEs inside the loop above.
    await markOutboxEventsDispatched(trx, dispatchedIds);

    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  return { dispatched, failed };
}
