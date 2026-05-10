import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionCookie = vi.hoisted(() => vi.fn());
const mockGetSessionFromToken = vi.hoisted(() => vi.fn());
const mockGetUserSessions = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/cookies", () => ({ getSessionCookie: mockGetSessionCookie }));
vi.mock("@/server/auth/session", () => ({
  getSessionFromToken: mockGetSessionFromToken,
  getUserSessions: mockGetUserSessions,
}));

import { GET } from "../route";

beforeEach(() => {
  mockGetSessionCookie.mockReset();
  mockGetSessionFromToken.mockReset();
  mockGetUserSessions.mockReset();
  delete process.env.AUTH_ENABLED;
});

describe("GET /api/auth/sessions", () => {
  it("returns 400 when AUTH_ENABLED is not true", async () => {
    process.env.AUTH_ENABLED = "false";

    const res = await GET();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_DISABLED");
  });

  it("returns 401 when no session cookie", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue(undefined);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("returns 401 when session is expired", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("expired-token");
    mockGetSessionFromToken.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("SESSION_EXPIRED");
  });

  it("returns sessions with ISO date strings", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockGetUserSessions.mockResolvedValue([
      {
        id: "sess-001",
        lastSeenAt: new Date("2026-05-10T10:00:00Z"),
        userAgent: "Chrome",
        createdAt: new Date("2026-05-01T08:00:00Z"),
        expiresAt: new Date("2026-06-01T08:00:00Z"),
      },
      {
        id: "sess-002",
        lastSeenAt: new Date("2026-05-09T12:00:00Z"),
        userAgent: "Firefox",
        createdAt: new Date("2026-05-02T09:00:00Z"),
        expiresAt: new Date("2026-06-02T09:00:00Z"),
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      id: "sess-001",
      lastSeenAt: "2026-05-10T10:00:00.000Z",
      userAgent: "Chrome",
      createdAt: "2026-05-01T08:00:00.000Z",
      expiresAt: "2026-06-01T08:00:00.000Z",
    });
    expect(body.data[1].id).toBe("sess-002");
  });

  it("returns empty array when no sessions exist", async () => {
    process.env.AUTH_ENABLED = "true";
    mockGetSessionCookie.mockResolvedValue("valid-token");
    mockGetSessionFromToken.mockResolvedValue({
      userId: "user-001",
      sessionId: "sess-001",
    });
    mockGetUserSessions.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
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
