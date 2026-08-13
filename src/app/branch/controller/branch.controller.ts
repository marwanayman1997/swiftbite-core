import { Request, Response, NextFunction } from "express";
import {
  validateBody,
  validateParams,
} from "../../../lib/validation/validate.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  BranchIdParamDTO,
  CreateBranchDTO,
  UpdateBranchDTO,
  UpdateBranchStatusDTO,
} from "../dto/branch.dto.ts";
import { BranchService } from "../service/branch.service.ts";
import { sendPaginated, sendSuccess } from "../../../lib/http/response.ts";
import {
  parseFilters,
  parsePaginationQuery,
} from "../../../lib/http/pagination/parse-query.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";

const BRANCH_SORT_FIELDS = ["created_at", "label"];
const BRANCH_FILTER_FIELDS = ["is_active", "currency"];

@injectable()
export class BranchController {
  constructor(
    @inject(TOKENS.BranchService)
    private readonly branchService: BranchService,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(CreateBranchDTO, req.body);
      const branch = await this.branchService.create(
        Number(req.params.restaurantId),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        data,
      );
      sendSuccess(res, { message: "Branch created successfully", branch }, 201);
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
      sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  };

  findByRestaurant = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const pagination = parsePaginationQuery(req.query, {
        allowedSortFields: BRANCH_SORT_FIELDS,
        defaultSortBy: "created_at",
      });
      const filters = parseFilters(req.query, BRANCH_FILTER_FIELDS);
      const { data, meta } = await this.branchService.findByRestaurant(
        Number(req.params.restaurantId),
        pagination,
        filters,
      );
      sendPaginated(res, data, meta);
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
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}
