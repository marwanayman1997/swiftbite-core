import { Router } from "express";
import { AuthController } from "./controller/auth.controller.ts";
import { TOKENS } from "../../lib/di/tokens.ts";
import { container } from "../../lib/di/container.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";

export const authRouter = Router();
const authController = container.resolve<AuthController>(TOKENS.AuthController);

authRouter.post(
  "/register",
  idempotency({ strict: true }),
  authController.register,
);
authRouter.post("/login", authController.login);
authRouter.post(
  "/forget-password",
  idempotency({ strict: true }),
  authController.forgetPassword,
);
authRouter.post(
  "/reset-password",
  idempotency({ strict: true }),
  authController.resetPassword,
);
authRouter.post(
  "/accept-invite",
  idempotency({ strict: true }),
  authController.acceptInvite,
);
authRouter.post("/refresh", authController.refresh);
