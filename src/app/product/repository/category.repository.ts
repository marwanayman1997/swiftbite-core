import { Knex } from "knex";
import { db } from "../../../common/knex/knex.ts";
import { ProductCategoryEntity } from "../entity/product-category.entity.ts";

const PRODUCT_CATEGORY_COLUMNS = [
  "id",
  "restaurant_id",
  "name",
  "created_at",
  "updated_at",
];

function toEntity(row: any) {
  return new ProductCategoryEntity({
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function findCategoriesByRestaurant(
  id: number,
): Promise<ProductCategoryEntity[]> {
  const row = await db("product_categories")
    .select(PRODUCT_CATEGORY_COLUMNS)
    .where("restaurant_id", id);
  return row.map(toEntity);
}

export async function createCategory(
  restaurantId: number,
  name: string,
  conn: Knex = db,
): Promise<ProductCategoryEntity> {
  const [row] = await conn("product_categories")
    .insert({
      restaurant_id: restaurantId,
      name,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(PRODUCT_CATEGORY_COLUMNS);
  return toEntity(row);
}

export async function findCategoryByName(
  restaurantId: number,
  name: string,
): Promise<ProductCategoryEntity | undefined> {
  const row = await db("product_categories")
    .select(PRODUCT_CATEGORY_COLUMNS)
    .where("restaurant_id", restaurantId)
    .andWhere("name", name)
    .first();
  return row ? toEntity(row) : undefined;
}
