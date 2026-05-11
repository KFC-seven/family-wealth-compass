import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { confirmTransactionRecords } from "@/server/import/transaction-saver";
import type { AccountType } from "@/generated/prisma/client";

function inferAccountType(name: string, sourcePlatform: string): AccountType {
  const n = name.toLowerCase();
  if (n.includes("支付宝") || sourcePlatform === "ALIPAY") return "ALIPAY_FUND";
  if (n.includes("证券") || n.includes("券商") || n.includes("华泰") || sourcePlatform === "BROKER") return "BROKER";
  if (n.includes("银行") || n.includes("招商") || n.includes("工商") || sourcePlatform === "BANK") return "BANK";
  if (n.includes("黄金") || n.includes("积存")) return "GOLD";
  if (n.includes("现金") || n.includes("活期")) return "CASH";
  return "OTHER";
}

function inferPlatform(sourcePlatform: string): string | null {
  if (sourcePlatform === "ALIPAY") return "支付宝";
  if (sourcePlatform === "BROKER") return "券商";
  if (sourcePlatform === "BANK") return "银行";
  return null;
}

/**
 * 确认保存导入结果。
 * 支持 HOLDING_SNAPSHOT 和 TRANSACTION_RECORD 两种模式。
 *
 * Phase 18: TRANSACTION_RECORD 完善支持全部 8 种交易类型
 * （BUY/SELL/DIVIDEND/INTEREST/DEPOSIT/WITHDRAW/FEE/ADJUSTMENT）
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    const body = await req.json();
    const saveMode = body.saveMode ?? session.saveMode;

    // 获取所有非 IGNORE 行
    const rows = await prisma.recognizedImportRow.findMany({
      where: {
        importSessionId: sessionId,
        action: { not: "IGNORE" },
        status: { not: "IGNORED" },
      },
    });

    let savedCount = 0;
    let ignoreCount = 0;

    if (saveMode === "HOLDING_SNAPSHOT") {
      for (const row of rows) {
        try {
          if (!row.assetName?.trim()) { ignoreCount++; continue; }

          let asset = await prisma.asset.findFirst({
            where: row.assetCode
              ? { type: row.assetType as any, code: row.assetCode }
              : { name: row.assetName, type: row.assetType as any },
          });

          if (!asset) {
            asset = await prisma.asset.create({
              data: {
                name: row.assetName,
                code: row.assetCode ?? null,
                type: (row.assetType as any) ?? "OTHER",
                currency: row.currency ?? "CNY",
                market: row.market ?? null,
              },
            });
          }

          const householdId = session.householdId;

          // Resolve member: row.memberId is a name string, not UUID
          let member = row.memberId
            ? (await prisma.member.findFirst({ where: { householdId, name: row.memberId } })) ?? null
            : null;
          if (!member) {
            member = await prisma.member.findFirst({ where: { householdId } });
          }
          if (!member) { ignoreCount++; continue; }
          const memberId = member.id;

          // Resolve account: row.accountId is a name string, not UUID
          let account = row.accountId
            ? (await prisma.account.findFirst({ where: { memberId, name: row.accountId } })) ?? null
            : null;
          if (!account) {
            // Auto-create account if not found
            const accountName = row.accountId || "默认账户";
            const accountType = inferAccountType(accountName, session.sourcePlatform);
            const platform = inferPlatform(session.sourcePlatform);
            account = await prisma.account.create({
              data: {
                householdId,
                memberId,
                name: accountName,
                type: accountType,
                platform,
              },
            });
          }
          const accountId = account.id;

          const qty = row.quantity ? parseFloat(row.quantity.toString()) : 0;
          const price = row.price ? parseFloat(row.price.toString()) : 0;
          const mv = row.marketValue ? parseFloat(row.marketValue.toString()) : qty * price;
          // Use OCR-provided holdingReturn if available, otherwise compute from cost
          const ocrReturn = row.holdingReturn != null ? parseFloat(row.holdingReturn.toString()) : null;
          let cost = row.cost ? parseFloat(row.cost.toString()) : 0;
          // If no cost but holdingReturn is available, infer cost from marketValue - return
          if (cost === 0 && ocrReturn != null) {
            cost = mv - ocrReturn;
          }
          const holdingReturn = ocrReturn ?? (mv - cost);

          const existing = await prisma.holding.findFirst({
            where: { memberId, accountId, assetId: asset.id, status: "CURRENT" },
          });

          if (existing) {
            await prisma.holding.update({
              where: { id: existing.id },
              data: {
                quantity: qty > 0 ? qty : undefined,
                currentPrice: price > 0 ? price : undefined,
                currentMarketValue: mv,
                remainingCost: cost > 0 ? cost : undefined,
                averageCost: cost > 0 && qty > 0 ? cost / qty : undefined,
                holdingReturn,
                cumulativeReturn: holdingReturn + parseFloat(existing.realizedReturn.toString()),
                latestPriceDate: row.dataDate ?? new Date(),
              },
            });
          } else {
            const avgCost = qty > 0 ? cost / qty : 0;
            await prisma.holding.create({
              data: {
                householdId,
                memberId,
                accountId,
                assetId: asset.id,
                status: "CURRENT",
                quantity: qty,
                currentPrice: price,
                currentMarketValue: mv,
                remainingCost: cost,
                averageCost: avgCost,
                holdingReturn,
                realizedReturn: 0,
                cumulativeReturn: holdingReturn,
                latestPriceDate: row.dataDate ?? new Date(),
              },
            });
          }

          if (price > 0) {
            const priceDate = row.dataDate ?? new Date();
            const dateOnly = new Date(priceDate.toISOString().slice(0, 10));
            await prisma.priceSnapshot.upsert({
              where: { assetId_date: { assetId: asset.id, date: dateOnly } },
              update: { price, currency: row.currency ?? "CNY", source: "IMPORT" },
              create: { assetId: asset.id, date: dateOnly, price, currency: row.currency ?? "CNY", source: "IMPORT" },
            });
          }

          savedCount++;
        } catch {
          ignoreCount++;
        }
      }
    }

    if (saveMode === "TRANSACTION_RECORD") {
      const result = await confirmTransactionRecords(session.householdId, rows);
      savedCount = result.savedCount;
      ignoreCount = result.ignoreCount;
    }

    // 更新 session
    const ignoredRows = await prisma.recognizedImportRow.count({
      where: { importSessionId: sessionId, action: "IGNORE" },
    });

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: "SAVED",
        savedRowCount: savedCount,
        ignoredRowCount: ignoreCount + ignoredRows,
        savedAt: new Date(),
      },
    });

    return createSuccessResponse({
      savedCount,
      ignoreCount: ignoreCount + ignoredRows,
      totalRows: rows.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
