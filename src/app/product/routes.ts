import { Router } from "express";
import { authenticate } from "../../common/auth/guard.ts";
import { productController } from "./controller/product.controller.ts";
import {
  requireRestaurantMember,
  rbac,
  requireBranchAccess,
} from "../../common/auth/rbac.ts";

export const productRouter = Router();

productRouter.get(
  "/restaurants/:restaurantId/categories",
  productController.findCategories,
);

productRouter.get(
  "/branches/:branchId/products",
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
