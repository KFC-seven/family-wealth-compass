import { describe, it, expect } from "vitest";
import { getPermissionsForRole } from "../permissions";

describe("getPermissionsForRole", () => {
  describe("admin (isAdmin = true)", () => {
    const perms = getPermissionsForRole(true);

    it("grants all view and edit permissions", () => {
      expect(perms.canViewHousehold).toBe(true);
      expect(perms.canViewAllMembers).toBe(true);
      expect(perms.canEditOwnData).toBe(true);
      expect(perms.canEditAllData).toBe(true);
      expect(perms.canUseImport).toBe(true);
    });

    it("grants all management permissions", () => {
      expect(perms.canManageSettings).toBe(true);
      expect(perms.canRunJobs).toBe(true);
      expect(perms.canGenerateBrief).toBe(true);
      expect(perms.canPushBrief).toBe(true);
    });

    it("sets canViewOwnMemberOnly to false", () => {
      expect(perms.canViewOwnMemberOnly).toBe(false);
    });
  });

  describe("non-admin (isAdmin = false)", () => {
    const perms = getPermissionsForRole(false);

    it("grants basic view and edit permissions", () => {
      expect(perms.canViewHousehold).toBe(true);
      expect(perms.canViewAllMembers).toBe(true);
      expect(perms.canEditOwnData).toBe(true);
    });

    it("grants import permission", () => {
      expect(perms.canUseImport).toBe(true);
    });

    it("denies admin-only permissions", () => {
      expect(perms.canEditAllData).toBe(false);
      expect(perms.canManageSettings).toBe(false);
      expect(perms.canRunJobs).toBe(false);
      expect(perms.canGenerateBrief).toBe(false);
      expect(perms.canPushBrief).toBe(false);
    });

    it("sets canViewOwnMemberOnly to false", () => {
      expect(perms.canViewOwnMemberOnly).toBe(false);
    });
  });
});
