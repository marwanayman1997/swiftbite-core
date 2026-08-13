import { Request, Response, NextFunction } from "express";
import { UserService } from "../../user/service/user.service.ts";
import { UpdateUserDTO } from "../dto/user.dto.ts";
import { validateBody } from "../../../lib/validation/validate.ts";
import { sendSuccess } from "../../../lib/http/response.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";

@injectable()
export class UserController {
  constructor(
    @inject(TOKENS.UserService)
    private readonly userService: UserService,
  ) {}

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUserById(req.user?.userId!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(UpdateUserDTO, req.body);
      const user = await this.userService.updateProfile(
        req.user?.userId!,
        data,
      );
      sendSuccess(res, { message: "User updated successfully", user });
    } catch (err) {
      next(err);
    }
  };
}
