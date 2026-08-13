import { db } from "../../../lib/knex/knex.ts";
import {
  activateMemberByUserId,
  findRestaurantMemberWithRole,
} from "../../rbac/repository/restaurant_member.repo.ts";
import { findBranchIdsByMemberId } from "../../rbac/repository/member-branch.repo.ts";
import { MemberService } from "../../rbac/service/member.service.ts";
import { RestaurantService } from "../../restaurant/service/restaurant.service.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  findUserByEmail,
  updateUserPassword,
} from "../../user/repository/users.repo.ts";
import { UserService } from "../../user/service/user.service.ts";
import {
  ForgetPasswordDTO,
  LoginDTO,
  RegisterDTO,
  ResetPasswordDTO,
} from "../dto/auth.dto.ts";
import {
  UserAlreadyExistsError,
  CannotSignupAsSystemAdmin,
  IncorrectCredentials,
  InvalidOTPError,
  RestaurantDataRequiredError,
} from "../errors.ts";
import {
  createPasswordReset,
  findLatestPasswordResetByUserId,
  updatePasswordResetConsumedAt,
} from "../repository/password-reset.repo.ts";
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  comparePassword,
  generateOTP,
  hashOTP,
  verifyRefreshToken,
} from "../utils.ts";
import { passwordResetEmail } from "../templates/password-reset.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";
import type { IEmailProvider } from "../../../pkg/email/email.interface.ts";

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.RestaurantService)
    private readonly restaurantService: RestaurantService,
    @inject(TOKENS.UserService)
    private readonly userService: UserService,
    @inject(TOKENS.MemberService)
    private readonly memberService: MemberService,
    @inject(TOKENS.EmailProvider)
    private readonly emailProvider: IEmailProvider,
  ) {}

  register = async (data: RegisterDTO) => {
    if (data.role == SystemRole.SYSTEM_ADMIN) {
      throw CannotSignupAsSystemAdmin;
    }

    const trx = await db.transaction();
    let user;
    let restaurant;
    let restaurantMemberInfo: {
      restaurantId?: number;
      restaurantRole?: string;
      branchIds?: number[];
    } = {};

    try {
      user = await this.userService.create(
        {
          email: data.email,
          phone: data.phone,
          name: data.name,
          password: data.password,
          systemRole: data.role,
        },
        trx,
      );

      if (data.role == SystemRole.RESTAURANT_USER) {
        if (data.restaurant == undefined) {
          throw RestaurantDataRequiredError;
        }

        restaurant = await this.restaurantService.create(
          user.id,
          data.restaurant,
          trx,
        );

        await this.memberService.createOwnerMember(restaurant.id, user.id, trx);
        restaurantMemberInfo = {
          restaurantId: restaurant.id,
          restaurantRole: "owner",
          branchIds: [],
        };
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    const payload = {
      userId: user.id,
      role: data.role,
      email: user.email,
      ...restaurantMemberInfo,
    };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    return {
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        systemRole: user.systemRole,
        createdAt: user.createdAt,
      },
      restaurant,
    };
  };

  private getRestaurantMemberContext = async (
    userId: number,
  ): Promise<{
    restaurantId?: number;
    restaurantRole?: string;
    branchIds?: number[];
  }> => {
    const result = await findRestaurantMemberWithRole(userId);
    if (!result) {
      return {};
    }
    const branchIds = await findBranchIdsByMemberId(result.member.id);
    return {
      restaurantId: result.member.restaurantId,
      restaurantRole: result.roleName,
      branchIds,
    };
  };

  login = async (data: LoginDTO) => {
    const user = await findUserByEmail(data.email);

    if (!user) {
      throw IncorrectCredentials;
    }

    const match = await comparePassword(data.password, user.passwordHash);
    if (!match) {
      throw IncorrectCredentials;
    }

    const restaurantMemberInfo = await this.getRestaurantMemberContext(user.id);

    const payload = {
      userId: user.id,
      role: user.systemRole,
      email: user.email,
      ...restaurantMemberInfo,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);
    return {
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        systemRole: user.systemRole,
        createdAt: user.createdAt,
      },
    };
  };

  forgetPassword = async (data: ForgetPasswordDTO) => {
    const user = await findUserByEmail(data.email);
    if (!user) {
      return;
    }
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await createPasswordReset({
      userId: user.id,
      otpHash: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
    });
    const email = passwordResetEmail(otp);
    await this.emailProvider.send(data.email, email.subject, email.html);
  };

  resetPassword = async (data: ResetPasswordDTO) => {
    const user = await findUserByEmail(data.email);

    if (!user) {
      throw InvalidOTPError;
    }

    const reset = await findLatestPasswordResetByUserId(user.id);

    if (!reset) {
      throw InvalidOTPError;
    }

    const inputOTPHash = hashOTP(data.otp);
    if (inputOTPHash != reset.otpHash || reset.isExpired()) {
      throw InvalidOTPError;
    }

    const hashedPassword = await hashPassword(data.newPassword);
    await updateUserPassword(user.id, hashedPassword);
    await updatePasswordResetConsumedAt(reset.id);

    return user;
  };

  acceptInvite = async (data: ResetPasswordDTO) => {
    const user = await this.resetPassword(data);
    await activateMemberByUserId(user.id);
  };

  refresh = async (refreshToken: string) => {
    if (!refreshToken) {
      throw IncorrectCredentials;
    }
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = createAccessToken({
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      restaurantId: payload.restaurantId,
      restaurantRole: payload.restaurantRole,
      branchIds: payload.branchIds,
    });
    return { accessToken };
  };
}
