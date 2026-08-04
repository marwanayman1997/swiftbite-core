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

  createWithOwner = async (role: SystemRole, data: CreateRestaurantDTO) => {
    if (role !== SystemRole.SYSTEM_ADMIN) {
      throw UnAuthorizedError;
    }

    const existing = await findUserExistsByEmailOrPhone(
      data.owner.email,
      data.owner.phone,
    );
    if (existing) {
      throw UserAlreadyExistsError;
    }

    const hashedPassword = await hashPassword(data.owner.password);
    const now = new Date();

    const trx = await db.transaction();
    let owner;
    let restaurant;
    try {
      owner = await createUser(
        {
          email: data.owner.email,
          phone: data.owner.phone,
          name: data.owner.name,
          passwordHash: hashedPassword,
          systemRole: SystemRole.RESTAURANT_USER,
          createdAt: now,
          updatedAt: now,
        },
        trx,
      );

      restaurant = await this.create(
        owner.id,
        {
          name: data.name,
          logoURL: data.logoUrl,
          primaryCountry: data.primaryCountry,
        },
        trx,
      );

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    return {
      message: "Restaurant created successfully",
      restaurant: {
        id: restaurant.id,
        ownerId: restaurant.ownerId,
        name: restaurant.name,
        logoURL: restaurant.logoURL,
        primaryCountry: restaurant.primaryCountry,
        status: restaurant.status,
        createdAt: restaurant.createdAt,
      },
      owner: {
        id: owner.id,
        email: owner.email,
        phone: owner.phone,
        name: owner.name,
        systemRole: owner.systemRole,
      },
    };
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

export const restaurantService = new RestaurantService();
