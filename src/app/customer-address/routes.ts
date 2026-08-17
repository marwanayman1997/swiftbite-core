import { Router } from "express";
import { authenticate } from "../../lib/auth/guard.ts";
import { CustomerAddressController } from "./controller/customer-address.controller.ts";
import { idempotency } from "../../lib/idempotency/idempotency.ts";
import { container } from "../../lib/di/container.ts";
import { TOKENS } from "../../lib/di/tokens.ts";
import { requireInternalApiKey } from "../../lib/auth/api-key.ts";
import { findAddressById } from "./repository/customer-address.repo.ts";
import { AddressNotFoundError } from "./errors.ts";
import { sendSuccess } from "../../lib/http/response.ts";

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

// Internal, order-service only (guarded by api-key, not JWT).
customerAddressRouter.get(
  "/internal/:id",
  requireInternalApiKey,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const address = await findAddressById(id);
      if (!address) return next(AddressNotFoundError);

      sendSuccess(res, {
        id: address.id,
        userId: address.userId,
        lat: address.lat,
        lng: address.lng,
        addressText: `${address.street}, ${address.city}, ${address.country}`,
        city: address.city,
        country: address.country,
        building: address.building,
        apartmentNumber: address.apartmentNumber,
        label: address.label,
      });
    } catch (err) {
      next(err);
    }
  },
);
