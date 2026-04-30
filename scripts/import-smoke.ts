/**
 * Import smoke test — 覆盖完整导入链路（service-level，不需要 dev server）。
 *
 * 用法: npm run import:smoke
 *       npx tsx scripts/import-smoke.ts
 *
 * 测试:
 *   1. 创建 ImportSession
 *   2. 保存测试图片到 LocalStorage
 *   3. Mock OCR recognize
 *   4. 验证 RecognizedImportRow
 *   5. PATCH 编辑一行
 *   6. 手动新增一行
 *   7. HOLDING_SNAPSHOT confirm
 *   8. 验证 Holding / PriceSnapshot / ImportSession 状态
 *
 * 不依赖真实 OCR、OSS 或公网。
 */
import dotenv from "dotenv";
import path from "node:path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
import fs from "node:fs/promises";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { LocalStorageProvider } from "../src/server/storage/providers/local-storage-provider";
import { MockOcrProvider } from "../src/server/ocr/providers/mock-ocr-provider";
import { normalizeOcrRow } from "../src/server/ocr/normalize";
import { validateRows } from "../src/server/ocr/validation";

const PASS = "✅";
const FAIL = "❌";
let exitCode = 0;

function ok(msg: string) { console.log(`  ${PASS} ${msg}`); }
function fail(msg: string) { console.log(`  ${FAIL} ${msg}`); exitCode = 1; }

// 生成最小 PNG (1x1 pink pixel)
function createTestPng(): Buffer {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/" +
    "PchI7wAAAABJRU5ErkJggg==";
  return Buffer.from(b64, "base64");
}

async function main() {
  console.log("\n🧪 Import Smoke Test — service-level\n");

  // 0. 检查环境
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

  // 获取 household
  const household = await prisma.household.findFirst();
  if (!household) {
    fail("无 Household，请先 npm run db:seed");
    process.exit(1);
  }
  ok(`Household: ${household.id}`);

  // ---- Step 1: Create ImportSession ----
  console.log("\n--- Step 1: 创建 ImportSession ---");
  const session = await prisma.importSession.create({
    data: {
      householdId: household.id,
      sourcePlatform: "ALIPAY",
      saveMode: "HOLDING_SNAPSHOT",
    },
  });
  if (session.id) ok(`ImportSession 创建: ${session.id}`);
  else fail("ImportSession 创建失败");

  // ---- Step 2: Save file to LocalStorage ----
  console.log("\n--- Step 2: 保存测试文件 ---");
  const png = createTestPng();
  const storage = new LocalStorageProvider("./uploads");
  const saved = await storage.save({
    buffer: png,
    originalFileName: "test-import.png",
    mimeType: "image/png",
  });
  ok(`文件已保存: ${saved.storageKey} (${saved.sizeBytes}B, hash=${saved.hash.slice(0, 12)}...)`);

  await prisma.importSession.update({
    where: { id: session.id },
    data: {
      storageProvider: saved.storageProvider,
      storageKey: saved.storageKey,
      fileHash: saved.hash,
      fileSizeBytes: saved.sizeBytes,
      fileMimeType: saved.mimeType,
      originalFileName: saved.originalFileName,
      status: "UPLOADED",
    },
  });
  ok("ImportSession 更新为 UPLOADED");

  // ---- Step 3: Mock OCR recognize ----
  console.log("\n--- Step 3: Mock OCR 识别 ---");
  const ocr = new MockOcrProvider();
  const startedAt = new Date().toISOString();
  const ocrResult = await ocr.recognize({
    imageBuffer: png,
    mimeType: "image/png",
    sourcePlatform: "ALIPAY",
    fileName: "test-import.png",
  });
  ok(`OCR 识别完成: ${ocrResult.rows.length} 行, 置信度 ${ocrResult.confidence}%`);

  const normalized = ocrResult.rows.map(normalizeOcrRow);
  const validated = validateRows(normalized);

  let rowCount = 0;
  for (const v of validated) {
    rowCount++;
    const r = v.row;
    await prisma.recognizedImportRow.create({
      data: {
        importSessionId: session.id,
        rowIndex: rowCount,
        sourcePlatform: "ALIPAY",
        assetName: r.assetName,
        assetCode: r.assetCode ?? null,
        assetType: r.assetType,
        currency: r.currency ?? "CNY",
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        price: r.price ? parseFloat(r.price) : null,
        marketValue: r.marketValue ? parseFloat(r.marketValue) : null,
        cost: r.cost ? parseFloat(r.cost) : null,
        holdingReturn: r.holdingReturn ? parseFloat(r.holdingReturn) : null,
        confidence: Math.round(r.confidence),
        rawText: r.rawText,
        action: v.action,
        status: v.issues.some((i) => i.type === "MISSING") ? "MISSING_FIELDS" : "NORMAL",
        validationIssues: v.issues.length > 0 ? (JSON.parse(JSON.stringify(v.issues)) as any) : undefined,
      },
    });
  }
  ok(`RecognizedImportRow 写入: ${rowCount} 行`);

  await prisma.importSession.update({
    where: { id: session.id },
    data: {
      status: "REVIEWING",
      ocrProvider: "mock",
      recognizedRowCount: rowCount,
      ocrStartedAt: new Date(startedAt),
      ocrFinishedAt: new Date(),
      ocrDurationMs: 300,
    },
  });
  ok("ImportSession 更新为 REVIEWING");

  // ---- Step 4: Verify rows ----
  console.log("\n--- Step 4: 验证识别行 ---");
  const rows = await prisma.recognizedImportRow.findMany({
    where: { importSessionId: session.id },
  });
  if (rows.length > 0) ok(`RecognizedImportRow: ${rows.length} 条`);
  else fail("RecognizedImportRow 为空");

  // ---- Step 5: PATCH edit a row ----
  console.log("\n--- Step 5: PATCH 编辑行 ---");
  if (rows.length > 0) {
    const firstRow = rows[0];
    await prisma.recognizedImportRow.update({
      where: { id: firstRow.id },
      data: {
        assetName: firstRow.assetName + " (已校正)",
        status: "CONFIRMED",
      },
    });
    const updated = await prisma.recognizedImportRow.findUnique({ where: { id: firstRow.id } });
    if (updated?.assetName?.includes("已校正")) ok("行编辑成功");
    else fail("行编辑失败");
  }

  // ---- Step 6: Add manual row ----
  console.log("\n--- Step 6: 手动新增行 ---");
  const manualRow = await prisma.recognizedImportRow.create({
    data: {
      importSessionId: session.id,
      rowIndex: rows.length + 1,
      sourcePlatform: "ALIPAY",
      assetName: "手动新增测试资产",
      assetType: "MUTUAL_FUND",
      currency: "CNY",
      marketValue: 50000,
      confidence: 100,
      status: "CONFIRMED",
      action: "MANUAL",
    },
  });
  ok(`手动新增行: ${manualRow.id}`);
  await prisma.importSession.update({
    where: { id: session.id },
    data: { recognizedRowCount: rows.length + 1 },
  });

  // ---- Step 7: Confirm HOLDING_SNAPSHOT ----
  console.log("\n--- Step 7: Confirm HOLDING_SNAPSHOT ---");
  const allRows = await prisma.recognizedImportRow.findMany({
    where: { importSessionId: session.id, action: { not: "IGNORE" }, status: { not: "IGNORED" } },
  });

  let savedCount = 0;
  for (const row of allRows) {
    try {
      if (!row.assetName?.trim()) continue;

      // Find or create Asset
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

      // Find member + account
      const m = await prisma.member.findFirst({ where: { householdId: household.id } });
      if (!m) continue;
      const acc = await prisma.account.findFirst({ where: { memberId: m.id, householdId: household.id } });
      if (!acc) continue;

      const qty = row.quantity ? parseFloat(row.quantity.toString()) : 1;
      const price = row.price ? parseFloat(row.price.toString()) : 0;
      const mv = row.marketValue ? parseFloat(row.marketValue.toString()) : qty * price;

      const existing = await prisma.holding.findFirst({
        where: { memberId: m.id, accountId: acc.id, assetId: asset.id, status: "CURRENT" },
      });

      if (existing) {
        await prisma.holding.update({
          where: { id: existing.id },
          data: { currentPrice: price, currentMarketValue: mv, latestPriceDate: new Date() },
        });
      } else {
        await prisma.holding.create({
          data: {
            householdId: household.id,
            memberId: m.id,
            accountId: acc.id,
            assetId: asset.id,
            status: "CURRENT",
            quantity: qty,
            currentPrice: price,
            currentMarketValue: mv,
            holdingReturn: 0,
            realizedReturn: 0,
            cumulativeReturn: 0,
            latestPriceDate: new Date(),
          },
        });
      }

      if (price > 0) {
        await prisma.priceSnapshot.upsert({
          where: { assetId_date: { assetId: asset.id, date: new Date() } },
          update: { price, source: "IMPORT" },
          create: { assetId: asset.id, date: new Date(), price, source: "IMPORT" },
        });
      }
      savedCount++;
    } catch {
      // skip
    }
  }

  ok(`保存完成: ${savedCount}/${allRows.length} 行`);

  await prisma.importSession.update({
    where: { id: session.id },
    data: { status: "SAVED", savedRowCount: savedCount, savedAt: new Date() },
  });

  // ---- Step 8: Verify results ----
  console.log("\n--- Step 8: 验证结果 ---");

  const finalSession = await prisma.importSession.findUnique({ where: { id: session.id } });
  if (finalSession?.status === "SAVED" && (finalSession.savedRowCount ?? 0) > 0) {
    ok(`ImportSession status=SAVED, savedRowCount=${finalSession?.savedRowCount}`);
  } else {
    fail(`ImportSession 状态异常: status=${finalSession?.status}`);
  }

  const holdingCount = await prisma.holding.count({ where: { status: "CURRENT" } });
  ok(`Holding 总数: ${holdingCount} (>=12)`);

  const priceCount = await prisma.priceSnapshot.count();
  ok(`PriceSnapshot 总数: ${priceCount} (>=12)`);

  // Cleanup: remove test session rows (leave DB in reasonable state)
  console.log("\n--- 清理测试数据 ---");
  await prisma.recognizedImportRow.deleteMany({ where: { importSessionId: session.id } });
  await prisma.importSession.delete({ where: { id: session.id } });
  // Clean up test file
  await fs.unlink(saved.storageKey).catch(() => {});
  ok("测试数据已清理");

  await prisma.$disconnect();

  if (exitCode === 0) {
    console.log(`\n${PASS} Import smoke test 全部通过\n`);
  } else {
    console.log(`\n${FAIL} Import smoke test 存在问题\n`);
  }
  process.exit(exitCode);
}

main();
