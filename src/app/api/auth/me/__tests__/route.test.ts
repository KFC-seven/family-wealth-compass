import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    member: { findFirst: vi.fn() },
  },
}));

const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/auth/cookies", () => ({ getSessionCookie: mockGetSessionCookie }));
vi.mock("@/server/auth/session", () => ({ getSessionFromToken: mockGetSessionFromToken }));

import { GET } from "../route";

beforeEach(() => {
  mockPrisma.user.findUnique.mockReset();
  mockPrisma.member.findFirst.mockReset();
  mockGetSessionCookie.mockReset();
  mockGetSessionFromToken.mockReset();
  delete process.env.AUTH_ENABLED;
});

describe("GET /api/auth/me", () => {
  it("returns unauthenticated response when AUTH_ENABLED is not true", async () => {
    process.env.AUTH_ENABLED = "false";

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.authenticated).toBe(false);
    expect(body.data.reason).toContain("AUTH_ENABLED");
  });

  it("returns 401 when no session cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_AUTHENTICATED");
    expect(body.error.message).toBe("未登录");
  });

  it("returns 401 when session is expired or invalid", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("expired-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("SESSION_EXPIRED");
    expect(body.error.message).toBe("登录已过期");
  });

  it("returns 404 when user is not found (deleted between requests)", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("orphaned-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("用户不存在");
  });

  it("returns 200 with user, member, and permissions for valid session", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-001",
      name: "测试用户",
      email: "test@example.com",
      role: "ADMIN",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-001",
      name: "测试用户",
      isAdmin: true,
      householdId: "hh-001",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user).toEqual({
      id: "user-001",
      name: "测试用户",
      email: "test@example.com",
      role: "ADMIN",
    });
    expect(body.data.member).toEqual({
      id: "mem-001",
      name: "测试用户",
      isAdmin: true,
    });
    expect(body.data.householdId).toBe("hh-001");
    expect(body.data.permissions).toBeDefined();
    // Admin permissions: all true
    expect(body.data.permissions.canManageSettings).toBe(true);
    expect(body.data.permissions.canRunJobs).toBe(true);
  });

  it("includes non-admin permissions when user is not admin", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-002",
      sessionId: "sess-002",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-002",
      name: "普通用户",
      email: "user@example.com",
      role: "MEMBER",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-002",
      name: "普通用户",
      isAdmin: false,
      householdId: "hh-001",
    });

    const res = await GET();
    const body = await res.json();
    expect(body.data.permissions.canManageSettings).toBe(false);
    expect(body.data.permissions.canRunJobs).toBe(false);
    expect(body.data.permissions.canViewHousehold).toBe(true);
    expect(body.data.permissions.canUseImport).toBe(true);
  });

  it("handles unexpected errors gracefully", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockRejectedValue(new Error("unexpected"));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
