import { Knex } from "knex";
import { db } from "../../../lib/knex/knex.ts";
import { ProductBranchDetailsEntity } from "../entity/product-branch-details.entity.ts";
import { insufficientStockError } from "../errors.ts";

const PBD_COLUMNS = [
  "id",
  "branch_id",
  "product_id",
  "price",
  "stock",
  "is_available",
];

function toEntity(row: any): ProductBranchDetailsEntity {
  return new ProductBranchDetailsEntity({
    id: Number(row.id),
    branchId: Number(row.branch_id),
    productId: Number(row.product_id),
    price: row.price,
    stock: row.stock,
    isAvailable: row.is_available,
  });
}

export async function updateBranchDetails(
  branchId: number,
  productId: number,
  data: { price?: number; stock?: number; isAvailable?: boolean },
  conn: Knex = db,
): Promise<ProductBranchDetailsEntity | undefined> {
  const [row] = await conn("product_branch_details")
    .where("branch_id", branchId)
    .andWhere("product_id", productId)
    .update({
      price: data.price,
      stock: data.stock,
      is_available: data.isAvailable,
    })
    .returning(PBD_COLUMNS);
  return row ? toEntity(row) : undefined;
}

export interface BranchProductRow {
  productId: number;
  name: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  isAvailable: boolean;
}

function toBranchProductRow(row: any): BranchProductRow {
  return {
    productId: Number(row.product_id),
    name: row.name,
    imageUrl: row.image_url,
    price: Number(row.price),
    stock: Number(row.stock),
    isAvailable: row.is_available,
  };
}

export async function getBranchProducts(
  branchId: number,
  productIds: number[],
): Promise<BranchProductRow[]> {
  const rows = await db("product_branch_details as pbd")
    .select(
      "pbd.product_id",
      "pbd.price",
      "pbd.stock",
      "pbd.is_available",
      "p.name",
      "p.image_url",
    )
    .join("products as p", "p.id", "pbd.product_id")
    .where("pbd.branch_id", branchId)
    .whereIn("pbd.product_id", productIds)
    .whereNull("p.deleted_at");
  return rows.map(toBranchProductRow);
}

// Atomic per-item conditional decrement (`stock >= quantity`) inside one trx.
// Any item that can't be satisfied rolls the whole reservation back and
// throws a 409 with the full list of offending items.
export async function reserveStock(
  branchId: number,
  items: Array<{ productId: number; quantity: number }>,
): Promise<void> {
  const trx = await db.transaction();
  try {
    const shortfalls: Array<{
      productId: number;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const [row] = await trx("product_branch_details")
        .where("branch_id", branchId)
        .andWhere("product_id", item.productId)
        .andWhere("stock", ">=", item.quantity)
        .update({ stock: trx.raw("stock - ?", [item.quantity]) })
        .returning(["product_id", "stock"]);

      if (!row) {
        const current = await trx("product_branch_details")
          .select("stock")
          .where("branch_id", branchId)
          .andWhere("product_id", item.productId)
          .first();
        shortfalls.push({
          productId: item.productId,
          requested: item.quantity,
          available: current ? Number(current.stock) : 0,
        });
      }
    }

    if (shortfalls.length > 0) {
      throw insufficientStockError(shortfalls);
    }

    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
