import { Request, Response, NextFunction } from "express";
import { UserService, userService } from "../../user/service/user.service.ts";
import { UpdateUserDTO } from "../dto/user.dto.ts";
import { validateBody } from "../../../common/validation/validate.ts";

export class UserController {
  constructor(private readonly userService: UserService) {}

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUserById(req.user?.userId!);
      return res.status(200).json(user);
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
      res.status(200).json({ message: "User profile updated", user });
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController(userService);
