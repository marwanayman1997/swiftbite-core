import { Router } from "express";
import { restaurantController } from "./controller/restaurant.controller.ts";
import { authenticate } from "../../common/auth/guard.ts";
import { requireRestaurantMember, rbac } from "../../common/auth/rbac.ts";

export const restaurantRouter = Router();

restaurantRouter.get("/", restaurantController.getAll);
restaurantRouter.get("/:id", restaurantController.getById);
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
