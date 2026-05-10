import { describe, it, expect, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { findUnique: vi.fn() }, member: { findFirst: vi.fn() } },
}));
const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/auth/password", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/server/auth/session", () => ({ createSession: mockCreateSession }));
vi.mock("@/server/auth/cookies", () => ({ setSessionCookie: mockSetSessionCookie }));

import { POST } from "../app/api/auth/login/route";

describe("debug all mocks", () => {
  it("route returns response with all mocks", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-001",
      name: "Test",
      email: "a@b.com",
      role: "ADMIN",
      isActive: true,
      passwordCredential: { passwordHash: "h", passwordSalt: "s" },
    });
    mockPrisma.member.findFirst.mockResolvedValue({ id: "mem-001", householdId: "hh-001" });
    mockVerifyPassword.mockReturnValue(true);
    mockCreateSession.mockResolvedValue({ token: "t", sessionId: "s" });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "pwd" }),
    });
    const res = await POST(req);
    console.log("res:", typeof res, res?.status);
    expect(res).toBeDefined();
    if (res) expect(res.status).toBe(200);
  });
});
