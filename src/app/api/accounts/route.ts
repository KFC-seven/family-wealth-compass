import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: [{ memberId: "asc" }, { name: "asc" }],
      include: {
        member: { select: { id: true, name: true, displayName: true } },
      },
    });

    const data = accounts.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      memberName: a.member.displayName || a.member.name,
      name: a.name,
      type: a.type,
      platform: a.platform,
      currency: a.currency,
      includeInTotal: a.includeInTotal,
      isActive: a.isActive,
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
