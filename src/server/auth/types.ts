export type AuthPermissions = {
  canViewHousehold: boolean;
  canViewAllMembers: boolean;
  canViewOwnMemberOnly: boolean;
  canEditOwnData: boolean;
  canEditAllData: boolean;
  canManageSettings: boolean;
  canRunJobs: boolean;
  canUseImport: boolean;
  canGenerateBrief: boolean;
  canPushBrief: boolean;
};

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  role: string;
  memberId?: string;
  householdId?: string;
}

export interface AuthSession {
  userId: string;
  sessionId: string;
  memberId?: string;
  householdId?: string;
}
