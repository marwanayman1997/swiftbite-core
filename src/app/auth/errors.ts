import { AppError } from "../../common/error/AppError.ts";

export const UserAlreadyExistsError = new AppError(
  "User already exists with same phone number or email",
  400,
);

export const CannotSignupAsSystemAdmin = new AppError(
  "You can't register as a system admin",
  403,
);
