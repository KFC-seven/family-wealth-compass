import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

// Mock the cookies and session modules that guards.ts depends on
const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/cookies", () => ({
  getSessionCookie: mockGetSessionCookie,
}));

vi.mock("@/server/auth/session", () => ({
  getSessionFromToken: mockGetSessionFromToken,
}));

import { requireAuth, requireAdmin, requireJobPermission } from "../guards";

beforeEach(() => {
  vi.restoreAllMocks();
  mockGetSessionCookie.mockReset();
  mockGetSessionFromToken.mockReset();
  mockPrisma.member.findFirst.mockReset();
  delete process.env.AUTH_ENABLED;
  delete process.env.JOB_API_SECRET;
});

describe("requireAuth", () => {
  it("returns dev-mode AuthResult when AUTH_ENABLED is not 'true'", async () => {
    process.env.AUTH_ENABLED = "false";
    const result = await requireAuth();
    expect(result).toEqual({
      authenticated: true,
      userId: "dev",
      sessionId: "dev",
      isAdmin: true,
    });
  });

  it("returns 401 when no session cookie is present", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const result = await requireAuth();
    expect(result).toEqual({
      authenticated: false,
      error: "请先登录",
      status: 401,
    });
  });

  it("returns 401 when the session is invalid or expired", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("invalid-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const result = await requireAuth();
    expect(result).toEqual({
      authenticated: false,
      error: "登录已过期",
      status: 401,
    });
  });

  it("returns authenticated AuthResult with member data when valid", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      memberId: "mem-1",
      householdId: "hh-1",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      householdId: "hh-1",
      name: "Admin",
      isAdmin: true,
    });

    const result = await requireAuth();
    expect(result).toEqual({
      authenticated: true,
      userId: "user-1",
      sessionId: "sess-1",
      memberId: "mem-1",
      householdId: "hh-1",
      isAdmin: true,
    });
  });

  it("sets isAdmin to false when member.isAdmin is undefined", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-2",
      sessionId: "sess-2",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-2",
      userId: "user-2",
      householdId: "hh-2",
      name: "Non-Admin",
      // isAdmin not set — undefined
    });

    const result = await requireAuth();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.isAdmin).toBe(false);
    }
  });

  it("falls back to session memberId when prisma member returns null", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-3",
      sessionId: "sess-3",
      memberId: "mem-from-session",
      householdId: "hh-from-session",
    });
    mockPrisma.member.findFirst.mockResolvedValue(null);

    const result = await requireAuth();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.memberId).toBe("mem-from-session");
      expect(result.householdId).toBe("hh-from-session");
    }
  });
});

describe("requireAdmin", () => {
  it("returns 403 when the user is not admin", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("non-admin-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      isAdmin: false,
    });

    const result = await requireAdmin();
    expect(result).toEqual({
      authenticated: false,
      error: "需要管理员权限",
      status: 403,
    });
  });

  it("returns the auth result when the user is admin", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("admin-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "admin-1",
      sessionId: "sess-1",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-1",
      userId: "admin-1",
      isAdmin: true,
    });

    const result = await requireAdmin();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.isAdmin).toBe(true);
    }
  });

  it("propagates requireAuth errors (unauthenticated)", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const result = await requireAdmin();
    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe("requireJobPermission", () => {
  it("delegates to requireAdmin when a session cookie is present", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-session-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      isAdmin: true,
    });

    const result = await requireJobPermission();
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe("user-1");
    }
  });

  it("returns system AuthResult when JOB_API_SECRET is set and no cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    process.env.JOB_API_SECRET = "my-secret-key";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const result = await requireJobPermission();
    expect(result).toEqual({
      authenticated: true,
      userId: "system",
      sessionId: "system",
      isAdmin: true,
    });
  });

  it("returns 401 when neither cookie nor JOB_API_SECRET are present", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const result = await requireJobPermission();
    expect(result).toEqual({
      authenticated: false,
      error: "请先登录或使用 JOB_API_SECRET",
      status: 401,
    });
  });

  it("ignores empty JOB_API_SECRET string", async () => {
    process.env.AUTH_ENABLED = "true";
    process.env.JOB_API_SECRET = "";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const result = await requireJobPermission();
    expect(result.authenticated).toBe(false);
  });

  it("prefers cookie path over JOB_API_SECRET when both are present", async () => {
    process.env.AUTH_ENABLED = "true";
    process.env.JOB_API_SECRET = "secret-key";
    mockGetSessionCookie.mockResolvedValue("session-token");
    // session token user is not admin -> should fail at requireAdmin
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
    });
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "mem-1",
      userId: "user-1",
      isAdmin: false,
    });

    const result = await requireJobPermission();
    // Should hit the requireAdmin path (with cookie) and fail because not admin
    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(403);
  });
});
