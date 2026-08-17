import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.ts";
import { AppError } from "../error/AppError.ts";

// Shared-secret guard for sync HTTP calls FROM other services (order-service)
// TO core. The broker/gateway is the trust boundary — plain equality is enough.
export function requireInternalApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.header("api-key");
  if (!key || key !== env.internal.apiKey) {
    return next(new AppError("Invalid internal API key", 401));
  }
  next();
}
