import { Router } from "express";
import { AuthController } from "./controller/auth.controller.ts";
import { TOKENS } from "../../lib/di/tokens.ts";
import { container } from "../../lib/di/container.ts";

export const authRouter = Router();
const authController = container.resolve<AuthController>(TOKENS.AuthController);

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/forget-password", authController.forgetPassword);
authRouter.post("/reset-password", authController.resetPassword);
authRouter.post("/accept-invite", authController.acceptInvite);
authRouter.post("/refresh", authController.refresh);
