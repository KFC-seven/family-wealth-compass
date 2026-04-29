import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { getAllProviders } from "@/server/market-data/registry";

export async function GET() {
  try {
    const dbSources = await prisma.marketDataSource.findMany({
      orderBy: { priority: "asc" },
    });

    const providers = getAllProviders();

    const data = dbSources.map((ds) => {
      const provider = providers.find((p) => p.name === ds.name);
      return {
        id: ds.id,
        name: ds.name,
        displayName: ds.displayName,
        type: ds.type,
        isEnabled: ds.isEnabled,
        priority: ds.priority,
        supportedAssetTypes: ds.supportedAssetTypes,
        config: ds.config,
        lastCheckedAt: ds.lastCheckedAt?.toISOString() ?? null,
        lastStatus: ds.lastStatus,
        hasProvider: !!provider,
        createdAt: ds.createdAt.toISOString(),
        updatedAt: ds.updatedAt.toISOString(),
      };
    });

    return createSuccessResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
