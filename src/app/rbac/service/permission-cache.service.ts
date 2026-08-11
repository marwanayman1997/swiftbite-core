import { toMs } from "../../../common/utils/time.ts";
import { getPermissionsByRoleName } from "../repository/permission.repo.ts";

class PermissionCacheService {
  private cache: Map<string, { permissions: string[]; cachedAt: number }> =
    new Map();
  private readonly TTL = toMs(1, "h");

  async getPermissions(roleName: string): Promise<string[]> {
    const cached = this.cache.get(roleName);
    if (cached && Date.now() - cached.cachedAt < this.TTL) {
      return cached.permissions;
    }

    const permissions = await getPermissionsByRoleName(roleName);
    this.cache.set(roleName, { permissions, cachedAt: Date.now() });

    return permissions;
  }

  hasPermission(
    permissions: string[],
    resource: string,
    action: string,
  ): boolean {
    return permissions.includes(`${resource}:${action}`);
  }
}

export const permissionCacheService = new PermissionCacheService();
