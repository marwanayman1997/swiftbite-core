import { db } from "../../../common/knex/knex.ts";
import { ProductBranchDetailsEntity } from "../entity/product-branch-details.entity.ts";

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
): Promise<ProductBranchDetailsEntity | undefined> {
  const [row] = await db("product_branch_details")
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
