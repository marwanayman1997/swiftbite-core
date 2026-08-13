import { Knex } from "knex";
import { db } from "../../../lib/knex/knex.ts";
import { Branch } from "../entity/branch.entity.ts";
import type { Currency } from "../enums.ts";
import {
  applyCursorPagination,
  applyFilters,
  buildPaginationResult,
  FilterParams,
  PaginationMeta,
  PaginationParams,
} from "../../../lib/http/pagination/cursor-pagination.ts";

const BRANCH_COLUMNS = [
  "id",
  "restaurant_id",
  "country_code",
  "address_text",
  "label",
  "lat",
  "lng",
  "is_active",
  "opens_at",
  "closes_at",
  "accept_orders",
  "created_at",
  "updated_at",
  "delivery_radius",
  "currency",
  "commission",
  "location",
];

function toEntity(row: any) {
  return new Branch({
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    countryCode: row.country_code,
    addressText: row.address_text,
    label: row.label,
    lat: Number(row.lat),
    lng: Number(row.lng),
    isActive: row.is_active,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    acceptOrders: row.accept_orders,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryRadius: row.delivery_radius,
    currency: row.currency,
    commission: row.commission,
    location: row.location,
  });
}

export async function createBranch(
  data: Partial<Branch>,
  conn: Knex = db,
): Promise<Branch> {
  const [row] = await conn("restaurant_branches")
    .insert({
      restaurant_id: data.restaurantId,
      country_code: data.countryCode,
      address_text: data.addressText,
      label: data.label,
      lat: data.lat,
      lng: data.lng,
      is_active: data.isActive,
      opens_at: data.opensAt,
      closes_at: data.closesAt,
      accept_orders: data.acceptOrders,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      delivery_radius: data.deliveryRadius,
      currency: data.currency,
      commission: data.commission,
    })
    .returning(BRANCH_COLUMNS);

  return toEntity(row);
}

export async function findBranchById(id: number): Promise<Branch | undefined> {
  const row = await db("restaurant_branches")
    .select(BRANCH_COLUMNS)
    .where("id", id)
    .first();
  return row ? toEntity(row) : undefined;
}

export async function updateBranchById(
  id: number,
  data: Partial<{
    label: string;
    addressText: string;
    lat: number;
    lng: number;
    opensAt: string;
    closesAt: string;
    deliveryRadius: number;
    currency: Currency;
    acceptOrders: boolean;
  }>,
): Promise<Branch | undefined> {
  const payload: Record<string, unknown> = { updated_at: new Date() };
  if (data.label !== undefined) payload.label = data.label;
  if (data.addressText !== undefined) payload.address_text = data.addressText;
  if (data.lat !== undefined) payload.lat = data.lat;
  if (data.lng !== undefined) payload.lng = data.lng;
  if (data.opensAt !== undefined) payload.opens_at = data.opensAt;
  if (data.closesAt !== undefined) payload.closes_at = data.closesAt;
  if (data.deliveryRadius !== undefined) {
    payload.delivery_radius = data.deliveryRadius;
  }
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.acceptOrders !== undefined) {
    payload.accept_orders = data.acceptOrders;
  }

  const [row] = await db("restaurant_branches")
    .where("id", id)
    .update(payload)
    .returning(BRANCH_COLUMNS);
  return row ? toEntity(row) : undefined;
}

export async function updateBranchStatus(
  id: number,
  data: Partial<{ isActive: boolean; commission: number }>,
): Promise<Branch | undefined> {
  const payload: Record<string, unknown> = { updated_at: new Date() };
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.commission !== undefined) payload.commission = data.commission;

  const [row] = await db("restaurant_branches")
    .where("id", id)
    .update(payload)
    .returning(BRANCH_COLUMNS);
  return row ? toEntity(row) : undefined;
}

export async function findBranchesByRestaurant(
  restaurantId: number,
  pagination: PaginationParams,
  filters: FilterParams[],
): Promise<{ data: Branch[]; meta: PaginationMeta }> {
  let query = db("restaurant_branches")
    .select(BRANCH_COLUMNS)
    .where("restaurant_id", restaurantId);
  query = applyFilters(query, filters);
  query = applyCursorPagination(query, pagination);

  const rows = await query;
  const { data, meta } = buildPaginationResult(
    rows,
    pagination.limit,
    pagination.sortBy,
  );
  return { data: data.map(toEntity), meta };
}

export async function findNearbyBranches(
  lat: number,
  lng: number,
): Promise<Branch[]> {
  const result = await db.raw(
    `
       SELECT 
       b.id,
       b.restaurant_id,
       b.address_text,
       b.label,
       b.lat,
       b.lng,
       b.is_active,
       b.accept_orders,
       b.currency,
       r.name,
       r.logo_url
       FROM restaurant_branches b JOIN restaurants r ON  b.restaurant_id = r.id
       WHERE b.is_active = true AND r.status ='active'
       AND ST_DWithin(b.location, ST_MakePoint(?, ?)::geography, b.delivery_radius*1000)
    `,
    [lng, lat],
  );

  return result.rows;
}
