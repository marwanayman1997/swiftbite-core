import { Router } from "express";
import { healthRouter } from "./app/health/health.routes.js";

export const routes: Router = Router();

routes.use("/health", healthRouter);
