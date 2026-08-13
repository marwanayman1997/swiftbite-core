import { AppError } from "../../lib/error/AppError.ts";

export const RestaurantNotFoundError = new AppError(
  "Restaurant not found",
  404,
);
