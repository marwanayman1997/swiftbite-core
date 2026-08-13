import { Knex } from "knex";
import { UpdateUserDTO } from "../dto/user.dto.ts";
import { UserNotFoundError } from "../errors.ts";
import {
  findUserById,
  findUserExistsByEmailOrPhone,
  createUser as createUserRepo,
  updateUser,
} from "../repository/users.repo.ts";
import { UserAlreadyExistsError } from "../../auth/errors.ts";
import { hashPassword } from "../../auth/utils.ts";
import { SystemRole } from "../enums.ts";
import { User } from "../entity/user.entity.ts";
import { injectable } from "tsyringe";

export interface CreateUserData {
  email: string;
  phone: string;
  name: string;
  password: string;
  systemRole: SystemRole;
}

@injectable()
export class UserService {
  create = async (
    data: CreateUserData,
    trx?: Knex | Knex.Transaction,
  ): Promise<User> => {
    const existing = await findUserExistsByEmailOrPhone(data.email, data.phone);
    if (existing) {
      throw UserAlreadyExistsError;
    }
    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : "";
    const now = new Date();
    return createUserRepo(
      {
        email: data.email,
        phone: data.phone,
        name: data.name,
        passwordHash: hashedPassword,
        systemRole: data.systemRole,
        createdAt: now,
        updatedAt: now,
      },
      trx,
    );
  };

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
