import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber, dateToISO } from "@/server/finance/mappers";

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        accounts: true,
        investorProfile: true,
      },
    });

    const data = members.map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      roleLabel: m.roleLabel,
      isAdmin: m.isAdmin,
      accounts: m.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        platform: a.platform,
        currency: a.currency,
      })),
      investorProfile: m.investorProfile
        ? {
            riskPreference: m.investorProfile.riskPreference,
            investmentHorizon: m.investorProfile.investmentHorizon,
          }
        : null,
    }));

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
