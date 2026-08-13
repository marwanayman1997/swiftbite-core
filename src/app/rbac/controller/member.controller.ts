import { NextFunction, Response, Request } from "express";
import { validateBody } from "../../../lib/validation/validate.ts";
import {
  CreateMemberDTO,
  UpdateMemberBranchesDTO,
  UpdateMemberDTO,
} from "../dto/member.dto.ts";
import { MemberService } from "../service/member.service.ts";
import { sendPaginated, sendSuccess } from "../../../lib/http/response.ts";
import {
  parseFilters,
  parsePaginationQuery,
} from "../../../lib/http/pagination/parse-query.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";

const MEMBER_SORT_FIELDS = ["rm.created_at", "u.name"];
const MEMBER_FILTER_FIELDS = ["rm.status", "r.name"];

@injectable()
export class MemberController {
  constructor(
    @inject(TOKENS.MemberService)
    private readonly memberService: MemberService,
  ) {}

  createMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(CreateMemberDTO, req.body);
      const result = await this.memberService.createMember(
        Number(req.params.restaurantId),
        data,
      );
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req.query, {
        allowedSortFields: MEMBER_SORT_FIELDS,
        defaultSortBy: "rm.created_at",
      });
      const filters = parseFilters(req.query, MEMBER_FILTER_FIELDS);
      const { data, meta } = await this.memberService.listMembers(
        Number(req.params.restaurantId),
        pagination,
        filters,
      );
      sendPaginated(res, data, meta);
    } catch (error) {
      next(error);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(UpdateMemberDTO, req.body);
      const result = await this.memberService.updateMember(
        Number(req.params.restaurantId),
        Number(req.params.memberId),
        data,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  deleteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.memberService.deleteMember(
        Number(req.params.restaurantId),
        Number(req.params.memberId),
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateMemberBranches = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await validateBody(UpdateMemberBranchesDTO, req.body);
      const result = await this.memberService.updateMemberBranches(
        Number(req.params.restaurantId),
        Number(req.params.memberId),
        data,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getRolePermissions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.memberService.getRolePermissions(
        req.params.role as string,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
