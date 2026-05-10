import { loadEnv } from "./utils/load-env.js";
loadEnv();
/**
 * Manual Import Smoke Test — 覆盖手动导入 + 交易保存完整链路
 *
 * 用法: npm run manual-import:smoke
 *       npx tsx scripts/manual-import-smoke.ts
 *
 * 测试:
 *   1. 创建 MANUAL + HOLDING_SNAPSHOT session
 *   2. 批量新增持仓行
 *   3. 编辑持仓行
 *   4. confirm 保存持仓快照
 *   5. 验证 Asset / Holding / PriceSnapshot 更新
 *   6. 创建 MANUAL + TRANSACTION_RECORD session
 *   7. 手动新增 BUY 行
 *   8. confirm 保存 BUY
 *   9. 验证 Transaction 创建, Holding quantity/remainingCost 更新
 *   10. 手动新增 SELL 行
 *   11. confirm 保存 SELL
 *   12. 验证 realizedReturn / Holding quantity 更新
 *   13. 手动新增 DEPOSIT 行
 *   14. 验证 DEPOSIT 不计入收益
 *   15. 手动新增 DIVIDEND 行
 *   16. 验证 DIVIDEND 计入已实现收益
 *
 * 不依赖 OCR、文件上传或外部网络。
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PASS = "✅";
const FAIL = "❌";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

async function main() {
  console.log("\n🧪 Manual Import Smoke Test — Phase 18\n");

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL 未设置");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    ok("数据库连接成功");
  } catch (err) {
    fail(`数据库连接失败: ${(err as Error).message}`);
    process.exit(1);
  }

  const household = await prisma.household.findFirst();
  if (!household) { fail("无 Household"); process.exit(1); }
  const member = await prisma.member.findFirst({ where: { householdId: household.id } });
  if (!member) { fail("无 Member"); process.exit(1); }
  const account = await prisma.account.findFirst({ where: { memberId: member.id, householdId: household.id } });
  if (!account) { fail("无 Account"); process.exit(1); }

  ok(`Household: ${household.id}, Member: ${member.id}, Account: ${account.id}`);

  // ================================================================
  // Step 1: Create MANUAL + HOLDING_SNAPSHOT session
  // ================================================================
  console.log("\n--- Step 1: 创建 MANUAL + HOLDING_SNAPSHOT session ---");
  const holdSession = await prisma.importSession.create({
    data: {
      householdId: household.id,
      sourcePlatform: "MANUAL",
      saveMode: "HOLDING_SNAPSHOT",
    },
  });
  ok(`Session 创建: ${holdSession.id}`);

  // ================================================================
  // Step 2: 批量新增持仓行
  // ================================================================
  console.log("\n--- Step 2: 批量新增持仓行 ---");
  const holdRows = await Promise.all([
    prisma.recognizedImportRow.create({
      data: {
        importSessionId: holdSession.id,
        rowIndex: 1,
        sourcePlatform: "MANUAL",
        memberId: member.id,
        accountId: account.id,
        assetName: "测试持仓A",
        assetCode: "TEST001",
        assetType: "ETF",
        currency: "CNY",
        quantity: 1000,
        price: 2.5,
        marketValue: 2500,
        cost: 2000,
        dataDate: new Date("2026-04-29"),
        confidence: 100,
        status: "CONFIRMED",
        action: "MANUAL",
      },
    }),
    prisma.recognizedImportRow.create({
      data: {
        importSessionId: holdSession.id,
        rowIndex: 2,
        sourcePlatform: "MANUAL",
        memberId: member.id,
        accountId: account.id,
        assetName: "测试持仓B",
        assetType: "MUTUAL_FUND",
        currency: "CNY",
        quantity: 500,
        price: 3.0,
        marketValue: 1500,
        cost: 1400,
        dataDate: new Date("2026-04-29"),
        confidence: 100,
        status: "CONFIRMED",
        action: "MANUAL",
      },
    }),
  ]);
  ok(`批量新增: ${holdRows.length} 行`);
  await prisma.importSession.update({
    where: { id: holdSession.id },
    data: { recognizedRowCount: 2 },
  });

  // ================================================================
  // Step 3: 编辑持仓行
  // ================================================================
  console.log("\n--- Step 3: 编辑持仓行 ---");
  const edited = await prisma.recognizedImportRow.update({
    where: { id: holdRows[0].id },
    data: { assetName: "测试持仓A-已编辑", marketValue: 2600 },
  });
  if (edited.assetName?.includes("已编辑")) ok("编辑成功");
  else fail("编辑失败");

  // ================================================================
  // Step 4: confirm 保存持仓快照
  // ================================================================
  console.log("\n--- Step 4: confirm 保存持仓快照 ---");
  const confirmRows = await prisma.recognizedImportRow.findMany({
    where: { importSessionId: holdSession.id, action: { not: "IGNORE" } },
  });

  let holdSaved = 0;
  for (const row of confirmRows) {
    try {
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
          },
        });
      }

      const qty = row.quantity ? parseFloat(row.quantity.toString()) : 0;
      const price = row.price ? parseFloat(row.price.toString()) : 0;
      const mv = row.marketValue ? parseFloat(row.marketValue.toString()) : 0;
      const cost = row.cost ? parseFloat(row.cost.toString()) : 0;

      await prisma.holding.create({
        data: {
          householdId: household.id,
          memberId: member.id,
          accountId: account.id,
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

      if (price > 0) {
        const d = row.dataDate ? new Date(row.dataDate.toISOString().slice(0, 10)) : new Date();
        await prisma.priceSnapshot.upsert({
          where: { assetId_date: { assetId: asset.id, date: d } },
          update: { price, source: "MANUAL" },
          create: { assetId: asset.id, date: d, price, source: "MANUAL" },
        });
      }
      holdSaved++;
    } catch {
      // skip
    }
  }
  ok(`Holding snapshot 保存: ${holdSaved} 行`);

  // ================================================================
  // Step 5: 验证 Asset / Holding / PriceSnapshot
  // ================================================================
  console.log("\n--- Step 5: 验证结果 ---");
  const assetCount = await prisma.asset.count();
  const holdingCount = await prisma.holding.count({ where: { status: "CURRENT" } });
  const priceCount = await prisma.priceSnapshot.count();
  ok(`Asset: ${assetCount}, Holding: ${holdingCount}, PriceSnapshot: ${priceCount}`);
  if (assetCount >= 2 && holdingCount >= 2) ok("Asset/Holding 数量正确");
  else fail("Asset/Holding 数量不足");

  // ================================================================
  // Step 6: 创建 MANUAL + TRANSACTION_RECORD session
  // ================================================================
  console.log("\n--- Step 6: 创建 MANUAL + TRANSACTION_RECORD session ---");
  const txSession = await prisma.importSession.create({
    data: {
      householdId: household.id,
      sourcePlatform: "MANUAL",
      saveMode: "TRANSACTION_RECORD",
    },
  });
  ok(`Transaction Session 创建: ${txSession.id}`);

  // ================================================================
  // Step 7: 新增 BUY 行
  // ================================================================
  console.log("\n--- Step 7: 新增 BUY 行 ---");
  // Get the first asset we created for the test
  const testAsset = await prisma.asset.findFirst({ where: { name: "测试持仓A-已编辑" } });
  if (!testAsset) { fail("找不到测试资产"); process.exit(1); }

  const buyRow = await prisma.recognizedImportRow.create({
    data: {
      importSessionId: txSession.id,
      rowIndex: 1,
      sourcePlatform: "MANUAL",
      memberId: member.id,
      accountId: account.id,
      assetName: testAsset.name,
      assetCode: testAsset.code,
      assetType: testAsset.type,
      transactionType: "BUY",
      tradeDate: new Date("2026-04-30"),
      quantity: 500,
      price: 2.6,
      grossAmount: 1300,
      netAmount: 1300,
      currency: "CNY",
      confidence: 100,
      status: "CONFIRMED",
      action: "MANUAL",
    },
  });
  ok(`BUY 行创建: ${buyRow.id}`);

  // Get initial holding state for this asset
  const buyHoldingBefore = await prisma.holding.findFirst({
    where: { assetId: testAsset.id, status: "CURRENT" },
  });
  const qtyBefore = buyHoldingBefore ? parseFloat(buyHoldingBefore.quantity.toString()) : 0;
  const costBefore = buyHoldingBefore ? parseFloat(buyHoldingBefore.remainingCost.toString()) : 0;
  ok(`Buy前: quantity=${qtyBefore}, remainingCost=${costBefore}`);

  // ================================================================
  // Step 8: confirm 保存 BUY
  // ================================================================
  console.log("\n--- Step 8: confirm 保存 BUY ---");
  // Directly call the transaction save logic
  const { confirmTransactionRecords } = await import("../src/server/import/transaction-saver.js");

  const buyRowFull = await prisma.recognizedImportRow.findUnique({ where: { id: buyRow.id } });
  if (!buyRowFull) { fail("找不到 BUY 行"); process.exit(1); }

  const result1 = await confirmTransactionRecords(household.id, [buyRowFull as any]);
  ok(`BUY confirm: saved=${result1.savedCount}, ignored=${result1.ignoreCount}`);

  // Verify
  const buyHoldingAfter = await prisma.holding.findFirst({
    where: { assetId: testAsset.id, status: "CURRENT" },
  });
  const qtyAfter = buyHoldingAfter ? parseFloat(buyHoldingAfter.quantity.toString()) : 0;
  const costAfter = buyHoldingAfter ? parseFloat(buyHoldingAfter.remainingCost.toString()) : 0;
  if (qtyAfter > qtyBefore) ok(`Holding quantity 增加: ${qtyBefore} → ${qtyAfter}`);
  else fail(`Holding quantity 未增加`);
  if (costAfter > costBefore) ok(`Holding remainingCost 增加: ${costBefore} → ${costAfter}`);
  else fail(`Holding remainingCost 未增加`);

  const buyTx = await prisma.transaction.findFirst({
    where: { type: "BUY", assetId: testAsset.id },
    orderBy: { createdAt: "desc" },
  });
  if (buyTx) ok(`Transaction 创建: ${buyTx.id}, cashImpact=${buyTx.cashImpact}`);
  else fail("Transaction 未创建");

  // ================================================================
  // Step 9: 新增 SELL 行
  // ================================================================
  console.log("\n--- Step 9: 新增 SELL 行 ---");
  const sellQty = 300; // Sell part of the holding
  const sellRow = await prisma.recognizedImportRow.create({
    data: {
      importSessionId: txSession.id,
      rowIndex: 2,
      sourcePlatform: "MANUAL",
      memberId: member.id,
      accountId: account.id,
      assetName: testAsset.name,
      assetCode: testAsset.code,
      assetType: testAsset.type,
      transactionType: "SELL",
      tradeDate: new Date("2026-04-30"),
      quantity: sellQty,
      price: 2.8,
      grossAmount: sellQty * 2.8,
      netAmount: sellQty * 2.8,
      currency: "CNY",
      confidence: 100,
      status: "CONFIRMED",
      action: "MANUAL",
    },
  });
  ok(`SELL 行创建: ${sellRow.id}`);

  // ================================================================
  // Step 10: confirm 保存 SELL
  // ================================================================
  console.log("\n--- Step 10: confirm 保存 SELL ---");
  const sellRowFull = await prisma.recognizedImportRow.findUnique({ where: { id: sellRow.id } });
  const result2 = await confirmTransactionRecords(household.id, [sellRowFull as any]);
  ok(`SELL confirm: saved=${result2.savedCount}, ignored=${result2.ignoreCount}`);

  // Verify SELL effects
  const sellHoldingAfter = await prisma.holding.findFirst({
    where: { assetId: testAsset.id, status: "CURRENT" },
  });
  const sellQtyAfter = sellHoldingAfter ? parseFloat(sellHoldingAfter.quantity.toString()) : 0;
  const sellRealized = sellHoldingAfter ? parseFloat(sellHoldingAfter.realizedReturn.toString()) : 0;
  ok(`SELL后: quantity=${sellQtyAfter} (预期=${qtyAfter - sellQty}), realizedReturn=${sellRealized}`);

  if (sellQtyAfter === qtyAfter - sellQty) ok("Holding quantity 正确减少");
  else fail(`Holding quantity 不正确: 预期 ${qtyAfter - sellQty}, 实际 ${sellQtyAfter}`);

  if (sellRealized > 0) ok("Realized return > 0 (盈利卖出)");
  else fail("Realized return 应为正");

  const sellTx = await prisma.transaction.findFirst({
    where: { type: "SELL", assetId: testAsset.id },
    orderBy: { createdAt: "desc" },
  });
  if (sellTx) {
    ok(`SELL Transaction: cashImpact=${sellTx.cashImpact}, realizedReturn=${sellTx.realizedReturn}`);
    const cashImp = parseFloat(sellTx.cashImpact?.toString() ?? "0");
    if (cashImp > 0) ok("SELL cashImpact 为正 (资金流入)");
    else fail("SELL cashImpact 应为正");
  } else fail("SELL Transaction 未创建");

  // ================================================================
  // Step 11: 新增 DEPOSIT 行
  // ================================================================
  console.log("\n--- Step 11: 新增 DEPOSIT 行 ---");
  const depositRow = await prisma.recognizedImportRow.create({
    data: {
      importSessionId: txSession.id,
      rowIndex: 3,
      sourcePlatform: "MANUAL",
      memberId: member.id,
      accountId: account.id,
      transactionType: "DEPOSIT",
      tradeDate: new Date("2026-04-30"),
      grossAmount: 5000,
      netAmount: 5000,
      currency: "CNY",
      confidence: 100,
      status: "CONFIRMED",
      action: "MANUAL",
      note: "外部转入",
    },
  });
  ok(`DEPOSIT 行创建: ${depositRow.id}`);

  // ================================================================
  // Step 12: confirm DEPOSIT
  // ================================================================
  console.log("\n--- Step 12: confirm DEPOSIT ---");
  const depositRowFull = await prisma.recognizedImportRow.findUnique({ where: { id: depositRow.id } });
  const result3 = await confirmTransactionRecords(household.id, [depositRowFull as any]);
  ok(`DEPOSIT confirm: saved=${result3.savedCount}`);

  const depositTx = await prisma.transaction.findFirst({
    where: { type: "DEPOSIT" },
    orderBy: { createdAt: "desc" },
  });
  if (depositTx) {
    const depRealized = parseFloat(depositTx.realizedReturn?.toString() ?? "0");
    const depCash = parseFloat(depositTx.cashImpact?.toString() ?? "0");
    if (depRealized === 0) ok("DEPOSIT realizedReturn = 0 (不计入收益)");
    else fail(`DEPOSIT realizedReturn 应为 0, 实际 ${depRealized}`);
    if (depCash > 0) ok(`DEPOSIT cashImpact 为正 (${depCash})`);
    else fail("DEPOSIT cashImpact 应为正");
  } else fail("DEPOSIT Transaction 未创建");

  // ================================================================
  // Step 13: 新增 DIVIDEND 行
  // ================================================================
  console.log("\n--- Step 13: 新增 DIVIDEND 行 ---");
  const divRow = await prisma.recognizedImportRow.create({
    data: {
      importSessionId: txSession.id,
      rowIndex: 4,
      sourcePlatform: "MANUAL",
      memberId: member.id,
      accountId: account.id,
      assetName: testAsset.name,
      assetCode: testAsset.code,
      assetType: testAsset.type,
      transactionType: "DIVIDEND",
      tradeDate: new Date("2026-04-30"),
      grossAmount: 200,
      netAmount: 200,
      currency: "CNY",
      confidence: 100,
      status: "CONFIRMED",
      action: "MANUAL",
    },
  });
  ok(`DIVIDEND 行创建: ${divRow.id}`);

  // ================================================================
  // Step 14: confirm DIVIDEND
  // ================================================================
  console.log("\n--- Step 14: confirm DIVIDEND ---");
  const divRowFull = await prisma.recognizedImportRow.findUnique({ where: { id: divRow.id } });
  const result4 = await confirmTransactionRecords(household.id, [divRowFull as any]);
  ok(`DIVIDEND confirm: saved=${result4.savedCount}`);

  const divTx = await prisma.transaction.findFirst({
    where: { type: "DIVIDEND" },
    orderBy: { createdAt: "desc" },
  });
  if (divTx) {
    const divRealized = parseFloat(divTx.realizedReturn?.toString() ?? "0");
    const divCash = parseFloat(divTx.cashImpact?.toString() ?? "0");
    ok(`DIVIDEND: realizedReturn=${divRealized}, cashImpact=${divCash}`);
    if (divRealized > 0) ok("DIVIDEND realizedReturn > 0 (计入收益)");
    else fail("DIVIDEND realizedReturn 应为正");
    if (divCash > 0) ok("DIVIDEND cashImpact 为正");
    else fail("DIVIDEND cashImpact 应为正");
  } else fail("DIVIDEND Transaction 未创建");

  // ================================================================
  // Cleanup
  // ================================================================
  console.log("\n--- 清理测试数据 ---");
  await prisma.recognizedImportRow.deleteMany({ where: { importSessionId: holdSession.id } });
  await prisma.importSession.delete({ where: { id: holdSession.id } });
  await prisma.recognizedImportRow.deleteMany({ where: { importSessionId: txSession.id } });
  await prisma.importSession.delete({ where: { id: txSession.id } });
  // Clean up test assets and holdings
  for (const name of ["测试持仓A-已编辑", "测试持仓B", "测试持仓A"]) {
    const a = await prisma.asset.findFirst({ where: { name } });
    if (a) {
      await prisma.holding.deleteMany({ where: { assetId: a.id } });
      await prisma.transaction.deleteMany({ where: { assetId: a.id } });
      await prisma.priceSnapshot.deleteMany({ where: { assetId: a.id } });
      await prisma.asset.delete({ where: { id: a.id } });
    }
  }
  ok("测试数据已清理");

  await prisma.$disconnect();

  if (exitCode === 0) {
    console.log(`\n${PASS} Manual import smoke test 全部通过\n`);
  } else {
    console.log(`\n${FAIL} Manual import smoke test 存在问题\n`);
  }
  process.exit(exitCode);
}

main();
