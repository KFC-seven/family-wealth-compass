import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { decimalToNumber } from "@/server/finance/mappers";

export async function GET() {
  try {
    const household = await prisma.household.findFirst({
      include: {
        members: {
          include: {
            holdings: {
              where: { status: "CURRENT" },
              include: { asset: true, member: true },
            },
          },
        },
      },
    });

    if (!household) {
      return createSuccessResponse([]);
    }

    const allHoldings = household.members.flatMap((m) => m.holdings);
    const totalAssets = allHoldings.reduce(
      (s, h) => s + decimalToNumber(h.currentMarketValue),
      0
    );

    const alerts: Array<{
      id: string;
      type: "warning" | "danger" | "info";
      title: string;
      description: string;
      relatedAsset?: string;
    }> = [];
    let alertIndex = 0;

    // Rule 1: Single holding > 25% of total assets => danger (concentration risk)
    for (const h of allHoldings) {
      const mv = decimalToNumber(h.currentMarketValue);
      const pct = totalAssets > 0 ? mv / totalAssets : 0;
      if (pct > 0.25) {
        const memberName = h.member?.displayName || h.member?.name || "未知";
        alerts.push({
          id: `risk-${++alertIndex}`,
          type: "danger",
          title: `${h.asset.name}持仓集中度高`,
          description: `${memberName}持有的${h.asset.name}占总资产${(pct * 100).toFixed(1)}%，超过25%集中度预警线。`,
          relatedAsset: h.asset.name,
        });
      }
    }

    // Rule 2: Asset type > 40% of total => warning (industry concentration)
    const typeValueMap = new Map<string, number>();
    for (const h of allHoldings) {
      const type = h.asset.type;
      typeValueMap.set(type, (typeValueMap.get(type) || 0) + decimalToNumber(h.currentMarketValue));
    }
    for (const [type, value] of typeValueMap.entries()) {
      const pct = totalAssets > 0 ? value / totalAssets : 0;
      if (pct > 0.4) {
        const typeLabel = mapAssetTypeLabel(type);
        alerts.push({
          id: `risk-${++alertIndex}`,
          type: "warning",
          title: `${typeLabel}资产配置集中`,
          description: `${typeLabel}资产占总投资资产${(pct * 100).toFixed(1)}%，超过40%行业集中预警线。`,
        });
      }
    }

    // Rule 3: Holding loss > 5% => danger (downside risk)
    for (const h of allHoldings) {
      const cr = decimalToNumber(h.cumulativeReturn);
      const mv = decimalToNumber(h.currentMarketValue);
      const costBasis = Math.max(0, mv - cr);
      if (costBasis > 0) {
        const returnRate = cr / costBasis;
        if (returnRate < -0.05) {
          const memberName = h.member?.displayName || h.member?.name || "未知";
          alerts.push({
            id: `risk-${++alertIndex}`,
            type: "danger",
            title: `${h.asset.name}跌幅较大`,
            description: `${memberName}持有的${h.asset.name}浮亏¥${Math.abs(cr).toLocaleString()}，跌幅达${(Math.abs(returnRate) * 100).toFixed(2)}%，已超过5%预警线。`,
            relatedAsset: h.asset.name,
          });
        }
      }
    }

    // Rule 4: Gold > 15% => warning (allocation deviation)
    const goldValue = Array.from(typeValueMap.entries())
      .filter(([type]) => type === "GOLD_ACCUMULATION")
      .reduce((s, [, v]) => s + v, 0);
    if (totalAssets > 0) {
      const goldPct = goldValue / totalAssets;
      if (goldPct > 0.15) {
        alerts.push({
          id: `risk-${++alertIndex}`,
          type: "warning",
          title: "黄金类持仓占比偏高",
          description: `黄金类资产占家庭总资产${(goldPct * 100).toFixed(1)}%，超过建议配置比例15%。`,
          relatedAsset: "黄金",
        });
      }
    }

    return createSuccessResponse(alerts);
  } catch (err) {
    return handleApiError(err);
  }
}

function mapAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    A_SHARE: "股票",
    US_STOCK: "美股",
    ETF: "ETF",
    MUTUAL_FUND: "基金",
    BANK_WEALTH: "银行理财",
    GOLD_ACCUMULATION: "黄金",
    CASH: "现金",
    BOND: "债券",
    OTHER: "其他",
  };
  return map[type] || type;
}
