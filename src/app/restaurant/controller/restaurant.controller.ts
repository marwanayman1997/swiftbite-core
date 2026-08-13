import { NextFunction, Request, Response } from "express";
import { RestaurantService } from "../service/restaurant.service.ts";
import {
  validateBody,
  validateParams,
} from "../../../lib/validation/validate.ts";
import {
  CreateRestaurantDTO,
  RestaurantIdParamDTO,
  UpdateRestaurantDTO,
  UpdateRestaurantStatusDTO,
} from "../dto/restaurant.dto.ts";
import type { SystemRole } from "../../user/enums.ts";
import { TOKENS } from "../../../lib/di/tokens.ts";
import { sendPaginated, sendSuccess } from "../../../lib/http/response.ts";
import {
  parseFilters,
  parsePaginationQuery,
} from "../../../lib/http/pagination/parse-query.ts";
import { inject, injectable } from "tsyringe";

const RESTAURANT_SORT_FIELDS = ["created_at", "name", "status"];
const RESTAURANT_FILTER_FIELDS = ["status", "primary_country"];

@injectable()
export class RestaurantController {
  constructor(
    @inject(TOKENS.RestaurantService)
    private readonly restaurantService: RestaurantService,
  ) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req.query, {
        allowedSortFields: RESTAURANT_SORT_FIELDS,
        defaultSortBy: "created_at",
      });
      const filters = parseFilters(req.query, RESTAURANT_FILTER_FIELDS);
      const { data, meta } = await this.restaurantService.findAll(
        pagination,
        filters,
      );
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = await validateParams(RestaurantIdParamDTO, req.params);
      const restaurant = await this.restaurantService.findById(
        Number(params.id),
      );
      sendSuccess(res, restaurant);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(CreateRestaurantDTO, req.body);
      const result = await this.restaurantService.createWithOwner(
        req.user?.role! as SystemRole,
        data,
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = await validateParams(RestaurantIdParamDTO, req.params);
      const data = await validateBody(UpdateRestaurantDTO, req.body);
      const result = await this.restaurantService.update(
        Number(params.id),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        data,
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = await validateParams(RestaurantIdParamDTO, req.params);
      const data = await validateBody(UpdateRestaurantStatusDTO, req.body);
      const result = await this.restaurantService.updateStatus(
        req.user?.role! as SystemRole,
        Number(params.id),
        data,
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}
