import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());
const mockRevokeSession = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/cookies", () => ({ getSessionCookie: mockGetSessionCookie }));
vi.mock("@/server/auth/session", () => ({
  getSessionFromToken: mockGetSessionFromToken,
  revokeSession: mockRevokeSession,
}));

import { DELETE } from "../route";

function makeDeleteRequest(sessionId: string) {
  return [
    new Request(`http://localhost/api/auth/sessions/${sessionId}`, { method: "DELETE" }),
    { params: Promise.resolve({ sessionId }) },
  ] as const;
}

beforeEach(() => {
  mockGetSessionCookie.mockReset();
  mockGetSessionFromToken.mockReset();
  mockRevokeSession.mockReset();
  delete process.env.AUTH_ENABLED;
});

describe("DELETE /api/auth/sessions/[sessionId]", () => {
  it("returns 400 when AUTH_ENABLED is not true", async () => {
    process.env.AUTH_ENABLED = "false";

    const [req, params] = makeDeleteRequest("sess-001");
    const res = await DELETE(req, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_DISABLED");
  });

  it("returns 401 when no session cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const [req, params] = makeDeleteRequest("sess-001");
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("returns 401 when session is expired", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("expired-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const [req, params] = makeDeleteRequest("sess-001");
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("SESSION_EXPIRED");
  });

  it("revokes the specified session and returns success", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });

    const [req, params] = makeDeleteRequest("target-session-id");
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(true);

    expect(mockRevokeSession).toHaveBeenCalledWith("target-session-id");
  });

  it("allows revoking own current session", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });

    const [req, params] = makeDeleteRequest("sess-001");
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    expect(mockRevokeSession).toHaveBeenCalledWith("sess-001");
  });

  it("handles unexpected errors gracefully", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockRejectedValue(new Error("unexpected"));

    const [req, params] = makeDeleteRequest("sess-001");
    const res = await DELETE(req, params);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
