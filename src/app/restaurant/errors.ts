import { AppError } from "../../common/error/AppError.ts";

export const RestaurantNotFoundError = new AppError(
  "Restaurant not found",
  404,
);
