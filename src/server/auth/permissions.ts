import type { AuthPermissions } from "./types";

export function getPermissionsForRole(isAdmin: boolean): AuthPermissions {
  if (isAdmin) {
    return {
      canViewHousehold: true,
      canViewAllMembers: true,
      canViewOwnMemberOnly: false,
      canEditOwnData: true,
      canEditAllData: true,
      canManageSettings: true,
      canRunJobs: true,
      canUseImport: true,
      canGenerateBrief: true,
      canPushBrief: true,
    };
  }

  return {
    canViewHousehold: true,
    canViewAllMembers: true,
    canViewOwnMemberOnly: false,
    canEditOwnData: true,
    canEditAllData: false,
    canManageSettings: false,
    canRunJobs: false,
    canUseImport: true,
    canGenerateBrief: false,
    canPushBrief: false,
  };
}
