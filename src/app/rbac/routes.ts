import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { requireRestaurantMember, rbac } from "../../lib/auth/rbac.ts";
import { MemberController } from "./controller/member.controller.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const rbacRouter = Router();
const memberController = container.resolve<MemberController>(
  TOKENS.MemberController,
);

rbacRouter.post(
  "/restaurants/:restaurantId/members",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:member", action: "create" }),
  idempotency({ strict: true }),
  memberController.createMember,
);

rbacRouter.get(
  "/restaurants/:restaurantId/members",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:member", action: "read" }),
  memberController.listMembers,
);

rbacRouter.patch(
  "/restaurants/:restaurantId/members/:memberId",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:member", action: "update" }),
  memberController.updateMember,
);

rbacRouter.delete(
  "/restaurants/:restaurantId/members/:memberId",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:member", action: "delete" }),
  memberController.deleteMember,
);

rbacRouter.put(
  "/restaurants/:restaurantId/members/:memberId/branches",
  authenticate,
  requireRestaurantMember("restaurantId"),
  rbac({ resource: "core:member", action: "update" }),
  memberController.updateMemberBranches,
);

rbacRouter.get("/roles/:role/permissions", memberController.getRolePermissions);
