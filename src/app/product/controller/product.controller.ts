import { Request, Response, NextFunction } from "express";
import { validateBody } from "../../../lib/validation/validate.ts";
import { SystemRole } from "../../user/enums.ts";
import { CreateProductDTO, UpdateProductDTO } from "../dto/product.dto.ts";
import { ProductService } from "../service/product.service.ts";
import { sendPaginated, sendSuccess } from "../../../lib/http/response.ts";
import {
  parseFilters,
  parsePaginationQuery,
} from "../../../lib/http/pagination/parse-query.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";

const PRODUCT_SORT_FIELDS = ["created_at", "name"];
const PRODUCT_FILTER_FIELDS = ["category_id"];

const BRANCH_PRODUCT_SORT_FIELDS = ["p.created_at", "p.name", "pbd.price", "pbd.stock"];
const BRANCH_PRODUCT_FILTER_FIELDS = ["p.category_id", "pbd.is_available", "pbd.price"];

@injectable()
export class ProductController {
  constructor(
    @inject(TOKENS.ProductService)
    private readonly productService: ProductService,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(CreateProductDTO, req.body);
      const product = await this.productService.create(
        Number(req.params.restaurantId),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        data,
      );
      sendSuccess(res, { message: "Product created successfully", product }, 201);
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
        allowedSortFields: PRODUCT_SORT_FIELDS,
        defaultSortBy: "created_at",
      });
      const filters = parseFilters(req.query, PRODUCT_FILTER_FIELDS);
      const { data, meta } = await this.productService.findByRestaurant(
        Number(req.params.restaurantId),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        pagination,
        filters,
      );
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  };

  findCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.productService.findCategories(
        Number(req.params.restaurantId),
      );
      sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  };

  findByBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req.query, {
        allowedSortFields: BRANCH_PRODUCT_SORT_FIELDS,
        defaultSortBy: "p.created_at",
      });
      const filters = parseFilters(req.query, BRANCH_PRODUCT_FILTER_FIELDS);
      const { data, meta } = await this.productService.findByBranch(
        Number(req.params.branchId),
        pagination,
        filters,
      );
      sendPaginated(res, data, meta);
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await this.productService.findById(Number(req.params.id));
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await validateBody(UpdateProductDTO, req.body);
      const branchId = req.query.branchId
        ? Number(req.query.branchId)
        : undefined;
      const result = await this.productService.update(
        Number(req.params.id),
        req.user?.userId!,
        req.user?.role! as SystemRole,
        data,
        branchId,
      );
      sendSuccess(res, { message: "Product updated successfully", ...result });
    } catch (err) {
      next(err);
    }
  };
}
