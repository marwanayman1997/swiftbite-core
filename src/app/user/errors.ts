import { AppError } from "../../common/error/AppError.ts";

export const UserNotFoundError = new AppError("User not found", 404);
