import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSessionFromToken, getUserSessions } from "@/server/auth/session";

export async function GET() {
  try {
    if (process.env.AUTH_ENABLED !== "true") {
      return createErrorResponse({ code: "AUTH_DISABLED", message: "认证未启用" }, 400);
    }

    const token = await getSessionCookie();
    if (!token) return createErrorResponse({ code: "NOT_AUTHENTICATED", message: "请先登录" }, 401);

    const session = await getSessionFromToken(token);
    if (!session) return createErrorResponse({ code: "SESSION_EXPIRED", message: "登录已过期" }, 401);

    const sessions = await getUserSessions(session.userId);
    return createSuccessResponse(sessions.map((s) => ({
      id: s.id,
      lastSeenAt: s.lastSeenAt.toISOString(),
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })));
  } catch (err) {
    return handleApiError(err);
  }
}
