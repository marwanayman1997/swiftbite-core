import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { UserController } from "./controller/user.controller.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";
import { requireInternalApiKey } from "../../lib/auth/api-key.ts";
import { findUserById } from "./repository/users.repo.ts";
import { UserNotFoundError } from "./errors.ts";
import { sendSuccess } from "../../lib/http/response.ts";

export const userRouter = Router();
const userController = container.resolve<UserController>(TOKENS.UserController);

userRouter.get("/me", authenticate, userController.getMe);
userRouter.patch("/me", authenticate, userController.updateMe);

// Internal, order-service only (guarded by api-key, not JWT).
userRouter.get(
  "/internal/agents/:id",
  requireInternalApiKey,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const user = await findUserById(id);
      if (!user) return next(UserNotFoundError);
      sendSuccess(res, { id: user.id, name: user.name, phone: user.phone });
    } catch (err) {
      next(err);
    }
  },
);
