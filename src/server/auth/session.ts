import crypto from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "./password";

const MAX_AGE_DAYS = parseInt(process.env.AUTH_SESSION_MAX_AGE_DAYS ?? "30", 10);

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, meta?: { userAgent?: string; ipAddress?: string }): Promise<{ token: string; sessionId: string }> {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const session = await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + MAX_AGE_DAYS * 86400000),
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
    },
  });
  return { token, sessionId: session.id };
}

export async function getSessionFromToken(token: string): Promise<{ userId: string; sessionId: string; memberId?: string; householdId?: string } | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.userSession.findFirst({
    where: {
      sessionTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { isActive: true } } },
  });
  if (!session || !session.user.isActive) return null;

  // Update last seen
  await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });

  // Find member linked to this user
  const member = await prisma.member.findFirst({ where: { userId: session.userId } });

  return {
    userId: session.userId,
    sessionId: session.id,
    memberId: member?.id ?? undefined,
    householdId: member?.householdId ?? undefined,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  const where: any = { userId, revokedAt: null };
  if (exceptSessionId) where.id = { not: exceptSessionId };
  await prisma.userSession.updateMany({ where, data: { revokedAt: new Date() } });
}

export async function getUserSessions(userId: string) {
  return prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      lastSeenAt: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.userSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] } });
}
