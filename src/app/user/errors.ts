import { AppError } from "../../lib/error/AppError.ts";

export const UserNotFoundError = new AppError("User not found", 404);
