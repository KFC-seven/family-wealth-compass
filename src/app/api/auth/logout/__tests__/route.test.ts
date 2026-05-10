import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());
const mockRevokeSession = vi.hoisted(() => vi.fn());
const mockClearSessionCookie = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/cookies", () => ({
  getSessionCookie: mockGetSessionCookie,
  clearSessionCookie: mockClearSessionCookie,
}));

vi.mock("@/server/auth/session", () => ({
  getSessionFromToken: mockGetSessionFromToken,
  revokeSession: mockRevokeSession,
}));

import { POST } from "../route";

beforeEach(() => {
  mockGetSessionCookie.mockReset();
  mockGetSessionFromToken.mockReset();
  mockRevokeSession.mockReset();
  mockClearSessionCookie.mockReset();
});

describe("POST /api/auth/logout", () => {
  it("revokes session and clears cookie with valid session", async () => {
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-001",
    });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { loggedOut: true } });

    expect(mockRevokeSession).toHaveBeenCalledWith("sess-001");
    expect(mockClearSessionCookie).toHaveBeenCalled();
  });

  it("clears cookie and does not revoke when token is invalid", async () => {
    mockGetSessionCookie.mockResolvedValue("invalid-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockRevokeSession).not.toHaveBeenCalled();
    expect(mockClearSessionCookie).toHaveBeenCalled();
  });

  it("clears cookie and succeeds when no cookie is present", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.loggedOut).toBe(true);
    expect(mockClearSessionCookie).toHaveBeenCalled();
  });

  it("handles unexpected errors gracefully", async () => {
    mockGetSessionCookie.mockRejectedValue(new Error("cookie store error"));

    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
