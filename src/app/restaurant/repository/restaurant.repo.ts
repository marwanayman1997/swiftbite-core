import { Knex } from "knex";
import { db } from "../../../common/knex/knex.ts";
import { RestaurantEntity } from "../entity/restaurant.entity.ts";
import type { RestaurantStatus } from "../enums.ts";

const RESTAURANT_COLUMNS = [
  "id",
  "owner_id",
  "name",
  "logo_url",
  "status",
  "primary_country",
  "created_at",
  "updated_at",
  "status_updated_at",
];

function toEntity(row: any) {
  return new RestaurantEntity({
    id: Number(row.id),
    ownerId: Number(row.owner_id),
    name: row.name,
    logoURL: row.logo_url,
    status: row.status,
    primaryCountry: row.primary_country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusUpdatedAt: row.status_updated_at,
  });
}

export async function findAllRestaurants(): Promise<RestaurantEntity[]> {
  const rows = await db("restaurants").select(RESTAURANT_COLUMNS);
  return rows.map(toEntity);
}

export async function findRestaurantById(
  id: number,
): Promise<RestaurantEntity | undefined> {
  const row = await db("restaurants")
    .select(RESTAURANT_COLUMNS)
    .where("id", id)
    .first();
  return row ? toEntity(row) : undefined;
}

export async function updateRestaurantById(
  id: number,
  data: Partial<{ name: string; logoURL: string; primaryCountry: string }>,
): Promise<RestaurantEntity | undefined> {
  const payload: Record<string, unknown> = { updated_at: new Date() };
  if (data.name !== undefined) payload.name = data.name;
  if (data.logoURL !== undefined) payload.logo_url = data.logoURL;
  if (data.primaryCountry !== undefined) {
    payload.primary_country = data.primaryCountry;
  }

  const [row] = await db("restaurants")
    .where("id", id)
    .update(payload)
    .returning(RESTAURANT_COLUMNS);
  return row ? toEntity(row) : undefined;
}

export async function updateRestaurantStatus(
  id: number,
  status: RestaurantStatus,
): Promise<RestaurantEntity | undefined> {
  const now = new Date();
  const [row] = await db("restaurants")
    .where("id", id)
    .update({ status, status_updated_at: now, updated_at: now })
    .returning(RESTAURANT_COLUMNS);
  return row ? toEntity(row) : undefined;
}

export async function createRestaurant(
  data: Partial<RestaurantEntity>,
  conn: Knex = db,
): Promise<RestaurantEntity> {
  const [row] = await conn("restaurants")
    .insert({
      owner_id: data.ownerId,
      name: data.name,
      logo_url: data.logoURL,
      status: data.status,
      primary_country: data.primaryCountry,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      status_updated_at: data.statusUpdatedAt,
    })
    .returning(RESTAURANT_COLUMNS);
  return toEntity(row);
}
