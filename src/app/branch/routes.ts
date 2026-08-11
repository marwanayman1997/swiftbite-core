import { Router } from "express";
import { branchController } from "./controller/branch.controller.ts";
import { authenticate } from "../../common/auth/guard.ts";
import {
  requireRestaurantMember,
  rbac,
  requireBranchAccess,
} from "../../common/auth/rbac.ts";

export const branchRouter = Router();

branchRouter.get("/branches/nearby", branchController.findNearby);
branchRouter.get(
  "/restaurants/:restaurantId/branches",
  branchController.findByRestaurant,
);
branchRouter.post(
  "/restaurants/:restaurantId/branches",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:branch", action: "create" }),
  branchController.create,
);
branchRouter.patch(
  "/branches/:id",
  authenticate,
  requireBranchAccess("id"),
  rbac({ resource: "core:branch", action: "update" }),
  branchController.update,
);
branchRouter.patch(
  "/branches/:id/status",
  authenticate,
  branchController.updateStatus,
);
