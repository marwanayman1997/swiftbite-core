import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { CustomerAddressController } from "./controller/customer-address.controller.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";

export const customerAddressRouter = Router();
const customerAddressController = container.resolve<CustomerAddressController>(
  TOKENS.CustomerAddressController,
);

customerAddressRouter.get("/", authenticate, customerAddressController.getAll);
customerAddressRouter.post(
  "/",
  authenticate,
  idempotency({ strict: false }),
  customerAddressController.create,
);
customerAddressRouter.patch(
  "/:addressId",
  authenticate,
  customerAddressController.update,
);
customerAddressRouter.delete(
  "/:addressId",
  authenticate,
  customerAddressController.remove,
);
