import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getSessionCookie } from "@/server/auth/cookies";
import { getSessionFromToken, revokeAllUserSessions } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";

export async function POST(req: Request) {
  try {
    if (process.env.AUTH_ENABLED !== "true") {
      return createErrorResponse({ code: "AUTH_DISABLED", message: "认证未启用" }, 400);
    }

    const token = await getSessionCookie();
    if (!token) return createErrorResponse({ code: "NOT_AUTHENTICATED", message: "请先登录" }, 401);

    const session = await getSessionFromToken(token);
    if (!session) return createErrorResponse({ code: "SESSION_EXPIRED", message: "登录已过期" }, 401);

    const body = await req.json();
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return createErrorResponse({ code: "VALIDATION_ERROR", message: "新密码至少6位" }, 400);
    }

    const cred = await prisma.passwordCredential.findUnique({ where: { userId: session.userId } });
    if (!cred) return createErrorResponse({ code: "NOT_FOUND", message: "未设置密码" }, 404);

    if (!verifyPassword(oldPassword, cred.passwordSalt, cred.passwordHash)) {
      return createErrorResponse({ code: "AUTH_FAILED", message: "旧密码错误" }, 401);
    }

    const { hash, salt } = hashPassword(newPassword);
    await prisma.passwordCredential.update({
      where: { userId: session.userId },
      data: { passwordHash: hash, passwordSalt: salt, lastChangedAt: new Date(), passwordVersion: cred.passwordVersion + 1 },
    });

    // Revoke other sessions
    await revokeAllUserSessions(session.userId, session.sessionId);

    return createSuccessResponse({ changed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
