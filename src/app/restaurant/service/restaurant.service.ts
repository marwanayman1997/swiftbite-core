import { Knex } from "knex";
import { db } from "../../../common/knex/knex.ts";
import { RegisterRestaurantDTO } from "../../auth/dto/auth.dto.ts";
import { UserAlreadyExistsError } from "../../auth/errors.ts";
import { hashPassword } from "../../auth/utils.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  createUser,
  findUserExistsByEmailOrPhone,
} from "../../user/repository/users.repo.ts";
import { UnAuthorizedError } from "../../../common/auth/errors.ts";
import { RestaurantEntity } from "../entity/restaurant.entity.ts";
import { RestaurantStatus } from "../enums.ts";
import { RestaurantNotFoundError } from "../errors.ts";
import type {
  CreateRestaurantDTO,
  UpdateRestaurantDTO,
  UpdateRestaurantStatusDTO,
} from "../dto/restaurant.dto.ts";
import {
  createRestaurant,
  findAllRestaurants,
  findRestaurantById,
  updateRestaurantById,
  updateRestaurantStatus,
} from "../repository/restaurant.repo.ts";
import { userService, UserService } from "../../user/service/user.service.ts";
import {
  memberService,
  MemberService,
} from "../../rbac/service/member.service.ts";

function toPublicRestaurant(restaurant: RestaurantEntity) {
  return {
    id: restaurant.id,
    ownerId: restaurant.ownerId,
    name: restaurant.name,
    logoURL: restaurant.logoURL,
    primaryCountry: restaurant.primaryCountry,
    status: restaurant.status,
    createdAt: restaurant.createdAt,
    updatedAt: restaurant.updatedAt,
  };
}

export class RestaurantService {
  constructor(
    private readonly userService: UserService,
    private readonly memberService: MemberService,
  ) {}

  create = async (userId: number, data: RegisterRestaurantDTO, trx: Knex) => {
    const now = new Date();
    const restaurant = new RestaurantEntity({
      ownerId: userId,
      name: data.name,
      logoURL: data.logoURL,
      primaryCountry: data.primaryCountry,
      status: RestaurantStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      statusUpdatedAt: now,
    });
    const result = await createRestaurant(restaurant, trx);

    return result;
  };

  findAll = async () => {
    const result = await findAllRestaurants();
    return result;
  };

  findById = async (id: number) => {
    const restaurant = await findRestaurantById(id);
    if (!restaurant) {
      throw RestaurantNotFoundError;
    }
    return toPublicRestaurant(restaurant);
  };

  createWithOwner = async (userRole: SystemRole, data: CreateRestaurantDTO) => {
    if (userRole !== SystemRole.SYSTEM_ADMIN) {
      throw UnAuthorizedError;
    }

    const now = new Date();
    const trx = await db.transaction();

    try {
      const user = await this.userService.create(
        {
          email: data.owner.email,
          phone: data.owner.phone,
          name: data.owner.name,
          password: data.owner.password,
          systemRole: SystemRole.RESTAURANT_USER,
        },
        trx,
      );

      const restaurant = await createRestaurant(
        new RestaurantEntity({
          ownerId: user.id,
          name: data.name,
          logoURL: data.logoUrl ?? "",
          primaryCountry: data.primaryCountry,
          status: RestaurantStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          statusUpdatedAt: now,
        }),
        trx,
      );

      await this.memberService.createOwnerMember(restaurant.id, user.id, trx);

      await trx.commit();

      return {
        restaurant,
        owner: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          systemRole: user.systemRole,
        },
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  };

  update = async (
    id: number,
    userId: number,
    role: SystemRole,
    data: UpdateRestaurantDTO,
  ) => {
    const restaurant = await findRestaurantById(id);
    if (!restaurant) {
      throw RestaurantNotFoundError;
    }

    if (role !== SystemRole.SYSTEM_ADMIN && restaurant.ownerId !== userId) {
      throw UnAuthorizedError;
    }

    const updated = await updateRestaurantById(id, {
      name: data.name,
      logoURL: data.logoUrl,
      primaryCountry: data.primaryCountry,
    });

    return {
      message: "Restaurant updated successfully",
      restaurant: {
        id: updated!.id,
        name: updated!.name,
        logoURL: updated!.logoURL,
        primaryCountry: updated!.primaryCountry,
        status: updated!.status,
        updatedAt: updated!.updatedAt,
      },
    };
  };

  updateStatus = async (
    role: SystemRole,
    id: number,
    data: UpdateRestaurantStatusDTO,
  ) => {
    if (role !== SystemRole.SYSTEM_ADMIN) {
      throw UnAuthorizedError;
    }

    const restaurant = await findRestaurantById(id);
    if (!restaurant) {
      throw RestaurantNotFoundError;
    }

    const updated = await updateRestaurantStatus(id, data.status);

    return {
      message: "Restaurant status updated successfully",
      restaurant: {
        id: updated!.id,
        status: updated!.status,
      },
    };
  };
}

export const restaurantService = new RestaurantService(
  userService,
  memberService,
);
