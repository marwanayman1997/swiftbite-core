import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { UserController } from "./controller/user.controller.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const userRouter = Router();
const userController = container.resolve<UserController>(TOKENS.UserController);

userRouter.get("/me", authenticate, userController.getMe);
userRouter.patch("/me", authenticate, userController.updateMe);
