import { AppError } from "../../common/error/AppError.ts";

export const BranchNotFoundError = new AppError("Branch not found", 404);
