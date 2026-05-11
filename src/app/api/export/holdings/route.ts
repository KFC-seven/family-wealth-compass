import { prisma } from "@/server/db/prisma";
import { handleApiError } from "@/server/api/response";
import { formatAssetType } from "@/types/finance";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    const where: Record<string, unknown> = { status: "CURRENT" };
    if (memberId && memberId !== "all") {
      where.memberId = memberId;
    }

    const holdings = await prisma.holding.findMany({
      where,
      include: {
        member: { select: { name: true } },
        account: { select: { name: true } },
        asset: { select: { name: true, code: true, type: true } },
      },
      orderBy: [{ member: { name: "asc" } }, { account: { name: "asc" } }],
    });

    const rows = holdings.map((h) => {
      const mv = parseFloat(h.currentMarketValue.toString());
      const hRet = parseFloat(h.holdingReturn.toString());
      const cost = parseFloat(h.remainingCost.toString());
      const qty = parseFloat(h.quantity.toString());
      const rate = cost > 0 ? (hRet / cost) * 100 : mv > 0 ? (hRet / (mv - hRet)) * 100 : 0;

      return {
        成员: h.member?.name ?? "",
        账户: h.account?.name ?? "",
        资产名称: h.asset?.name ?? "",
        代码: h.asset?.code ?? "",
        类型: formatAssetType(h.asset?.type ?? ""),
        数量: qty,
        均价: qty > 0 ? parseFloat(h.averageCost.toString()) : 0,
        成本: cost,
        市值: mv,
        持仓收益: hRet,
        收益率: `${rate.toFixed(2)}%`,
        币种: "CNY",
        最新价格: parseFloat(h.currentPrice.toString()),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["成员", "账户", "资产名称", "代码", "类型", "数量", "均价", "成本", "市值", "持仓收益", "收益率", "币种", "最新价格"],
    });

    // Column widths
    ws["!cols"] = [
      { wch: 10 }, { wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 8 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "持仓数据");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const today = new Date().toISOString().slice(0, 10);
    const label = memberId && memberId !== "all"
      ? holdings[0]?.member?.name ?? "成员"
      : "家庭财富";
    const filename = `${label}_持仓_${today}.xlsx`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

