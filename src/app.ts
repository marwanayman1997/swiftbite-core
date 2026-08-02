import express, { type Express } from "express";
import { routes } from "./routes.ts";
import { errorHandler } from "./common/error/errorHandler.ts";
import { correlationId } from "./common/correlation/correlationId.ts";
import cookieParser from "cookie-parser";

export function createApp(): Express {
  const app: Express = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(correlationId);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
