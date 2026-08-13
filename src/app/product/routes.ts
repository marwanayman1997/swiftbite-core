import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { ProductController } from "./controller/product.controller.ts";
import {
  requireRestaurantMember,
  rbac,
  requireBranchAccess,
} from "../../lib/auth/rbac.ts";
import { withCache } from "../../lib/cache/withCache.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const productRouter = Router();
const productController = container.resolve<ProductController>(
  TOKENS.ProductController,
);

productRouter.get(
  "/restaurants/:restaurantId/categories",
  withCache(300),
  productController.findCategories,
);

productRouter.get(
  "/branches/:branchId/products",
  withCache(60),
  productController.findByBranch,
);

productRouter.get(
  "/restaurants/:restaurantId/products",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:product", action: "read" }),
  productController.findByRestaurant,
);

productRouter.post(
  "/restaurants/:restaurantId/products",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:product", action: "create" }),
  idempotency({ strict: true }),
  productController.create,
);

productRouter.get("/products/:id", productController.findById);

productRouter.patch(
  "/products/:id",
  authenticate,
  requireBranchAccess("branchId"),
  rbac({ resource: "core:product", action: "update" }),
  productController.update,
);
