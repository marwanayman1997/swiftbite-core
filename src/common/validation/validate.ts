import { validate, type ValidationError } from "class-validator";
import { AppError } from "../error/AppError.ts";

export async function validateBody<T extends Object>(
  cls: new () => T,
  body: unknown,
): Promise<T> {
  const instance = Object.assign(new cls(), body);
  const errors = await validate(instance, { whitelist: true });

  if (errors.length > 0) {
    const messages = errors.flatMap((e: ValidationError) =>
      Object.values(e.constraints ?? {}),
    );
    throw new AppError(messages.join(", \n"), 400);
  }
  return instance;
}
