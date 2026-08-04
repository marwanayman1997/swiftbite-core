import { db } from "../../../common/knex/knex.ts";
import {
  restaurantService,
  RestaurantService,
} from "../../restaurant/service/restaurant.service.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  findUserByEmail,
  findUserExistsByEmailOrPhone,
  createUser,
  updateUserPassword,
} from "../../user/repository/users.repo.ts";
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

export class AuthService {
  constructor(private readonly restaurantService: RestaurantService) {}

  register = async (data: RegisterDTO) => {
    if (data.role == SystemRole.SYSTEM_ADMIN) {
      throw CannotSignupAsSystemAdmin;
    }

    const existing = await findUserExistsByEmailOrPhone(data.email, data.phone);

    if (existing) {
      throw UserAlreadyExistsError;
    }

    const hashedPassword = await hashPassword(data.password);

    const now = new Date();

    const trx = await db.transaction();
    let user;
    let restaurant;
    try {
      user = await createUser(
        {
          email: data.email,
          phone: data.phone,
          name: data.name,
          passwordHash: hashedPassword,
          systemRole: data.role,
          createdAt: now,
          updatedAt: now,
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
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    const payload = { userId: user.id, role: data.role, email: user.email };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    return {
      message: "User successfully registered",
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

  login = async (data: LoginDTO) => {
    const user = await findUserByEmail(data.email);

    if (!user) {
      throw IncorrectCredentials;
    }

    const match = await comparePassword(data.password, user.passwordHash);
    if (!match) {
      throw IncorrectCredentials;
    }

    const payload = {
      userId: user.id,
      role: user.systemRole,
      email: user.email,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);
    return {
      message: "Login successful",
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
    // TODO: send email
    console.log(`Mocked email sent ${otp}`);
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
    });
    return { accessToken };
  };
}

export const authService = new AuthService(restaurantService);
