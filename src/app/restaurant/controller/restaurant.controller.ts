import { NextFunction, Request, Response } from "express";
import {
  RestaurantService,
  restaurantService,
} from "../service/restaurant.service.ts";
import {
  validateBody,
  validateParams,
} from "../../../common/validation/validate.ts";
import {
  CreateRestaurantDTO,
  RestaurantIdParamDTO,
  UpdateRestaurantDTO,
  UpdateRestaurantStatusDTO,
} from "../dto/restaurant.dto.ts";
import type { SystemRole } from "../../user/enums.ts";

export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.restaurantService.findAll();
      res.status(200).json({ data: result });
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
      res.status(200).json(restaurant);
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
      res.status(201).json(result);
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
      res.status(200).json(result);
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
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const restaurantController = new RestaurantController(restaurantService);
