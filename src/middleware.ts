import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? "fwc_session";

const PROTECTED_PATHS = [
  "/", "/members", "/holdings", "/import", "/brief", "/settings", "/account",
];

const PUBLIC_API = [
  "/api/auth/login",
  "/api/health",
];

export function middleware(request: NextRequest) {
  if (process.env.AUTH_ENABLED !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public API
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  // Protect pages
  if (PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect sensitive API (POST/PATCH/DELETE)
  if (pathname.startsWith("/api/") && !sessionCookie) {
    const method = request.method;
    if (["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
      // Allow job runs with secret
      if (pathname === "/api/jobs/run" && request.headers.get("x-job-api-secret") === process.env.JOB_API_SECRET) {
        return NextResponse.next();
      }
      return NextResponse.json({ ok: false, error: { code: "NOT_AUTHENTICATED", message: "请先登录" } }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
