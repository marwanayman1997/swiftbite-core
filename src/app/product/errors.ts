import { AppError } from "../../lib/error/AppError.ts";

export const ProductNotFoundError = new AppError("Product not found", 404);

export const BranchDetailsNotFoundError = new AppError(
  "This product has no details for the given branch",
  404,
);

export function insufficientStockError(
  details: Array<{ productId: number; requested: number; available: number }>,
): AppError {
  return new AppError("OutOfStock", 409, true, details);
}
