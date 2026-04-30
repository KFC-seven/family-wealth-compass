import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { verifyPassword } from "@/server/auth/password";
import { createSession, revokeAllUserSessions } from "@/server/auth/session";
import { setSessionCookie } from "@/server/auth/cookies";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return createErrorResponse({ code: "VALIDATION_ERROR", message: "请输入邮箱和密码" }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { passwordCredential: true },
    });

    // 固定错误消息，不透露具体原因
    if (!user || !user.passwordCredential || !user.isActive) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      return createErrorResponse({ code: "AUTH_FAILED", message: "邮箱或密码错误" }, 401);
    }

    const cred = user.passwordCredential;
    const valid = verifyPassword(password, cred.passwordSalt, cred.passwordHash);
    if (!valid) {
      return createErrorResponse({ code: "AUTH_FAILED", message: "邮箱或密码错误" }, 401);
    }

    // Find member
    const member = await prisma.member.findFirst({ where: { userId: user.id } });

    const { token } = await createSession(user.id, {
      userAgent: req.headers.get("user-agent") ?? undefined,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    await setSessionCookie(token);

    return createSuccessResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberId: member?.id ?? null,
        householdId: member?.householdId ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
