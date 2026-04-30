import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSessionFromToken, revokeSession } from "@/server/auth/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    if (process.env.AUTH_ENABLED !== "true") {
      return createErrorResponse({ code: "AUTH_DISABLED", message: "认证未启用" }, 400);
    }

    const token = await getSessionCookie();
    if (!token) return createErrorResponse({ code: "NOT_AUTHENTICATED", message: "请先登录" }, 401);

    const session = await getSessionFromToken(token);
    if (!session) return createErrorResponse({ code: "SESSION_EXPIRED", message: "登录已过期" }, 401);

    await revokeSession(sessionId);
    return createSuccessResponse({ revoked: true });
  } catch (err) {
    return handleApiError(err);
  }
}
