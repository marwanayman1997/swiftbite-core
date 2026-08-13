import { NextFunction, Request, Response } from "express";
import { ICacheProvider } from "../../pkg/cache/cache.interface.ts";
import { container } from "../di/container.ts";
import { TOKENS } from "../di/tokens.ts";
import { AppError } from "../error/AppError.ts";

export interface IdempotencyOptions {
  strict?: boolean;
  ttlSeconds?: number;
}

const IDEMPOTENT_METHODS = new Set(["POST", "PATCH", "PUT"]);
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export function idempotency(options: IdempotencyOptions = {}) {
  const { strict = false, ttlSeconds = DEFAULT_TTL_SECONDS } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!IDEMPOTENT_METHODS.has(req.method)) {
      return next();
    }

    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      if (strict) {
        return next(new AppError("Idempotency-Key header is required", 400));
      }
      return next();
    }

    const key = `idempotency:${req.method}:${req.originalUrl}:${idempotencyKey}`;
    const cacheProvider: ICacheProvider = container.resolve(
      TOKENS.CacheProvider,
    );

    let cached: string | null = null;
    try {
      cached = await cacheProvider.get(key);
    } catch (err) {
      if (strict) {
        return next(new AppError("Idempotency check unavailable", 503));
      }
      return next();
    }

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheProvider.set(key, JSON.stringify(body), ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}
