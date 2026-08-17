import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
        ALTER TABLE restaurant_branches
        ADD COLUMN delivery_fee INT NOT NULL DEFAULT 0;
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
        ALTER TABLE restaurant_branches
        DROP COLUMN delivery_fee;
    `);
}
