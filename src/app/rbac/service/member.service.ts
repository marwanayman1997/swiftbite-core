import { Knex } from "knex";
import { db } from "../../../lib/knex/knex.ts";
import { toMs } from "../../../pkg/utils/time.ts";
import { UserAlreadyExistsError } from "../../auth/errors.ts";
import { createPasswordReset } from "../../auth/repository/password-reset.repo.ts";
import { generateOTP, hashOTP } from "../../auth/utils.ts";
import { SystemRole } from "../../user/enums.ts";
import {
  findUserByEmail,
  createUser,
} from "../../user/repository/users.repo.ts";
import {
  CreateMemberDTO,
  UpdateMemberBranchesDTO,
  UpdateMemberDTO,
} from "../dto/member.dto.ts";
import { MemberBranch } from "../entity/member-branch.entity.ts";
import { RestaurantMember } from "../entity/restaurant-member.entity.ts";
import { MemberStatus } from "../enums.ts";
import {
  CannotCreateOwnerUserError,
  CannotDeleteOwnerError,
  InvalidBranchIdsError,
  MemberNotFoundError,
  OwnerBranchAssignmentError,
  RoleNotFoundError,
} from "../errors.ts";
import {
  countBranchesByIdsAndRestaurant,
  setMemberBranches,
} from "../repository/member-branch.repo.ts";
import {
  createRestaurantMember,
  deleteMember,
  findMembersByRestaurantId,
  findMemberWithRoleName,
  updateMember,
} from "../repository/restaurant_member.repo.ts";
import { findRoleByName } from "../repository/role.repo.ts";
import { UserService } from "../../user/service/user.service.ts";
import { AppError } from "../../../lib/error/AppError.ts";
import { getPermissionsDetailsByRoleName } from "../repository/permission.repo.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../../lib/di/tokens.ts";
import type {
  FilterParams,
  PaginationParams,
} from "../../../lib/http/pagination/cursor-pagination.ts";

@injectable()
export class MemberService {
  constructor(
    @inject(TOKENS.UserService) private readonly userService: UserService,
  ) {}

  async createOwnerMember(
    restaurantId: number,
    userId: number,
    trx?: Knex.Transaction,
  ): Promise<RestaurantMember> {
    const ownerRoleId = await findRoleByName("owner", trx);
    if (!ownerRoleId) throw RoleNotFoundError;
    const now = new Date();
    return createRestaurantMember(
      {
        restaurantId,
        userId,
        roleId: ownerRoleId,
        status: MemberStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      },
      trx,
    );
  }

  async createMember(restaurantId: number, data: CreateMemberDTO) {
    if (data.role == "owner") {
      throw CannotCreateOwnerUserError;
    }

    const roleId = await findRoleByName(data.role);
    if (!roleId) {
      throw RoleNotFoundError;
    }

    const branchIds = data.branchIds || [];
    await this.validateBranchOwnership(branchIds, restaurantId);

    const trx = await db.transaction();
    try {
      const now = new Date();
      const user = await this.userService.create(
        {
          email: data.email,
          phone: data.phoneNumber,
          name: data.name,
          password: "",
          systemRole: SystemRole.RESTAURANT_USER,
        },
        trx,
      );

      const member = await createRestaurantMember(
        {
          restaurantId,
          userId: user.id,
          roleId,
          createdAt: now,
          updatedAt: now,
          status: MemberStatus.INACTIVE,
        },
        trx,
      );

      const rows = branchIds.map(
        (branchId) =>
          new MemberBranch({
            branchId: branchId,
            memberId: member.id,
            createdAt: now,
          }),
      );
      await setMemberBranches(member.id, rows, trx);

      const otp = generateOTP();
      const hashedOtp = hashOTP(otp);
      await createPasswordReset(
        {
          userId: user.id,
          otpHash: hashedOtp,
          expiresAt: new Date(Date.now() + toMs(7, "d")),
          createdAt: new Date(),
        },
        trx,
      );
      // TODO: send email
      console.log(`Mocked email sent ${otp}`);

      await trx.commit();

      return {
        message: "Member invited successfully",
        member: {
          id: member.id,
          userId: user.id,
          email: data.email,
          name: data.name,
          phone: data.phoneNumber,
          role: data.role,
          status: MemberStatus.INACTIVE,
          branchIds,
        },
      };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  async listMembers(
    restaurantId: number,
    pagination: PaginationParams,
    filters: FilterParams[],
  ) {
    return await findMembersByRestaurantId(restaurantId, pagination, filters);
  }

  async updateMember(
    restaurantId: number,
    memberId: number,
    data: UpdateMemberDTO,
  ) {
    const result = await findMemberWithRoleName(memberId);
    if (
      !result ||
      Number(result.member.restaurantId) !== Number(restaurantId)
    ) {
      throw MemberNotFoundError;
    }

    const updateData: { roleId?: number; status?: string } = {};
    if (data.role) {
      const roleId = await findRoleByName(data.role);
      if (!roleId) throw RoleNotFoundError;
      updateData.roleId = roleId;
    }
    if (data.status) {
      updateData.status = data.status;
    }

    await updateMember(memberId, updateData);
    return { message: "Member updated successfully" };
  }

  async deleteMember(restaurantId: number, memberId: number) {
    const result = await findMemberWithRoleName(memberId);
    if (
      !result ||
      Number(result.member.restaurantId) !== Number(restaurantId)
    ) {
      throw MemberNotFoundError;
    }
    if (result.roleName === "owner") {
      throw CannotDeleteOwnerError;
    }
    await deleteMember(memberId);
    return { message: "Member deleted successfully" };
  }

  async updateMemberBranches(
    restaurantId: number,
    memberId: number,
    data: UpdateMemberBranchesDTO,
  ) {
    const result = await findMemberWithRoleName(memberId);
    if (
      !result ||
      Number(result.member.restaurantId) !== Number(restaurantId)
    ) {
      throw MemberNotFoundError;
    }
    if (result.roleName === "owner") {
      throw OwnerBranchAssignmentError;
    }

    await this.validateBranchOwnership(data.branchIds, restaurantId);

    const now = new Date();
    const rows = data.branchIds.map(
      (branchId) =>
        new MemberBranch({
          branchId,
          memberId: result.member.id,
          createdAt: now,
        }),
    );
    await setMemberBranches(memberId, rows);

    return {
      message: "Member branches updated successfully",
      branchIds: data.branchIds,
    };
  }

  async getRolePermissions(roleName: string) {
    const permissions = await getPermissionsDetailsByRoleName(roleName);
    return { role: roleName, permissions };
  }

  async validateBranchOwnership(branchIds: number[], restaurantId: number) {
    if (branchIds.length === 0) return;
    const count = await countBranchesByIdsAndRestaurant(
      branchIds,
      restaurantId,
    );
    if (count !== branchIds.length) {
      throw InvalidBranchIdsError;
    }
  }
}
