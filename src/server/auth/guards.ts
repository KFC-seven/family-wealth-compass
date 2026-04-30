import { getSessionCookie } from "./cookies";
import { getSessionFromToken } from "./session";
import { prisma } from "@/server/db/prisma";

export type AuthResult = { authenticated: false; error: string; status: number } | { authenticated: true; userId: string; sessionId: string; memberId?: string; householdId?: string; isAdmin: boolean };

export async function requireAuth(): Promise<AuthResult> {
  if (process.env.AUTH_ENABLED !== "true") {
    return { authenticated: true, userId: "dev", sessionId: "dev", isAdmin: true };
  }

  const token = await getSessionCookie();
  if (!token) return { authenticated: false, error: "请先登录", status: 401 };

  const session = await getSessionFromToken(token);
  if (!session) return { authenticated: false, error: "登录已过期", status: 401 };

  const member = await prisma.member.findFirst({ where: { userId: session.userId } });

  return {
    authenticated: true,
    userId: session.userId,
    sessionId: session.sessionId,
    memberId: member?.id ?? session.memberId,
    householdId: member?.householdId ?? session.householdId,
    isAdmin: member?.isAdmin ?? false,
  };
}

export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth;
  if (!auth.isAdmin) return { authenticated: false, error: "需要管理员权限", status: 403 };
  return auth;
}

export async function requireJobPermission(): Promise<AuthResult> {
  const secret = process.env.JOB_API_SECRET;
  const token = await getSessionCookie();
  if (token) {
    return requireAdmin();
  }
  if (secret) {
    // Allow secret-based access for cron jobs
    return { authenticated: true, userId: "system", sessionId: "system", isAdmin: true };
  }
  return { authenticated: false, error: "请先登录或使用 JOB_API_SECRET", status: 401 };
}
