import { AppError } from "../../lib/error/AppError.ts";

export const AddressNotFoundError = new AppError("Address not found", 404);
