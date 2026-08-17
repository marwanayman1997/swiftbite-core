import { UnAuthorizedError } from "../../../lib/auth/errors.ts";
import { RestaurantNotFoundError } from "../../restaurant/errors.ts";
import { findRestaurantById } from "../../restaurant/repository/restaurant.repo.ts";
import { BranchDetailsNotFoundError, ProductNotFoundError } from "../errors.ts";
import { SystemRole } from "../../user/enums.ts";
import { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto.ts";
import {
  createProduct,
  findProductById,
  findProductsByBranch,
  findProductsByRestaurant,
  updateProduct,
} from "../repository/product.repository.ts";
import {
  findCategoryByName,
  findCategoriesByRestaurant,
  createCategory,
} from "../repository/category.repository.ts";
import { updateBranchDetails } from "../repository/product-branch-details.repository.ts";
import { injectable } from "tsyringe";
import type {
  FilterParams,
  PaginationParams,
} from "../../../lib/http/pagination/cursor-pagination.ts";
import { db } from "../../../lib/knex/knex.ts";
import { insertOutboxEvent } from "../../../lib/events/outbox.repo.ts";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class ProductService {
  create = async (
    restaurantId: number,
    userId: number,
    userRole: SystemRole,
    data: CreateProductDTO,
  ) => {
    const restaurant = await findRestaurantById(restaurantId);
    if (!restaurant) throw RestaurantNotFoundError;
    if (
      userRole !== SystemRole.SYSTEM_ADMIN &&
      Number(restaurant.ownerId) !== Number(userId)
    ) {
      throw UnAuthorizedError;
    }

    let categoryId: number | null = null;
    if (data.categoryName) {
      let category = await findCategoryByName(restaurantId, data.categoryName);
      if (!category) {
        category = await createCategory(restaurantId, data.categoryName);
      }
      categoryId = category.id;
    }

    return await createProduct({
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      restaurantId,
      categoryId,
    });
  };

  findByRestaurant = async (
    restaurantId: number,
    userId: number,
    userRole: SystemRole,
    pagination: PaginationParams,
    filters: FilterParams[],
  ) => {
    const restaurant = await findRestaurantById(restaurantId);
    if (!restaurant) throw RestaurantNotFoundError;
    if (
      userRole !== SystemRole.SYSTEM_ADMIN &&
      Number(restaurant.ownerId) !== Number(userId)
    ) {
      throw UnAuthorizedError;
    }
    return await findProductsByRestaurant(restaurantId, pagination, filters);
  };

  findCategories = async (restaurantId: number) => {
    return await findCategoriesByRestaurant(restaurantId);
  };

  findByBranch = async (
    branchId: number,
    pagination: PaginationParams,
    filters: FilterParams[],
  ) => {
    return await findProductsByBranch(branchId, pagination, filters);
  };

  findById = async (id: number) => {
    const product = await findProductById(id);
    if (!product) {
      throw ProductNotFoundError;
    }
    return product;
  };

  update = async (
    productId: number,
    userId: number,
    userRole: SystemRole,
    data: UpdateProductDTO,
    branchId?: number,
  ) => {
    const product = await findProductById(productId);
    if (!product) {
      throw ProductNotFoundError;
    }

    const restaurant = await findRestaurantById(product.restaurantId);
    if (!restaurant) throw RestaurantNotFoundError;
    if (
      userRole !== SystemRole.SYSTEM_ADMIN &&
      Number(restaurant.ownerId) !== Number(userId)
    ) {
      throw UnAuthorizedError;
    }

    let categoryId: number | undefined = undefined;
    if (data.categoryName) {
      let category = await findCategoryByName(
        product.restaurantId,
        data.categoryName,
      );
      if (!category) {
        category = await createCategory(
          product.restaurantId,
          data.categoryName,
        );
      }
      categoryId = category.id;
    }

    const updatedProduct = await updateProduct(productId, {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      categoryId,
    });

    let branchDetails;
    if (
      branchId &&
      (data.price !== undefined ||
        data.stock !== undefined ||
        data.isAvailable !== undefined)
    ) {
      const trx = await db.transaction();
      try {
        branchDetails = await updateBranchDetails(
          branchId,
          productId,
          {
            price: data.price,
            stock: data.stock,
            isAvailable: data.isAvailable,
          },
          trx,
        );
        if (!branchDetails) {
          throw BranchDetailsNotFoundError;
        }

        if (data.price !== undefined) {
          await insertOutboxEvent(trx, {
            aggregateType: "product_branch_details",
            aggregateId: branchDetails.id,
            eventType: "product.price.changed",
            eventId: uuidv4(),
            payload: { branchId, productId, price: branchDetails.price },
          });
        }
        if (data.stock !== undefined) {
          await insertOutboxEvent(trx, {
            aggregateType: "product_branch_details",
            aggregateId: branchDetails.id,
            eventType: "product.stock.changed",
            eventId: uuidv4(),
            payload: { branchId, productId, stock: branchDetails.stock },
          });
        }

        await trx.commit();
      } catch (err) {
        await trx.rollback();
        throw err;
      }
    }

    return { product: updatedProduct, branchDetails };
  };
}
