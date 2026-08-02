import { Router } from "express";
import { authController } from "./controller/auth.controller.ts";

export const authRouter = Router();

authRouter.post("/register", authController.register);
