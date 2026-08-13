import { AppError } from "../../lib/error/AppError.ts";

export const BranchNotFoundError = new AppError("Branch not found", 404);
