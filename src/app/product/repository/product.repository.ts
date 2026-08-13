import { Knex } from "knex";
import { db } from "../../../lib/knex/knex.ts";
import { ProductEntity } from "../entity/product.entity.ts";
import {
  applyCursorPagination,
  applyFilters,
  buildPaginationResult,
  FilterParams,
  PaginationMeta,
  PaginationParams,
} from "../../../lib/http/pagination/cursor-pagination.ts";

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "description",
  "image_url",
  "restaurant_id",
  "category_id",
  "created_at",
  "updated_at",
  "deleted_at",
];

function toEntity(row: any): ProductEntity {
  return new ProductEntity({
    id: Number(row.id),
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    restaurantId: Number(row.restaurant_id),
    categoryId: row.category_id !== null ? Number(row.category_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

export async function createProduct(
  data: Partial<ProductEntity>,
): Promise<ProductEntity> {
  const [row] = await db("products")
    .insert({
      name: data.name,
      description: data.description,
      image_url: data.imageUrl,
      restaurant_id: data.restaurantId,
      category_id: data.categoryId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(PRODUCT_COLUMNS);
  return toEntity(row);
}

export async function updateProduct(
  id: number,
  data: Record<string, any>,
): Promise<ProductEntity> {
  const [row] = await db("products")
    .where("id", id)
    .update({
      name: data.name,
      description: data.description,
      image_url: data.imageUrl,
      category_id: data.categoryId,
      updated_at: new Date(),
    })
    .returning(PRODUCT_COLUMNS);
  return toEntity(row);
}

export async function findProductById(
  id: number,
): Promise<ProductEntity | undefined> {
  const row = await db("products")
    .select(PRODUCT_COLUMNS)
    .where("id", id)
    .whereNull("deleted_at")
    .first();
  return row ? toEntity(row) : undefined;
}

export async function findProductsByRestaurant(
  restaurantId: number,
  pagination: PaginationParams,
  filters: FilterParams[],
): Promise<{ data: ProductEntity[]; meta: PaginationMeta }> {
  let query = db("products")
    .select(PRODUCT_COLUMNS)
    .where("restaurant_id", restaurantId)
    .whereNull("deleted_at");
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

export async function findProductsByBranch(
  branchId: number,
  pagination: PaginationParams,
  filters: FilterParams[],
) {
  let query = db("products as p")
    .join("product_branch_details as pbd", "p.id", "pbd.product_id")
    .leftJoin("product_categories as pc", "p.category_id", "pc.id")
    .where("pbd.branch_id", branchId)
    .whereNull("p.deleted_at")
    .select(
      "p.id",
      "p.name",
      "p.description",
      "p.image_url",
      "p.restaurant_id",
      "p.category_id",
      "p.created_at",
      "pc.name as category_name",
      "pbd.price",
      "pbd.stock",
      "pbd.is_available",
    );
  query = applyFilters(query, filters);
  query = applyCursorPagination(query, pagination, "p.id");

  const rows = await query;
  const { data, meta } = buildPaginationResult(
    rows,
    pagination.limit,
    pagination.sortBy,
    "p.id",
  );
  return {
    data: data.map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      restaurantId: Number(row.restaurant_id),
      categoryId: row.category_id !== null ? Number(row.category_id) : null,
      categoryName: row.category_name,
      price: row.price,
      stock: row.stock,
      isAvailable: row.is_available,
    })),
    meta,
  };
}
