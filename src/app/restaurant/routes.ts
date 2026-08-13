import { Router } from "express";
import { RestaurantController } from "./controller/restaurant.controller.ts";
import { authenticate } from "../../lib/auth/guard.ts";
import { requireRestaurantMember, rbac } from "../../lib/auth/rbac.ts";
import { withCache } from "../../lib/cache/withCache.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const restaurantRouter = Router();
const restaurantController = container.resolve<RestaurantController>(
  TOKENS.RestaurantController,
);

restaurantRouter.get("/", withCache(300), restaurantController.getAll);
restaurantRouter.get("/:id", withCache(300), restaurantController.getById);
restaurantRouter.post("/", authenticate, restaurantController.create);
restaurantRouter.patch(
  "/:id",
  authenticate,
  requireRestaurantMember("id"),
  rbac({ resource: "core:restaurant", action: "update" }),
  restaurantController.update,
);
restaurantRouter.patch(
  "/:id/status",
  authenticate,
  restaurantController.updateStatus,
);
