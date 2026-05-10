import { describe, it, expect, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    member: { findFirst: vi.fn() },
  },
}));

const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/auth/password", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/server/auth/session", () => ({ createSession: mockCreateSession }));
vi.mock("@/server/auth/cookies", () => ({ setSessionCookie: mockSetSessionCookie }));

import { POST } from "../route";

const mockUser = {
  id: "user-001",
  name: "测试用户",
  email: "test@example.com",
  role: "ADMIN",
  isActive: true,
  passwordCredential: {
    passwordHash: "abc123",
    passwordSalt: "salt123",
  },
};

const mockMember = {
  id: "mem-001",
  householdId: "hh-001",
};

function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return POST(new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  }));
}

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await post({ password: "test123" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("请输入邮箱和密码");
  });

  it("returns 400 when password is missing", async () => {
    const res = await post({ email: "test@example.com" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 with fixed message when user is not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await post({ email: "unknown@example.com", password: "password123" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(body.error.message).toBe("邮箱或密码错误");
  });

  it("returns 401 when user is inactive", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

    const res = await post({ email: "inactive@example.com", password: "password123" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("returns 401 when user has no password credential", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordCredential: null });

    const res = await post({ email: "nocred@example.com", password: "password123" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("returns 401 when password is wrong", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockVerifyPassword.mockReturnValue(false);

    const res = await post({ email: "test@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(mockVerifyPassword).toHaveBeenCalledWith("wrong-password", "salt123", "abc123");
  });

  it("returns 200 and creates session on correct password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.member.findFirst.mockResolvedValue(mockMember);
    mockVerifyPassword.mockReturnValue(true);
    mockCreateSession.mockResolvedValue({ token: "session-token-abc", sessionId: "sess-001" });

    const res = await post(
      { email: "test@example.com", password: "correct-password" },
      { "user-agent": "TestBrowser", "x-forwarded-for": "192.168.1.1" }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.user.id).toBe("user-001");
    expect(body.data.user.email).toBe("test@example.com");
    expect(body.data.user.name).toBe("测试用户");
    expect(body.data.user.role).toBe("ADMIN");
    expect(body.data.user.memberId).toBe("mem-001");
    expect(body.data.user.householdId).toBe("hh-001");

    expect(mockCreateSession).toHaveBeenCalledWith("user-001", {
      userAgent: "TestBrowser",
      ipAddress: "192.168.1.1",
    });
    expect(mockSetSessionCookie).toHaveBeenCalledWith("session-token-abc");
  });

  it("returns 500 on unexpected error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB connection lost"));

    const res = await post({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
