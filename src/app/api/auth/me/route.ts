import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSessionFromToken } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getPermissionsForRole } from "@/server/auth/permissions";

export async function GET() {
  try {
    if (process.env.AUTH_ENABLED !== "true") {
      return createSuccessResponse({
        authenticated: false,
        reason: "AUTH_ENABLED=false，跳过认证检查",
      });
    }

    const token = await getSessionCookie();
    if (!token) {
      return createErrorResponse({ code: "NOT_AUTHENTICATED", message: "未登录" }, 401);
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return createErrorResponse({ code: "SESSION_EXPIRED", message: "登录已过期" }, 401);
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return createErrorResponse({ code: "NOT_FOUND", message: "用户不存在" }, 404);

    const member = await prisma.member.findFirst({ where: { userId: user.id } });
    const permissions = getPermissionsForRole(member?.isAdmin ?? false);

    return createSuccessResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      member: member ? { id: member.id, name: member.name, isAdmin: member.isAdmin } : null,
      householdId: member?.householdId ?? null,
      permissions,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
