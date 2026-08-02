import { UpdateUserDTO } from "../dto/user.dto.ts";
import { UserNotFoundError } from "../errors.ts";
import { findUserById, updateUser } from "../repository/users.repo.ts";

export class UserService {
  getUserById = async (userId: number) => {
    const user = await findUserById(userId);
    if (!user) {
      throw UserNotFoundError;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      systemRole: user.systemRole,
    };
  };

  updateProfile = async (userId: number, data: UpdateUserDTO) => {
    const user = await findUserById(userId);
    if (!user) {
      throw UserNotFoundError;
    }
    const updated = await updateUser(userId, data);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      systemRole: updated.systemRole,
    };
  };
}

export const userService = new UserService();
