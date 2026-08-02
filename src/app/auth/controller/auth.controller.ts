import { NextFunction, Request, Response } from "express";
import { validateBody } from "../../../common/validation/validate.ts";
import { RegisterDTO } from "../dto/auth.dto.ts";
import { AuthService, authService } from "../service/auth.service.ts";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(RegisterDTO, req.body);

      const result = await this.authService.register(data);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController(authService);
