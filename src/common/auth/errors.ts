import { AppError } from "../error/AppError.ts";

export const NotAuthenticated = new AppError("User not authenticated", 403);
