import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => new Response(null, { status: 200, headers: new Headers() })),
    redirect: vi.fn((url: string | URL) => {
      const res = new Response(null, { status: 302 });
      res.headers.set("Location", url.toString());
      return res;
    }),
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers as Record<string, string> ?? {}) },
      });
    }),
  },
}));

vi.hoisted(() => {
  process.env.AUTH_SESSION_COOKIE_NAME = "fwc_session";
});

import { middleware } from "../middleware";
import type { NextRequest } from "next/server";

function mockRequest(options: {
  pathname?: string;
  method?: string;
  cookieValue?: string | undefined;
  headers?: Record<string, string>;
}): NextRequest {
  const url = new URL(`http://localhost${options.pathname ?? "/"}`);
  return {
    nextUrl: url,
    url: url.toString(),
    method: options.method ?? "GET",
    cookies: {
      get: vi.fn((name: string) =>
        options.cookieValue ? { value: options.cookieValue } : undefined
      ),
    },
    headers: {
      get: vi.fn((name: string) => options.headers?.[name] ?? null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_ENABLED = "true";
  process.env.JOB_API_SECRET = "test-job-secret";
});

afterEach(() => {
  delete process.env.AUTH_ENABLED;
  delete process.env.JOB_API_SECRET;
});

describe("middleware", () => {
  describe("AUTH_ENABLED bypass", () => {
    it("passes through all requests when AUTH_ENABLED is not 'true'", () => {
      process.env.AUTH_ENABLED = "false";
      const req = mockRequest({ pathname: "/holdings" });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe("static assets", () => {
    it("passes through _next paths", () => {
      const req = mockRequest({ pathname: "/_next/static/chunks/main.js" });
      expect(middleware(req).status).toBe(200);
    });

    it("passes through favicon", () => {
      const req = mockRequest({ pathname: "/favicon.ico" });
      expect(middleware(req).status).toBe(200);
    });

    it("passes through static file extensions", () => {
      const paths = ["/test.svg", "/logo.png", "/bg.jpg", "/icon.jpeg", "/style.css", "/app.js"];
      paths.forEach((p) => {
        expect(middleware(mockRequest({ pathname: p })).status).toBe(200);
      });
    });
  });

  describe("public API", () => {
    it("passes through /api/auth/login", () => {
      const req = mockRequest({ pathname: "/api/auth/login" });
      expect(middleware(req).status).toBe(200);
    });

    it("passes through /api/health", () => {
      const req = mockRequest({ pathname: "/api/health" });
      expect(middleware(req).status).toBe(200);
    });
  });

  describe("login page", () => {
    it("passes through /login", () => {
      const req = mockRequest({ pathname: "/login" });
      expect(middleware(req).status).toBe(200);
    });
  });

  describe("protected pages", () => {
    const protectedPaths = ["/", "/members", "/holdings", "/import", "/brief", "/settings", "/account"];

    protectedPaths.forEach((path) => {
      it(`redirects to /login when accessing ${path} without cookie`, () => {
        const req = mockRequest({ pathname: path });
        const res = middleware(req);
        expect(res.status).toBe(302);
        const location = res.headers.get("Location");
        expect(location).toContain("/login");
        expect(location).toContain(encodeURIComponent(path));
      });
    });

    protectedPaths.forEach((path) => {
      it(`allows ${path} with valid cookie`, () => {
        const req = mockRequest({ pathname: path, cookieValue: "valid-session" });
        expect(middleware(req).status).toBe(200);
      });
    });

    it("protects subpaths (e.g., /holdings/abc)", () => {
      const req = mockRequest({ pathname: "/holdings/hld-001" });
      const res = middleware(req);
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toContain("/login");
    });

    it("protects /members/abc", () => {
      const req = mockRequest({ pathname: "/members/mem-001" });
      expect(middleware(req).status).toBe(302);
    });
  });

  describe("protected API methods", () => {
    it("returns 401 for POST /api/* without cookie", async () => {
      const req = mockRequest({ pathname: "/api/holdings", method: "POST" });
      const res = middleware(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("NOT_AUTHENTICATED");
    });

    it("returns 401 for DELETE /api/* without cookie", async () => {
      const req = mockRequest({ pathname: "/api/transactions", method: "DELETE" });
      const res = middleware(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 for PATCH /api/* without cookie", async () => {
      const req = mockRequest({ pathname: "/api/settings", method: "PATCH" });
      expect(middleware(req).status).toBe(401);
    });

    it("returns 401 for PUT /api/* without cookie", async () => {
      const req = mockRequest({ pathname: "/api/settings", method: "PUT" });
      expect(middleware(req).status).toBe(401);
    });

    it("passes through POST /api/* with cookie", () => {
      const req = mockRequest({ pathname: "/api/holdings", method: "POST", cookieValue: "valid-session" });
      expect(middleware(req).status).toBe(200);
    });

    it("passes through GET /api/* without cookie (handler-level auth)", () => {
      const req = mockRequest({ pathname: "/api/holdings", method: "GET" });
      expect(middleware(req).status).toBe(200);
    });

    it("allows /api/jobs/run with matching x-job-api-secret", () => {
      const req = mockRequest({
        pathname: "/api/jobs/run",
        method: "POST",
        headers: { "x-job-api-secret": "test-job-secret" },
      });
      expect(middleware(req).status).toBe(200);
    });

    it("blocks /api/jobs/run with wrong x-job-api-secret", async () => {
      const req = mockRequest({
        pathname: "/api/jobs/run",
        method: "POST",
        headers: { "x-job-api-secret": "wrong-secret" },
      });
      const res = middleware(req);
      expect(res.status).toBe(401);
    });

    it("blocks /api/jobs/run without any x-job-api-secret header", async () => {
      const req = mockRequest({
        pathname: "/api/jobs/run",
        method: "POST",
      });
      const res = middleware(req);
      expect(res.status).toBe(401);
    });

    it("passes through POST /api/auth/login (public API takes precedence)", () => {
      const req = mockRequest({ pathname: "/api/auth/login", method: "POST" });
      expect(middleware(req).status).toBe(200);
    });
  });
});
