import { Router } from "express";
import { healthRouter } from "./app/health/health.routes.ts";
import { authRouter } from "./app/auth/routes.ts";
import { userRouter } from "./app/user/routes.ts";
import { customerAddressRouter } from "./app/customer-address/routes.ts";

export const routes: Router = Router();

routes.use("/health", healthRouter);
routes.use("/auth", authRouter);
routes.use("/user", userRouter);
routes.use("/customer/addresses", customerAddressRouter);
