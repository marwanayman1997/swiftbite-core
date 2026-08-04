import { Request, Response, NextFunction } from "express";
import {
  validateBody,
  validateParams,
} from "../../../common/validation/validate.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  BranchIdParamDTO,
  CreateBranchDTO,
  UpdateBranchDTO,
  UpdateBranchStatusDTO,
} from "../dto/branch.dto.ts";
import { BranchService, branchService } from "../service/branch.service.ts";

export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(CreateBranchDTO, req.body);
      const branch = await this.branchService.create(
        Number(req.params.restaurantId),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        data,
      );
      res.status(201).json({ message: "Branch added successfully", branch });
    } catch (err) {
      next(err);
    }
  };

  findNearby = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.branchService.findNearby(
        Number(req.query.lat),
        Number(req.query.lng),
      );
      res.status(200).json({ data: results });
    } catch (err) {
      next(err);
    }
  };

  findByRestaurant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.branchService.findByRestaurant(
        Number(req.params.restaurantId),
      );
      res.status(200).json({ data: results });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = await validateParams(BranchIdParamDTO, req.params);
      const data = await validateBody(UpdateBranchDTO, req.body);
      const result = await this.branchService.update(
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
      const params = await validateParams(BranchIdParamDTO, req.params);
      const data = await validateBody(UpdateBranchStatusDTO, req.body);
      const result = await this.branchService.updateStatus(
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

export const branchController = new BranchController(branchService);
