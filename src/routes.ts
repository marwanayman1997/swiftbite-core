import { Router } from "express";
import { healthRouter } from "./app/health/health.routes.ts";
import { authRouter } from "./app/auth/routes.ts";
import { userRouter } from "./app/user/routes.ts";
import { customerAddressRouter } from "./app/customer-address/routes.ts";
import { restaurantRouter } from "./app/restaurant/routes.ts";
import { branchRouter } from "./app/branch/routes.ts";
import { productRouter } from "./app/product/routes.ts";
import { rbacRouter } from "./app/rbac/routes.ts";

export const routes: Router = Router();

routes.use("/health", healthRouter);
routes.use("/auth", authRouter);
routes.use("/user", userRouter);
routes.use("/customer/addresses", customerAddressRouter);
routes.use("/restaurants", restaurantRouter);
routes.use("/", branchRouter);
routes.use("/product", productRouter);
routes.use("/", rbacRouter);
