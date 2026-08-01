import express, { type Express } from "express";
import { routes } from "./routes.js";

export function createApp(): Express {
  const app: Express = express();
  app.use(express.json());
  app.use("/api", routes);

  return app;
}
