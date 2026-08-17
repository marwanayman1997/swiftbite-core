import { injectable } from "tsyringe";
import { UnAuthorizedError } from "../../../lib/auth/errors.ts";
import { RestaurantNotFoundError } from "../../restaurant/errors.ts";
import { findRestaurantById } from "../../restaurant/repository/restaurant.repo.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  CreateBranchDTO,
  UpdateBranchDTO,
  UpdateBranchStatusDTO,
} from "../dto/branch.dto.ts";
import { Branch } from "../entity/branch.entity.ts";
import { BranchNotFoundError } from "../errors.ts";
import {
  createBranch,
  findBranchById,
  findBranchesByRestaurant,
  findNearbyBranches,
  updateBranchById,
  updateBranchStatus,
} from "../repository/branch.repo.ts";
import type {
  FilterParams,
  PaginationParams,
} from "../../../lib/http/pagination/cursor-pagination.ts";
import { db } from "../../../lib/knex/knex.ts";
import { insertOutboxEvent } from "../../../lib/events/outbox.repo.ts";
import { v4 as uuidv4 } from "uuid";

function toPublicBranch(branch: Branch) {
  return {
    id: branch.id,
    restaurantId: branch.restaurantId,
    label: branch.label,
    countryCode: branch.countryCode,
    addressText: branch.addressText,
    lat: branch.lat,
    lng: branch.lng,
    isActive: branch.isActive,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
    acceptOrders: branch.acceptOrders,
    deliveryRadius: branch.deliveryRadius,
    currency: branch.currency,
    commission: branch.commission,
  };
}

function toPublicBranchWithTimestamp(branch: Branch) {
  return {
    ...toPublicBranch(branch),
    updatedAt: branch.updatedAt,
  };
}

@injectable()
export class BranchService {
  findNearby = async (lat: number, lng: number) => {
    const rows = await findNearbyBranches(lat, lng);

    return rows;
  };

  findByRestaurant = async (
    restaurantId: number,
    pagination: PaginationParams,
    filters: FilterParams[],
  ) => {
    const { data, meta } = await findBranchesByRestaurant(
      restaurantId,
      pagination,
      filters,
    );
    return { data: data.map(toPublicBranch), meta };
  };

  create = async (
    restaurantId: number,
    userId: number,
    userRole: SystemRole,
    data: CreateBranchDTO,
  ) => {
    const restaurant = await findRestaurantById(restaurantId);

    if (!restaurant) {
      throw RestaurantNotFoundError;
    }

    if (
      userRole != SystemRole.SYSTEM_ADMIN &&
      Number(restaurant.ownerId) !== Number(userId)
    ) {
      throw UnAuthorizedError;
    }

    const now = new Date();
    const branch = await createBranch({
      restaurantId: restaurantId,
      label: data.label,
      countryCode: data.countryCode,
      lat: data.lat,
      lng: data.lng,
      addressText: data.addressText,
      isActive: false,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
      currency: data.currency,
      deliveryRadius: data.deliveryRadius,
      commission: 0,
      createdAt: now,
      updatedAt: now,
      acceptOrders: true,
    });

    return branch;
  };

  update = async (
    id: number,
    userId: number,
    userRole: SystemRole,
    data: UpdateBranchDTO,
  ) => {
    const branch = await findBranchById(id);
    if (!branch) {
      throw BranchNotFoundError;
    }

    const restaurant = await findRestaurantById(branch.restaurantId);
    if (!restaurant) {
      throw RestaurantNotFoundError;
    }

    if (
      userRole != SystemRole.SYSTEM_ADMIN &&
      Number(restaurant.ownerId) !== Number(userId)
    ) {
      throw UnAuthorizedError;
    }

    const trx = await db.transaction();
    let updated;
    try {
      updated = await updateBranchById(
        id,
        {
          label: data.label,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          opensAt: data.opensAt,
          closesAt: data.closesAt,
          deliveryRadius: data.deliveryRadius,
          currency: data.currency,
          acceptOrders: data.acceptOrders,
        },
        trx,
      );

      await insertOutboxEvent(trx, {
        aggregateType: "restaurant_branch",
        aggregateId: id,
        eventType: "branch.updated",
        eventId: uuidv4(),
        payload: { branchId: id },
      });

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    return {
      message: "Branch updated successfully",
      branch: toPublicBranchWithTimestamp(updated!),
    };
  };

  updateStatus = async (
    role: SystemRole,
    id: number,
    data: UpdateBranchStatusDTO,
  ) => {
    if (role !== SystemRole.SYSTEM_ADMIN) {
      throw UnAuthorizedError;
    }

    const branch = await findBranchById(id);
    if (!branch) {
      throw BranchNotFoundError;
    }

    const trx = await db.transaction();
    let updated;
    try {
      updated = await updateBranchStatus(
        id,
        { isActive: data.isActive, commission: data.commission },
        trx,
      );

      const eventType =
        data.isActive === false ? "branch.deactivated" : "branch.updated";
      await insertOutboxEvent(trx, {
        aggregateType: "restaurant_branch",
        aggregateId: id,
        eventType,
        eventId: uuidv4(),
        payload: { branchId: id, isActive: updated!.isActive },
      });

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    return {
      message: "Branch status updated successfully",
      branch: {
        id: updated!.id,
        isActive: updated!.isActive,
        acceptOrders: updated!.acceptOrders,
        commission: updated!.commission,
      },
    };
  };
}
