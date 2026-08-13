import { container } from "tsyringe";
import { cacheProvider } from "../cache/init.ts";
import { emailProvider } from "../email/init.ts";
import { TOKENS } from "./tokens.ts";
import { Logger } from "../logger/logger.ts";
import { AuthController } from "../../app/auth/controller/auth.controller.ts";
import { AuthService } from "../../app/auth/service/auth.service.ts";
import { BranchController } from "../../app/branch/controller/branch.controller.ts";
import { BranchService } from "../../app/branch/service/branch.service.ts";
import { CustomerAddressController } from "../../app/customer-address/controller/customer-address.controller.ts";
import { CustomerAddressService } from "../../app/customer-address/service/customer-address.service.ts";
import { ProductController } from "../../app/product/controller/product.controller.ts";
import { ProductService } from "../../app/product/service/product.service.ts";
import { MemberController } from "../../app/rbac/controller/member.controller.ts";
import { MemberService } from "../../app/rbac/service/member.service.ts";
import { RestaurantController } from "../../app/restaurant/controller/restaurant.controller.ts";
import { RestaurantService } from "../../app/restaurant/service/restaurant.service.ts";
import { UserController } from "../../app/user/controller/user.controller.ts";
import { UserService } from "../../app/user/service/user.service.ts";
import { PermissionCacheService } from "../../app/rbac/service/permission-cache.service.ts";

container.registerSingleton<Logger>(TOKENS.Logger, Logger);

container.registerSingleton<UserService>(TOKENS.UserService, UserService);
container.registerSingleton<RestaurantService>(
  TOKENS.RestaurantService,
  RestaurantService,
);
container.registerSingleton<BranchService>(TOKENS.BranchService, BranchService);
container.registerSingleton<ProductService>(
  TOKENS.ProductService,
  ProductService,
);
container.registerSingleton<MemberService>(TOKENS.MemberService, MemberService);
container.registerSingleton<CustomerAddressService>(
  TOKENS.CustomerAddressService,
  CustomerAddressService,
);
container.registerSingleton<PermissionCacheService>(
  TOKENS.PermissionCacheService,
  PermissionCacheService,
);
container.registerSingleton<AuthService>(TOKENS.AuthService, AuthService);

container.registerSingleton<AuthController>(
  TOKENS.AuthController,
  AuthController,
);
container.registerSingleton<UserController>(
  TOKENS.UserController,
  UserController,
);
container.registerSingleton<RestaurantController>(
  TOKENS.RestaurantController,
  RestaurantController,
);
container.registerSingleton<BranchController>(
  TOKENS.BranchController,
  BranchController,
);
container.registerSingleton<ProductController>(
  TOKENS.ProductController,
  ProductController,
);
container.registerSingleton<MemberController>(
  TOKENS.MemberController,
  MemberController,
);
container.registerSingleton<CustomerAddressController>(
  TOKENS.CustomerAddressController,
  CustomerAddressController,
);

container.registerInstance(TOKENS.CacheProvider, cacheProvider);
container.registerInstance(TOKENS.EmailProvider, emailProvider);

export { container };
