import { describe, it, expect, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    passwordCredential: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());
const mockRevokeAllUserSessions = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockVerifyPassword = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/auth/cookies", () => ({ getSessionCookie: mockGetSessionCookie }));
vi.mock("@/server/auth/session", () => ({
  getSessionFromToken: mockGetSessionFromToken,
  revokeAllUserSessions: mockRevokeAllUserSessions,
}));
vi.mock("@/server/auth/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

import { POST } from "../route";

function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }));
}

describe("POST /api/auth/change-password", () => {
  it("returns 400 when AUTH_ENABLED is not true", async () => {
    process.env.AUTH_ENABLED = "false";

    const res = await post({ oldPassword: "old", newPassword: "new123" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_DISABLED");
  });

  it("returns 401 when no session cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const res = await post({ oldPassword: "old", newPassword: "new123" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("returns 401 when session is expired", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("expired-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const res = await post({ oldPassword: "old", newPassword: "new123" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("SESSION_EXPIRED");
  });

  it("returns 400 when oldPassword is missing", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });

    const res = await post({ newPassword: "new123" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("新密码至少6位");
  });

  it("returns 400 when newPassword is missing", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });

    const res = await post({ oldPassword: "old" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when newPassword is shorter than 6 characters", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });

    const res = await post({ oldPassword: "old", newPassword: "12345" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when user has no password credential", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockPrisma.passwordCredential.findUnique.mockResolvedValue(null);

    const res = await post({ oldPassword: "old", newPassword: "new123456" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("未设置密码");
  });

  it("returns 401 when old password is wrong", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockPrisma.passwordCredential.findUnique.mockResolvedValue({
      userId: "user-001",
      passwordHash: "stored-hash",
      passwordSalt: "stored-salt",
      passwordVersion: 1,
    });
    mockVerifyPassword.mockReturnValue(false);

    const res = await post({ oldPassword: "wrong-old", newPassword: "new123456" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(body.error.message).toBe("旧密码错误");
  });

  it("updates credential and revokes other sessions on success", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockPrisma.passwordCredential.findUnique.mockResolvedValue({
      userId: "user-001",
      passwordHash: "stored-hash",
      passwordSalt: "stored-salt",
      passwordVersion: 1,
    });
    mockVerifyPassword.mockReturnValue(true);
    mockHashPassword.mockReturnValue({
      hash: "new-hash-value",
      salt: "new-salt-value",
    });

    const res = await post({ oldPassword: "correct-old", newPassword: "new-secure-password" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(true);

    expect(mockPrisma.passwordCredential.update).toHaveBeenCalledWith({
      where: { userId: "user-001" },
      data: expect.objectContaining({
        passwordHash: "new-hash-value",
        passwordSalt: "new-salt-value",
        passwordVersion: 2,
        lastChangedAt: expect.any(Date),
      }),
    });

    expect(mockRevokeAllUserSessions).toHaveBeenCalledWith("user-001", "sess-001");
  });

  it("handles unexpected errors gracefully", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockRejectedValue(new Error("unexpected"));

    const res = await post({ oldPassword: "old", newPassword: "new123456" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
