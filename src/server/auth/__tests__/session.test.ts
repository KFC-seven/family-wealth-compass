import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// Set env var before module evaluation
vi.hoisted(() => {
  process.env.AUTH_SESSION_MAX_AGE_DAYS = "30";
});

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    userSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: mockPrisma }));

import {
  createSession,
  getSessionFromToken,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  cleanupExpiredSessions,
} from "../session";

const mockUserId = "user-001";
const mockSessionId = "sess-001";
const mockMemberId = "mem-001";
const mockHouseholdId = "hh-001";

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) =>
    Object.values(m as Record<string, unknown>).forEach((f: unknown) => {
      if (typeof f === "function") (f as ReturnType<typeof vi.fn>).mockReset();
    })
  );
});

describe("createSession", () => {
  it("creates a session via prisma.userSession.create and returns token + sessionId", async () => {
    mockPrisma.userSession.create.mockResolvedValue({ id: mockSessionId });

    const result = await createSession(mockUserId, {
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    });

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("sessionId", mockSessionId);

    // Token should be 48 random bytes hex-encoded = 96 hex chars
    expect(result.token).toHaveLength(96);
    expect(/^[0-9a-f]+$/.test(result.token)).toBe(true);

    // Verify the data passed to prisma
    const createCall = mockPrisma.userSession.create.mock.calls[0][0];
    expect(createCall.data.userId).toBe(mockUserId);
    expect(createCall.data.userAgent).toBe("test-agent");
    expect(createCall.data.ipAddress).toBe("127.0.0.1");

    // Token hash should be SHA-256 of the raw token
    const expectedHash = crypto.createHash("sha256").update(result.token).digest("hex");
    expect(createCall.data.sessionTokenHash).toBe(expectedHash);

    // ExpiresAt should be approximately 30 days in the future
    const expiresAt = createCall.data.expiresAt.getTime();
    const now = Date.now();
    const thirtyDaysMs = 30 * 86400000;
    expect(expiresAt).toBeGreaterThan(now + thirtyDaysMs - 1000);
    expect(expiresAt).toBeLessThan(now + thirtyDaysMs + 1000);
  });

  it("passes null for missing meta fields", async () => {
    mockPrisma.userSession.create.mockResolvedValue({ id: "sess-002" });

    await createSession(mockUserId);

    const createCall = mockPrisma.userSession.create.mock.calls[0][0];
    expect(createCall.data.userAgent).toBeNull();
    expect(createCall.data.ipAddress).toBeNull();
  });

  it("generates a unique token each time", async () => {
    mockPrisma.userSession.create.mockResolvedValue({ id: mockSessionId });

    const r1 = await createSession(mockUserId);
    const r2 = await createSession(mockUserId);

    expect(r1.token).not.toBe(r2.token);
  });
});

describe("getSessionFromToken", () => {
  const validSession = {
    id: mockSessionId,
    userId: mockUserId,
    sessionTokenHash: "irrelevant",
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    createdAt: new Date(),
    lastSeenAt: new Date(),
    user: { isActive: true },
    userAgent: "test-agent",
    ipAddress: "127.0.0.1",
  };

  it("returns session data for a valid token", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue(validSession);
    mockPrisma.userSession.update.mockResolvedValue({});
    mockPrisma.member.findFirst.mockResolvedValue({
      id: mockMemberId,
      householdId: mockHouseholdId,
    });

    const result = await getSessionFromToken("valid-token");

    expect(result).not.toBeNull();
    expect(result!.userId).toBe(mockUserId);
    expect(result!.sessionId).toBe(mockSessionId);
    expect(result!.memberId).toBe(mockMemberId);
    expect(result!.householdId).toBe(mockHouseholdId);

    // Should query by the hash of the token
    const expectedHash = crypto.createHash("sha256").update("valid-token").digest("hex");
    const findCall = mockPrisma.userSession.findFirst.mock.calls[0][0];
    expect(findCall.where.sessionTokenHash).toBe(expectedHash);
    expect(findCall.where.revokedAt).toBeNull();
    expect(findCall.where.expiresAt).toBeDefined();

    // Should update lastSeenAt
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockSessionId },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      })
    );

    // Should find linked member
    expect(mockPrisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: mockUserId } })
    );
  });

  it("returns undefined memberId/householdId when no member is linked", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue(validSession);
    mockPrisma.userSession.update.mockResolvedValue({});
    mockPrisma.member.findFirst.mockResolvedValue(null);

    const result = await getSessionFromToken("valid-token");

    expect(result).not.toBeNull();
    expect(result!.memberId).toBeUndefined();
    expect(result!.householdId).toBeUndefined();
  });

  it("returns null when no session is found", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue(null);

    const result = await getSessionFromToken("non-existent-token");
    expect(result).toBeNull();
  });

  it("returns null when the user is inactive", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue({
      ...validSession,
      user: { isActive: false },
    });

    const result = await getSessionFromToken("inactive-user-token");
    expect(result).toBeNull();
  });

  it("excludes revoked sessions by query condition", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue(null);

    await getSessionFromToken("some-token");

    const findCall = mockPrisma.userSession.findFirst.mock.calls[0][0];
    expect(findCall.where.revokedAt).toBeNull();
  });

  it("excludes expired sessions by query condition", async () => {
    mockPrisma.userSession.findFirst.mockResolvedValue(null);

    await getSessionFromToken("some-token");

    const findCall = mockPrisma.userSession.findFirst.mock.calls[0][0];
    expect(findCall.where.expiresAt).toEqual({ gt: expect.any(Date) });
  });
});

describe("revokeSession", () => {
  it("sets revokedAt on the session", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

    await revokeSession(mockSessionId);

    expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { id: mockSessionId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not error for a non-existent sessionId", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(revokeSession("non-existent")).resolves.not.toThrow();
  });
});

describe("revokeAllUserSessions", () => {
  it("revokes all non-revoked sessions for a user", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 });

    await revokeAllUserSessions(mockUserId);

    expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: mockUserId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("excludes the exceptSessionId when provided", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });

    await revokeAllUserSessions(mockUserId, "current-session-id");

    const updateCall = mockPrisma.userSession.updateMany.mock.calls[0][0];
    expect(updateCall.where.id).toEqual({ not: "current-session-id" });
  });

  it("does not error when no sessions exist", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(revokeAllUserSessions("no-sessions")).resolves.not.toThrow();
  });
});

describe("getUserSessions", () => {
  const mockSessions = [
    { id: "sess-1", lastSeenAt: new Date("2026-05-10"), userAgent: "Chrome", createdAt: new Date("2026-05-01"), expiresAt: new Date("2026-06-01") },
    { id: "sess-2", lastSeenAt: new Date("2026-05-09"), userAgent: "Firefox", createdAt: new Date("2026-05-02"), expiresAt: new Date("2026-06-02") },
  ];

  it("returns non-revoked, non-expired sessions ordered by lastSeenAt desc", async () => {
    mockPrisma.userSession.findMany.mockResolvedValue(mockSessions);

    const result = await getUserSessions(mockUserId);

    expect(result).toHaveLength(2);
    expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId, revokedAt: null, expiresAt: { gt: expect.any(Date) } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, lastSeenAt: true, userAgent: true, createdAt: true, expiresAt: true },
    });
  });

  it("returns an empty array when no sessions exist", async () => {
    mockPrisma.userSession.findMany.mockResolvedValue([]);

    const result = await getUserSessions(mockUserId);
    expect(result).toEqual([]);
  });
});

describe("cleanupExpiredSessions", () => {
  it("deletes expired OR revoked sessions", async () => {
    mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 5 });

    await cleanupExpiredSessions();

    expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { revokedAt: { not: null } },
        ],
      },
    });
  });

  it("does not error on an empty table", async () => {
    mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

    await expect(cleanupExpiredSessions()).resolves.not.toThrow();
  });
});
