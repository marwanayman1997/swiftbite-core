import { Router } from "express";
import { healthRouter } from "./app/health/health.routes.ts";
import { authRouter } from "./app/auth/routes.ts";

export const routes: Router = Router();

routes.use("/health", healthRouter);
routes.use("/auth", authRouter);
