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
import { requireInternalApiKey } from "../../lib/auth/api-key.ts";
import {
  getBranchProducts,
  reserveStock,
} from "./repository/product-branch-details.repository.ts";
import { sendSuccess } from "../../lib/http/response.ts";

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

// Internal, order-service only (guarded by api-key, not JWT).
productRouter.get(
  "/internal/branches/:id/products",
  requireInternalApiKey,
  async (req, res, next) => {
    try {
      const branchId = Number(req.params.id);
      const productIds = String(req.query.ids || "")
        .split(",")
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      const rows = await getBranchProducts(branchId, productIds);
      sendSuccess(res, rows);
    } catch (err) {
      next(err);
    }
  },
);

productRouter.post(
  "/internal/branches/:id/reserve-stock",
  requireInternalApiKey,
  idempotency({ strict: true }),
  async (req, res, next) => {
    try {
      const branchId = Number(req.params.id);
      const items = req.body.items as Array<{
        productId: number;
        quantity: number;
      }>;
      await reserveStock(branchId, items);
      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },
);
