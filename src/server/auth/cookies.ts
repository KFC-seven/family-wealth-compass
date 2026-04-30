import { cookies } from "next/headers";

const COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? "fwc_session";
const MAX_AGE_DAYS = parseInt(process.env.AUTH_SESSION_MAX_AGE_DAYS ?? "30", 10);
const SECURE = process.env.AUTH_REQUIRE_HTTPS === "true" || process.env.NODE_ENV === "production";

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}
