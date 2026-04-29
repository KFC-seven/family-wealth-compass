import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

/**
 * 确认保存导入结果。
 * 支持 HOLDING_SNAPSHOT 和 TRANSACTION_RECORD 两种模式。
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

    // Upload API secret
    const secret = process.env.UPLOAD_API_SECRET;
    if (secret) {
      const provided = req.headers.get("x-upload-api-secret");
      if (provided !== secret) {
        return createErrorResponse({ code: "UNAUTHORIZED", message: "UPLOAD_API_SECRET 校验失败" }, 401);
      }
    }

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
          // 跳过无资产名的行
          if (!row.assetName?.trim()) {
            ignoreCount++;
            continue;
          }

          // 1. 查找或创建 Asset
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
                type: row.assetType as any ?? "OTHER",
                currency: row.currency ?? "CNY",
              },
            });
          }

          // 2. 查找或创建 Holding
          const householdId = session.householdId;

          // 查找 member (按名字匹配)
          let memberId: string | null = row.memberId;
          if (!memberId) {
            const m = await prisma.member.findFirst({ where: { householdId } });
            memberId = m?.id ?? null;
          }

          if (!memberId) {
            ignoreCount++;
            continue;
          }

          // 查找 account
          let accountId: string | null = row.accountId;
          if (!accountId) {
            const acc = await prisma.account.findFirst({
              where: { memberId, householdId },
            });
            accountId = acc?.id ?? null;
          }

          if (!accountId) {
            ignoreCount++;
            continue;
          }

          const qty = row.quantity ? parseFloat(row.quantity.toString()) : 0;
          const price = row.price ? parseFloat(row.price.toString()) : 0;
          const mv = row.marketValue ? parseFloat(row.marketValue.toString()) : qty * price;
          const cost = row.cost ? parseFloat(row.cost.toString()) : 0;

          // 查找现有 CURRENT Holding
          const existing = await prisma.holding.findFirst({
            where: {
              memberId,
              accountId,
              assetId: asset.id,
              status: "CURRENT",
            },
          });

          if (existing) {
            await prisma.holding.update({
              where: { id: existing.id },
              data: {
                quantity: qty > 0 ? qty : undefined,
                currentPrice: price > 0 ? price : undefined,
                currentMarketValue: mv,
                remainingCost: cost > 0 ? cost : undefined,
                holdingReturn: mv - cost,
                cumulativeReturn: mv - cost + parseFloat(existing.realizedReturn.toString()),
                latestPriceDate: row.dataDate ?? new Date(),
              },
            });
          } else {
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
                averageCost: qty > 0 ? cost / qty : 0,
                holdingReturn: mv - cost,
                realizedReturn: 0,
                cumulativeReturn: mv - cost,
                latestPriceDate: row.dataDate ?? new Date(),
              },
            });
          }

          // 3. 写入 PriceSnapshot
          if (price > 0) {
            const priceDate = row.dataDate ?? new Date();
            await prisma.priceSnapshot.upsert({
              where: { assetId_date: { assetId: asset.id, date: priceDate } },
              update: { price, currency: row.currency ?? "CNY", source: "IMPORT" },
              create: {
                assetId: asset.id,
                date: priceDate,
                price,
                currency: row.currency ?? "CNY",
                source: "IMPORT",
              },
            });
          }

          savedCount++;
        } catch {
          ignoreCount++;
        }
      }
    }

    if (saveMode === "TRANSACTION_RECORD") {
      // 基础交易保存结构
      const defaultType = body.defaultTransactionType ?? "BUY";
      const householdId = session.householdId;

      for (const row of rows) {
        try {
          if (!row.assetName?.trim()) { ignoreCount++; continue; }
          const m = await prisma.member.findFirst({ where: { householdId } });
          if (!m) { ignoreCount++; continue; }
          const acc = await prisma.account.findFirst({ where: { memberId: m.id } });
          if (!acc) { ignoreCount++; continue; }

          const netAmount = row.marketValue
            ? parseFloat(row.marketValue.toString())
            : row.price
              ? parseFloat(row.price.toString()) * (row.quantity ? parseFloat(row.quantity.toString()) : 1)
              : 0;

          await prisma.transaction.create({
            data: {
              householdId,
              memberId: m.id,
              accountId: acc.id,
              type: defaultType as any,
              tradeDate: row.dataDate ?? new Date(),
              quantity: row.quantity ? parseFloat(row.quantity.toString()) : null,
              price: row.price ? parseFloat(row.price.toString()) : null,
              grossAmount: netAmount,
              netAmount,
              currency: row.currency ?? "CNY",
              source: "IMPORT",
              note: row.note ?? undefined,
            },
          });
          savedCount++;
        } catch {
          ignoreCount++;
        }
      }
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
