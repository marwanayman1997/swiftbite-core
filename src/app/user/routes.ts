import { Router } from "express";
import { authenticate } from "../../common/auth/guard.ts";
import { userController } from "./controller/user.controller.ts";

export const userRouter = Router();

userRouter.get("/me", authenticate, userController.getMe);
userRouter.patch("/me", authenticate, userController.updateMe);
