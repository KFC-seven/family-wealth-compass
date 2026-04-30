import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { getSessionCookie, clearSessionCookie } from "@/server/auth/cookies";
import { getSessionFromToken, revokeSession } from "@/server/auth/session";

export async function POST() {
  try {
    const token = await getSessionCookie();
    if (token) {
      const session = await getSessionFromToken(token);
      if (session) {
        await revokeSession(session.sessionId);
      }
    }
    await clearSessionCookie();
    return createSuccessResponse({ loggedOut: true });
  } catch (err) {
    return handleApiError(err);
  }
}
