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
import { requireInternalApiKey } from "../../lib/auth/api-key.ts";
import { findBranchById } from "./repository/branch.repo.ts";
import { findRestaurantById } from "../restaurant/repository/restaurant.repo.ts";
import { BranchNotFoundError } from "./errors.ts";
import { RestaurantNotFoundError } from "../restaurant/errors.ts";
import { sendSuccess } from "../../lib/http/response.ts";

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

// Internal, order-service only (guarded by api-key, not JWT).
branchRouter.get(
  "/internal/branches/:id",
  requireInternalApiKey,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const branch = await findBranchById(id);
      if (!branch) return next(BranchNotFoundError);
      const restaurant = await findRestaurantById(branch.restaurantId);
      if (!restaurant) return next(RestaurantNotFoundError);

      sendSuccess(res, {
        id: branch.id,
        region: branch.countryCode.toLowerCase(),
        restaurantId: branch.restaurantId,
        restaurantOwnerId: restaurant.ownerId,
        restaurantStatus: restaurant.status,
        acceptOrders: branch.acceptOrders,
        isActive: branch.isActive,
        deliveryFee: branch.deliveryFee,
        commissionBps: branch.commission,
        currency: branch.currency,
        lat: branch.lat,
        lng: branch.lng,
        label: branch.label,
        restaurantName: restaurant.name,
        addressText: branch.addressText,
      });
    } catch (err) {
      next(err);
    }
  },
);
