/**
 * 交易记录保存逻辑（Phase 18）
 *
 * 支持 8 种交易类型：
 *   BUY, SELL, DIVIDEND, INTEREST, DEPOSIT, WITHDRAW, FEE, ADJUSTMENT
 *
 * 严格遵循 docs/product/return-calculation-spec.md 的收益口径。
 */
import { prisma } from "@/server/db/prisma";
import type { RecognizedImportRow } from "@/generated/prisma/client";

type Row = Pick<
  RecognizedImportRow,
  | "id" | "memberId" | "accountId" | "assetName" | "assetCode" | "assetType"
  | "currency" | "market" | "quantity" | "price" | "marketValue" | "cost"
  | "dataDate" | "note" | "transactionType" | "tradeDate"
  | "grossAmount" | "fee" | "tax" | "netAmount" | "cashImpact" | "realizedReturn"
>;

interface SaveResult {
  saved: boolean;
  skipped: boolean;
  reason?: string;
  transactionId?: string;
  holdingId?: string;
}

function n(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const num = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(num) ? 0 : num;
}

function tradeDate(row: Row): Date {
  return row.tradeDate ?? row.dataDate ?? new Date();
}

function dataSrc(row: Row): "IMPORT" | "MANUAL" {
  const sp = (row as any).sourcePlatform;
  return sp === "MANUAL" ? "MANUAL" : "IMPORT";
}

/** 查找或创建 Asset */
async function findOrCreateAsset(row: Row) {
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
  return asset;
}

/** 查找 Holding（必须存在用于 BUY/SELL/DIVIDEND） */
async function findHolding(
  householdId: string,
  memberId: string,
  accountId: string,
  assetId: string,
) {
  return prisma.holding.findFirst({
    where: { householdId, memberId, accountId, assetId, status: "CURRENT" },
  });
}

/** 创建 Holding */
async function createHolding(
  householdId: string,
  memberId: string,
  accountId: string,
  assetId: string,
  data: {
    quantity?: number;
    averageCost?: number;
    remainingCost?: number;
    currentPrice?: number;
    currentMarketValue?: number;
    holdingReturn?: number;
    realizedReturn?: number;
  },
) {
  return prisma.holding.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId,
      status: "CURRENT",
      quantity: data.quantity ?? 0,
      averageCost: data.averageCost ?? 0,
      remainingCost: data.remainingCost ?? 0,
      currentPrice: data.currentPrice ?? 0,
      currentMarketValue: data.currentMarketValue ?? 0,
      holdingReturn: data.holdingReturn ?? 0,
      realizedReturn: data.realizedReturn ?? 0,
      cumulativeReturn: (data.holdingReturn ?? 0) + (data.realizedReturn ?? 0),
      latestPriceDate: new Date(),
    },
  });
}

/** 写入价格快照 */
async function writePrice(assetId: string, date: Date, price: number, currency: string, source: "IMPORT" | "MANUAL") {
  if (price <= 0) return;
  const dateOnly = new Date(date.toISOString().slice(0, 10));
  await prisma.priceSnapshot.upsert({
    where: { assetId_date: { assetId, date: dateOnly } },
    update: { price, currency, source },
    create: { assetId, date: dateOnly, price, currency, source },
  });
}

// ============================================================
// 各交易类型处理
// ============================================================

async function saveBuy(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const qty = n(row.quantity);
  const price = n(row.price);
  const gross = n(row.grossAmount) || qty * price;
  const fee = n(row.fee);
  const tax = n(row.tax);
  const netAmount = n(row.netAmount) || gross - fee - tax; // netAmount is positive for buy (amount paid)
  const cashImpact = -(netAmount); // cash goes out

  if (qty <= 0) return { saved: false, skipped: true, reason: "BUY 数量必须 > 0" };

  const asset = await findOrCreateAsset(row);

  // 查找或创建 CURRENT Holding
  let holding = await findHolding(householdId, memberId, accountId, asset.id);
  if (!holding) {
    holding = await createHolding(householdId, memberId, accountId, asset.id, {});
  }

  // 平均成本法：新平均成本 = (旧剩余成本 + 买入净成本) / (旧数量 + 买入数量)
  const oldQty = n(holding.quantity);
  const oldCost = n(holding.remainingCost);
  const newQty = oldQty + qty;
  const newRemainingCost = oldCost + netAmount; // 买入成本 = netAmount (费用已含)
  const newAvgCost = newQty > 0 ? newRemainingCost / newQty : 0;

  const currentPrice = price > 0 ? price : n(holding.currentPrice);
  const newMv = newQty * currentPrice;
  const holdingReturn = newMv - newRemainingCost;
  const cumulativeReturn = holdingReturn + n(holding.realizedReturn);

  await prisma.holding.update({
    where: { id: holding.id },
    data: {
      quantity: newQty,
      averageCost: newAvgCost,
      remainingCost: newRemainingCost,
      currentPrice,
      currentMarketValue: newMv,
      holdingReturn,
      cumulativeReturn,
      latestPriceDate: tradeDate(row),
    },
  });

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset.id,
      holdingId: holding.id,
      type: "BUY",
      tradeDate: tradeDate(row),
      quantity: qty,
      price,
      grossAmount: gross,
      fee,
      tax,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact,
      realizedReturn: 0,
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  await writePrice(asset.id, tradeDate(row), price, row.currency ?? "CNY", dataSrc(row));

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holding.id };
}

async function saveSell(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const qty = n(row.quantity);
  const price = n(row.price);
  const gross = n(row.grossAmount) || qty * price;
  const fee = n(row.fee);
  const tax = n(row.tax);
  const netAmount = n(row.netAmount) || gross - fee - tax;
  const cashImpact = netAmount; // cash comes in

  if (qty <= 0) return { saved: false, skipped: true, reason: "SELL 数量必须 > 0" };

  const asset = await findOrCreateAsset(row);
  const holding = await findHolding(householdId, memberId, accountId, asset.id);
  if (!holding) return { saved: false, skipped: true, reason: `找不到 CURRENT Holding: ${row.assetName}` };

  const oldQty = n(holding.quantity);
  if (qty > oldQty) return { saved: false, skipped: true, reason: `卖出数量 ${qty} 超过持仓数量 ${oldQty}` };

  // 平均成本法：卖出部分成本 = 平均成本 × 卖出数量
  const avgCost = n(holding.averageCost);
  const soldCost = avgCost * qty;
  const realizedReturn = netAmount - soldCost;

  const newQty = oldQty - qty;
  const newRemainingCost = n(holding.remainingCost) - soldCost;
  const isCleared = newQty <= 0;

  const currentPrice = price > 0 ? price : n(holding.currentPrice);
  const newMv = isCleared ? 0 : newQty * currentPrice;
  const holdingReturn = isCleared ? 0 : newMv - newRemainingCost;
  const totalRealized = n(holding.realizedReturn) + realizedReturn;
  const cumulativeReturn = holdingReturn + totalRealized;

  await prisma.holding.update({
    where: { id: holding.id },
    data: {
      quantity: isCleared ? 0 : newQty,
      averageCost: isCleared ? 0 : avgCost,
      remainingCost: isCleared ? 0 : newRemainingCost,
      currentPrice,
      currentMarketValue: newMv,
      holdingReturn,
      realizedReturn: totalRealized,
      cumulativeReturn,
      status: isCleared ? "CLEARED" : "CURRENT",
      clearedAt: isCleared ? tradeDate(row) : null,
      latestPriceDate: tradeDate(row),
    },
  });

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset.id,
      holdingId: holding.id,
      type: "SELL",
      tradeDate: tradeDate(row),
      quantity: qty,
      price,
      grossAmount: gross,
      fee,
      tax,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact,
      realizedReturn,
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  await writePrice(asset.id, tradeDate(row), price, row.currency ?? "CNY", dataSrc(row));

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holding.id };
}

async function saveDividend(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const netAmount = n(row.netAmount) || n(row.grossAmount);
  if (netAmount <= 0) return { saved: false, skipped: true, reason: "DIVIDEND netAmount 必须 > 0" };

  const asset = await findOrCreateAsset(row);
  const holding = await findHolding(householdId, memberId, accountId, asset.id);

  // Update holding's realizedReturn and cumulativeReturn
  if (holding) {
    const newRealized = n(holding.realizedReturn) + netAmount;
    const newCumulative = n(holding.holdingReturn) + newRealized;
    await prisma.holding.update({
      where: { id: holding.id },
      data: { realizedReturn: newRealized, cumulativeReturn: newCumulative },
    });
  }

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset.id,
      holdingId: holding?.id ?? null,
      type: "DIVIDEND",
      tradeDate: tradeDate(row),
      quantity: null,
      price: null,
      grossAmount: netAmount,
      fee: 0,
      tax: 0,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact: netAmount,
      realizedReturn: netAmount,
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holding?.id };
}

async function saveInterest(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const netAmount = n(row.netAmount) || n(row.grossAmount);
  if (netAmount <= 0) return { saved: false, skipped: true, reason: "INTEREST netAmount 必须 > 0" };

  const asset = await findOrCreateAsset(row);
  const holding = await findHolding(householdId, memberId, accountId, asset.id);

  if (holding) {
    const newRealized = n(holding.realizedReturn) + netAmount;
    const newCumulative = n(holding.holdingReturn) + newRealized;
    await prisma.holding.update({
      where: { id: holding.id },
      data: { realizedReturn: newRealized, cumulativeReturn: newCumulative },
    });
  }

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset.id,
      holdingId: holding?.id ?? null,
      type: "INTEREST",
      tradeDate: tradeDate(row),
      quantity: null,
      price: null,
      grossAmount: netAmount,
      fee: 0,
      tax: 0,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact: netAmount,
      realizedReturn: netAmount,
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holding?.id };
}

async function saveDeposit(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const netAmount = n(row.netAmount) || n(row.grossAmount);
  if (netAmount <= 0) return { saved: false, skipped: true, reason: "DEPOSIT netAmount 必须 > 0" };

  // DEPOSIT is NOT return — it's external cash flow
  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: null,
      holdingId: null,
      type: "DEPOSIT",
      tradeDate: tradeDate(row),
      quantity: null,
      price: null,
      grossAmount: netAmount,
      fee: 0,
      tax: 0,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact: netAmount, // cash comes in
      realizedReturn: 0,     // NOT return
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id };
}

async function saveWithdraw(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const netAmount = n(row.netAmount) || n(row.grossAmount);
  if (netAmount <= 0) return { saved: false, skipped: true, reason: "WITHDRAW netAmount 必须 > 0" };

  // WITHDRAW is NOT return — it's external cash flow
  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: null,
      holdingId: null,
      type: "WITHDRAW",
      tradeDate: tradeDate(row),
      quantity: null,
      price: null,
      grossAmount: netAmount,
      fee: 0,
      tax: 0,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact: -netAmount, // cash goes out
      realizedReturn: 0,      // NOT return
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id };
}

async function saveFee(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  const fee = n(row.fee) || n(row.netAmount) || n(row.grossAmount);
  if (fee <= 0) return { saved: false, skipped: true, reason: "FEE 金额必须 > 0" };

  const asset = await findOrCreateAsset(row);
  const holding = await findHolding(householdId, memberId, accountId, asset.id);

  // Fee reduces realized return
  const realizedReturn = -fee;

  if (holding) {
    const newRealized = n(holding.realizedReturn) - fee;
    const newCumulative = n(holding.holdingReturn) + newRealized;
    await prisma.holding.update({
      where: { id: holding.id },
      data: { realizedReturn: newRealized, cumulativeReturn: newCumulative },
    });
  }

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset.id,
      holdingId: holding?.id ?? null,
      type: "FEE",
      tradeDate: tradeDate(row),
      quantity: null,
      price: null,
      grossAmount: fee,
      fee: 0,
      tax: 0,
      netAmount: fee,
      currency: row.currency ?? "CNY",
      cashImpact: -fee,      // cash goes out
      realizedReturn,        // negative = reduces return
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holding?.id };
}

async function saveAdjustment(
  householdId: string,
  row: Row,
  memberId: string,
  accountId: string,
): Promise<SaveResult> {
  if (!row.note?.trim()) {
    return { saved: false, skipped: true, reason: "ADJUSTMENT 必须填写备注" };
  }

  const netAmount = n(row.netAmount) || n(row.grossAmount);
  const cashImpact = n(row.cashImpact) ?? (row.transactionType === "ADJUSTMENT" ? 0 : 0);

  const asset = row.assetName?.trim()
    ? await findOrCreateAsset(row)
    : null;

  let holdingId: string | null = null;
  if (asset) {
    const holding = await findHolding(householdId, memberId, accountId, asset.id);
    holdingId = holding?.id ?? null;
  }

  const tx = await prisma.transaction.create({
    data: {
      householdId,
      memberId,
      accountId,
      assetId: asset?.id ?? null,
      holdingId,
      type: "ADJUSTMENT",
      tradeDate: tradeDate(row),
      quantity: row.quantity ? n(row.quantity) : null,
      price: row.price ? n(row.price) : null,
      grossAmount: netAmount,
      fee: 0,
      tax: 0,
      netAmount,
      currency: row.currency ?? "CNY",
      cashImpact,
      realizedReturn: 0, // Don't auto-infer return
      source: dataSrc(row),
      note: row.note ?? undefined,
    },
  });

  return { saved: true, skipped: false, transactionId: tx.id, holdingId: holdingId ?? undefined };
}

// ============================================================
// 主入口
// ============================================================

interface ConfirmTransactionResult {
  savedCount: number;
  ignoreCount: number;
  details: Array<{ rowId: string; saved: boolean; reason?: string }>;
}

export async function confirmTransactionRecords(
  householdId: string,
  rows: Row[],
): Promise<ConfirmTransactionResult> {
  const result: ConfirmTransactionResult = { savedCount: 0, ignoreCount: 0, details: [] };

  for (const row of rows) {
    try {
      // 获取 member
      let memberId = row.memberId;
      if (!memberId) {
        const m = await prisma.member.findFirst({ where: { householdId } });
        memberId = m?.id ?? null;
      }
      if (!memberId) {
        result.ignoreCount++;
        result.details.push({ rowId: row.id, saved: false, reason: "找不到成员" });
        continue;
      }

      // 获取 account
      let accountId = row.accountId;
      if (!accountId) {
        const acc = await prisma.account.findFirst({ where: { memberId, householdId } });
        accountId = acc?.id ?? null;
      }
      if (!accountId) {
        result.ignoreCount++;
        result.details.push({ rowId: row.id, saved: false, reason: "找不到账户" });
        continue;
      }

      // 无资产名且非 DEPOSIT/WITHDRAW/ADJUSTMENT 则跳过
      const txType = row.transactionType ?? "BUY";
      if (!row.assetName?.trim() && ["BUY", "SELL", "DIVIDEND"].includes(txType)) {
        result.ignoreCount++;
        result.details.push({ rowId: row.id, saved: false, reason: "资产名称不能为空" });
        continue;
      }

      let saveResult: SaveResult;

      switch (txType) {
        case "BUY":
          saveResult = await saveBuy(householdId, row, memberId, accountId);
          break;
        case "SELL":
          saveResult = await saveSell(householdId, row, memberId, accountId);
          break;
        case "DIVIDEND":
          saveResult = await saveDividend(householdId, row, memberId, accountId);
          break;
        case "INTEREST":
          saveResult = await saveInterest(householdId, row, memberId, accountId);
          break;
        case "DEPOSIT":
          saveResult = await saveDeposit(householdId, row, memberId, accountId);
          break;
        case "WITHDRAW":
          saveResult = await saveWithdraw(householdId, row, memberId, accountId);
          break;
        case "FEE":
          saveResult = await saveFee(householdId, row, memberId, accountId);
          break;
        case "ADJUSTMENT":
          saveResult = await saveAdjustment(householdId, row, memberId, accountId);
          break;
        default:
          // Fallback: treat unknown as BUY-like
          saveResult = await saveBuy(householdId, row, memberId, accountId);
      }

      if (saveResult.saved) {
        result.savedCount++;
        result.details.push({ rowId: row.id, saved: true });
      } else {
        result.ignoreCount++;
        result.details.push({ rowId: row.id, saved: false, reason: saveResult.reason });
      }
    } catch (err) {
      result.ignoreCount++;
      result.details.push({
        rowId: row.id,
        saved: false,
        reason: (err as Error).message.slice(0, 200),
      });
    }
  }

  return result;
}
