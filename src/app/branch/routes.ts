import { Router } from "express";
import { BranchController } from "./controller/branch.controller.ts";
import { authenticate } from "../../lib/auth/guard.ts";
import {
  requireRestaurantMember,
  rbac,
  requireBranchAccess,
} from "../../lib/auth/rbac.ts";
import { withCache } from "../../lib/cache/withCache.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const branchRouter = Router();
const branchController = container.resolve<BranchController>(
  TOKENS.BranchController,
);

branchRouter.get("/branches/nearby", branchController.findNearby);
branchRouter.get(
  "/restaurants/:restaurantId/branches",
  withCache(300),
  branchController.findByRestaurant,
);
branchRouter.post(
  "/restaurants/:restaurantId/branches",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:branch", action: "create" }),
  idempotency({ strict: true }),
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
