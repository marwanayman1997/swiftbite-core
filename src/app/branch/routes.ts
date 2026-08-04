import { Router } from "express";
import { branchController } from "./controller/branch.controller.ts";
import { authenticate } from "../../common/auth/guard.ts";

export const branchRouter = Router();

branchRouter.get("/branches/nearby", branchController.findNearby);
branchRouter.get(
  "/restaurants/:restaurantId/branches",
  branchController.findByRestaurant,
);
branchRouter.post(
  "/restaurants/:restaurantId/branches",
  authenticate,
  branchController.create,
);
branchRouter.patch("/branches/:id", authenticate, branchController.update);
branchRouter.patch(
  "/branches/:id/status",
  authenticate,
  branchController.updateStatus,
);
