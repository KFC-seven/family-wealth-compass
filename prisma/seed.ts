import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.pushNotification.deleteMany();
  await prisma.aiGenerationRun.deleteMany();
  await prisma.jobRun.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.marketDataSource.deleteMany();
  await prisma.recognizedImportRow.deleteMany();
  await prisma.importSession.deleteMany();
  await prisma.dailyBrief.deleteMany();
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.priceSnapshot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.investorProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.member.deleteMany();
  await prisma.appSettings.deleteMany();
  await prisma.household.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.passwordCredential.deleteMany();
  await prisma.user.deleteMany();

  // User with password
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "家庭管理员";

  // Import password module
  const { hashPassword } = await import("../src/server/auth/password");
  const { hash, salt } = hashPassword(adminPassword);

  const user = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      role: "OWNER",
      passwordCredential: {
        create: { passwordHash: hash, passwordSalt: salt },
      },
    },
  });
  console.log(`  Created user: ${user.id} (${adminEmail})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  ⚠  使用默认密码，生产环境请设置 SEED_ADMIN_PASSWORD`);
  }

  // Household
  const household = await prisma.household.create({
    data: { name: "家庭财富罗盘", baseCurrency: "CNY", permissionMode: "ALL_VISIBLE" },
  });
  console.log(`  Created household: ${household.id}`);

  // Members
  const member1 = await prisma.member.create({
    data: {
      householdId: household.id, userId: user.id, name: "爸爸", displayName: "爸爸",
      roleLabel: "管理员", isAdmin: true, sortOrder: 0,
    },
  });
  const member2 = await prisma.member.create({
    data: {
      householdId: household.id, name: "妈妈", displayName: "妈妈",
      roleLabel: "成员", isAdmin: false, sortOrder: 1,
    },
  });
  const member3 = await prisma.member.create({
    data: {
      householdId: household.id, name: "孩子", displayName: "孩子",
      roleLabel: "成员", isAdmin: false, sortOrder: 2,
    },
  });
  console.log(`  Created 3 members`);

  // Accounts
  const acc1 = await prisma.account.create({ data: { householdId: household.id, memberId: member1.id, name: "华泰证券账户", type: "BROKER", platform: "华泰证券" } });
  const acc2 = await prisma.account.create({ data: { householdId: household.id, memberId: member1.id, name: "支付宝基金账户", type: "ALIPAY_FUND", platform: "支付宝" } });
  const acc3 = await prisma.account.create({ data: { householdId: household.id, memberId: member1.id, name: "招商银行账户", type: "BANK", platform: "招商银行" } });
  const acc4 = await prisma.account.create({ data: { householdId: household.id, memberId: member2.id, name: "工商银行理财账户", type: "BANK_WEALTH", platform: "工商银行" } });
  const acc5 = await prisma.account.create({ data: { householdId: household.id, memberId: member2.id, name: "黄金积存金账户", type: "GOLD", platform: "工商银行" } });
  const acc6 = await prisma.account.create({ data: { householdId: household.id, memberId: member2.id, name: "支付宝基金账户", type: "ALIPAY_FUND", platform: "支付宝" } });
  const acc7 = await prisma.account.create({ data: { householdId: household.id, memberId: member3.id, name: "招商银行账户", type: "BANK", platform: "招商银行" } });
  console.log(`  Created 7 accounts`);

  // Assets
  const assets: Record<string, string> = {};
  const assetData = [
    { key: "a1", name: "贵州茅台", code: "600519", type: "A_SHARE" as const, market: "CN" },
    { key: "a2", name: "Apple Inc.", code: "AAPL", type: "US_STOCK" as const, market: "US" },
    { key: "a3", name: "宁德时代", code: "300750", type: "A_SHARE" as const, market: "CN" },
    { key: "a4", name: "易方达沪深300ETF联接A", code: "110020", type: "MUTUAL_FUND" as const },
    { key: "a5", name: "富国天惠成长混合A", code: "161005", type: "MUTUAL_FUND" as const },
    { key: "a6", name: "招商银行理财产品", type: "BANK_WEALTH" as const },
    { key: "a7", name: "工商银行添利宝", type: "BANK_WEALTH" as const },
    { key: "a8", name: "积存金", type: "GOLD_ACCUMULATION" as const },
    { key: "a9", name: "博时黄金ETF联接A", code: "002610", type: "MUTUAL_FUND" as const },
    { key: "a10", name: "天弘沪深300指数A", code: "000961", type: "MUTUAL_FUND" as const },
    { key: "a11", name: "华夏中证500ETF联接A", code: "006382", type: "ETF" as const },
    { key: "a12", name: "招商银行朝朝宝", type: "BANK_WEALTH" as const },
    { key: "a13", name: "中欧医疗健康混合A", code: "003095", type: "MUTUAL_FUND" as const },
    { key: "a14", name: "海康威视", code: "002415", type: "A_SHARE" as const, market: "CN" },
    { key: "a15", name: "国债逆回购", type: "CASH" as const },
    { key: "a16", name: "科创50ETF", code: "588000", type: "ETF" as const },
  ];
  for (const ad of assetData) {
    const { key, ...assetFields } = ad;
    const asset = await prisma.asset.create({ data: assetFields });
    assets[key] = asset.id;
  }
  console.log(`  Created ${assetData.length} assets`);

  // Holdings (current + cleared)
  const now = new Date();
  const holdings = [
    { id: "h1", memberId: member1.id, accountId: acc1.id, assetId: assets.a1, qty: 200, cost: 1680, price: 1820, hRet: 28000, rRet: 0, cRet: 28000 },
    { id: "h2", memberId: member1.id, accountId: acc1.id, assetId: assets.a2, qty: 50, cost: 175, price: 198, hRet: 1150, rRet: 0, cRet: 1150 },
    { id: "h3", memberId: member1.id, accountId: acc1.id, assetId: assets.a3, qty: 800, cost: 212, price: 198.5, hRet: -10800, rRet: 0, cRet: -10800 },
    { id: "h4", memberId: member1.id, accountId: acc2.id, assetId: assets.a4, qty: 8000, cost: 1.42, price: 1.56, hRet: 1120, rRet: 4520, cRet: 5640 },
    { id: "h5", memberId: member1.id, accountId: acc2.id, assetId: assets.a5, qty: 5000, cost: 2.18, price: 2.32, hRet: 700, rRet: 0, cRet: 700 },
    { id: "h6", memberId: member1.id, accountId: acc3.id, assetId: assets.a6, qty: 1, cost: 150000, price: 153600, hRet: 3600, rRet: 2430, cRet: 6030 },
    { id: "h8", memberId: member2.id, accountId: acc4.id, assetId: assets.a7, qty: 1, cost: 280000, price: 291200, hRet: 5600, rRet: 2800, cRet: 8400 },
    { id: "h9", memberId: member2.id, accountId: acc5.id, assetId: assets.a8, qty: 500, cost: 458, price: 478, hRet: 10000, rRet: 0, cRet: 10000 },
    { id: "h10", memberId: member2.id, accountId: acc6.id, assetId: assets.a9, qty: 3000, cost: 1.12, price: 1.21, hRet: 270, rRet: 320, cRet: 590 },
    { id: "h11", memberId: member2.id, accountId: acc6.id, assetId: assets.a10, qty: 6000, cost: 1.05, price: 0.98, hRet: -420, rRet: 0, cRet: -420 },
    { id: "h12", memberId: member3.id, accountId: acc7.id, assetId: assets.a11, qty: 8000, cost: 0.85, price: 0.795, hRet: -440, rRet: 580, cRet: 140 },
    { id: "h13", memberId: member3.id, accountId: acc7.id, assetId: assets.a12, qty: 1, cost: 45000, price: 45720, hRet: 720, rRet: 0, cRet: 720 },
    { id: "h15", memberId: member2.id, accountId: acc6.id, assetId: assets.a13, status: "CLEARED" as const, qty: 0, cost: 0, price: 0.82, hRet: 0, rRet: -1500, cRet: -1500 },
    { id: "h16", memberId: member1.id, accountId: acc1.id, assetId: assets.a14, status: "CLEARED" as const, qty: 0, cost: 0, price: 35, hRet: 0, rRet: 2900, cRet: 2900 },
    { id: "h17", memberId: member1.id, accountId: acc1.id, assetId: assets.a15, status: "CLEARED" as const, qty: 0, cost: 0, price: 0, hRet: 0, rRet: 580, cRet: 580 },
    { id: "h18", memberId: member3.id, accountId: acc7.id, assetId: assets.a16, status: "CLEARED" as const, qty: 0, cost: 0, price: 0.95, hRet: 0, rRet: -650, cRet: -650 },
  ];

  for (const h of holdings) {
    await prisma.holding.create({
      data: {
        id: h.id, householdId: household.id, memberId: h.memberId,
        accountId: h.accountId, assetId: h.assetId,
        status: h.status || "CURRENT",
        quantity: h.qty, averageCost: h.cost, remainingCost: h.qty * h.cost,
        currentPrice: h.price, currentMarketValue: h.qty * h.price,
        holdingReturn: h.hRet, realizedReturn: h.rRet, cumulativeReturn: h.cRet,
      },
    });
  }
  console.log(`  Created ${holdings.length} holdings`);

  // Investor Profiles
  await prisma.investorProfile.create({
    data: {
      memberId: member1.id, riskPreference: "BALANCED", investmentHorizon: "LONG",
      primaryGoal: "稳健增值", maxSingleAssetWeight: 30, maxIndustryWeight: 40,
      minCashReserveMonths: 3, drawdownTolerance: "15%", adviceStyle: "BALANCED",
      preferredAssets: JSON.parse('["A股核心资产","优质基金","理财产品"]'),
      avoidedAssetsOrBehaviors: JSON.parse('["频繁交易","追涨杀跌","杠杆操作"]'),
      customPhilosophyText: "相信长期持有优质资产，不追求短期超额收益。",
    },
  });
  await prisma.investorProfile.create({
    data: {
      memberId: member2.id, riskPreference: "CONSERVATIVE", investmentHorizon: "MEDIUM",
      primaryGoal: "保值为主", maxSingleAssetWeight: 25, maxIndustryWeight: 30,
      minCashReserveMonths: 6, drawdownTolerance: "8%", adviceStyle: "CONSERVATIVE",
      preferredAssets: JSON.parse('["银行理财","黄金","债券基金"]'),
      avoidedAssetsOrBehaviors: JSON.parse('["高风险投机","单一资产重仓","不熟悉领域投资"]'),
      customPhilosophyText: "本金安全第一，收益在保值基础上适度增值即可。",
    },
  });
  await prisma.investorProfile.create({
    data: {
      memberId: member3.id, riskPreference: "GROWTH", investmentHorizon: "MEDIUM",
      primaryGoal: "积累经验", maxSingleAssetWeight: 35, maxIndustryWeight: 50,
      minCashReserveMonths: 2, drawdownTolerance: "20%", adviceStyle: "POSITIVE_WITH_CONDITIONS",
      preferredAssets: JSON.parse('["指数基金","成长型基金","科技股"]'),
      avoidedAssetsOrBehaviors: JSON.parse('["盲目跟风","过度集中"]'),
      customPhilosophyText: "希望通过投资实践积累经验。",
    },
  });
  console.log(`  Created 3 investor profiles`);

  // Environment Settings
  await prisma.appSettings.create({
    data: {
      householdId: household.id,
      appearance: JSON.parse('{"theme":"system","returnColorScheme":"cn_red_up","defaultTimeRange":"近30日","defaultCurrency":"CNY","decimalPlaces":2,"privacyMode":false}'),
      returnMethod: JSON.parse('{"costMethod":"平均成本法","holdingReturnDef":"当前持仓市值 - 剩余持仓成本","realizedReturnDef":"卖出收益 + 分红 + 利息 - 已确认费用/税费","cumulativeReturnDef":"持仓收益 + 已实现收益"}'),
      pushSettings: JSON.parse('{"enabled":false,"pushTime":"07:30","channel":"disabled"}'),
      dataSourceSettings: JSON.parse('[]'),
      scheduledJobSettings: JSON.parse('[]'),
    },
  });
  console.log(`  Created app settings`);

  // Phase 8: Scheduled Jobs
  const jobConfigs = [
    { name: "update-market-prices", displayName: "更新行情/净值", cron: "30 21 * * 1-5", desc: "查询需要更新价格的 Asset，拉取最新行情或净值，写入 PriceSnapshot" },
    { name: "refresh-holding-snapshots", displayName: "刷新持仓快照", cron: "0 22 * * 1-5", desc: "根据最新价格/净值刷新持仓估值字段" },
    { name: "generate-portfolio-snapshots", displayName: "生成组合快照", cron: "0 23 * * 1-5", desc: "为家庭/成员/持仓生成当日 PortfolioSnapshot" },
    { name: "run-daily-valuation", displayName: "每日估值", cron: null, desc: "串行执行: 行情更新 → 持仓刷新 → 组合快照生成" },
    { name: "generate-daily-brief", displayName: "生成每日简报", cron: "0 7 * * *", desc: "使用 AI/Mock 生成 DailyBrief" },
    { name: "push-daily-brief", displayName: "推送每日简报", cron: "0 8 * * *", desc: "将 DailyBrief 推送到微信通道" },
    { name: "run-morning-brief", displayName: "每日晨报", cron: null, desc: "串行执行: 生成简报 → 推送简报" },
  ];
  for (const jc of jobConfigs) {
    await prisma.scheduledJob.create({
      data: {
        name: jc.name, displayName: jc.displayName, description: jc.desc,
        cronExpression: jc.cron, timezone: "Asia/Shanghai", isEnabled: true,
      },
    });
  }
  console.log(`  Created ${jobConfigs.length} scheduled jobs`);

  // Phase 8: Market Data Sources
  const sourceConfigs = [
    { name: "mock", display: "Mock 数据源", type: "MOCK" as const, pri: 10, assets: JSON.parse('["CASH","A_SHARE","US_STOCK","ETF","MUTUAL_FUND","BANK_WEALTH","GOLD_ACCUMULATION","BOND","OTHER"]') },
    { name: "manual", display: "手动价格", type: "MANUAL" as const, pri: 20, assets: JSON.parse('["CASH","A_SHARE","US_STOCK","ETF","MUTUAL_FUND","BANK_WEALTH","GOLD_ACCUMULATION","BOND","OTHER"]') },
    { name: "eastmoney-fund", display: "天天基金", type: "EASTMONEY" as const, pri: 30, assets: JSON.parse('["MUTUAL_FUND"]'), enabled: false, status: "DISABLED" as const },
    { name: "sina-finance", display: "新浪财经", type: "OTHER" as const, pri: 35, assets: JSON.parse('["A_SHARE","ETF","US_STOCK","GOLD_ACCUMULATION"]'), enabled: false, status: "DISABLED" as const },
    { name: "tushare", display: "Tushare Pro", type: "TUSHARE" as const, pri: 40, assets: JSON.parse('["A_SHARE","ETF","MUTUAL_FUND"]'), enabled: false, status: "DISABLED" as const },
  ];
  for (const sc of sourceConfigs) {
    await prisma.marketDataSource.create({
      data: {
        name: sc.name, displayName: sc.display, type: sc.type,
        isEnabled: sc.enabled ?? true, priority: sc.pri,
        supportedAssetTypes: sc.assets,
        lastStatus: sc.status ?? "HEALTHY",
      },
    });
  }
  console.log(`  Created ${sourceConfigs.length} market data sources`);

  // Portfolio snapshots (最近 30 天 + 最近 12 个月)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const snapshots: any[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    snapshots.push({
      householdId: household.id, scopeType: "HOUSEHOLD" as const,
      date: d, totalAssets: 1300000 + Math.random() * 80000,
      cashBalance: 130000, holdingMarketValue: 1200000,
      dailyReturn: (Math.random() - 0.45) * 4000,
      cumulativeReturn: 35000 + Math.random() * 5000,
      holdingReturn: 22000, realizedReturn: 13000,
    });
  }
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    snapshots.push({
      householdId: household.id, scopeType: "HOUSEHOLD" as const,
      date: d, totalAssets: 1250000 + (11 - i) * 10000,
      cashBalance: 130000, holdingMarketValue: 1120000 + (11 - i) * 10000,
      dailyReturn: 0, cumulativeReturn: 20000 + (11 - i) * 2000,
      holdingReturn: 15000 + (11 - i) * 1000, realizedReturn: 10000 + (11 - i) * 500,
    });
  }
  await prisma.portfolioSnapshot.createMany({ data: snapshots });
  console.log(`  Created ${snapshots.length} portfolio snapshots`);

  // Daily Brief
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  await prisma.dailyBrief.create({
    data: {
      householdId: household.id, date: yesterday,
      status: "GENERATED", title: "每日投资简报",
      summary: "A股三大指数小幅收涨，贵州茅台一季报超预期。",
      householdImpact: JSON.parse('{"direction":"positive","todayReturn":3240.5,"topPositiveAsset":"贵州茅台","topNegativeAsset":"宁德时代"}'),
      marketOverview: JSON.parse('[{"market":"A股","direction":"positive","summary":"三大指数小幅收涨"}]'),
      memberImpacts: JSON.parse('[{"memberId":"' + member1.id + '","memberName":"爸爸","todayReturn":2100}]'),
      riskAlerts: JSON.parse('[{"level":"high","type":"仓位集中","relatedMember":"爸爸","description":"贵州茅台单一持仓占比偏高"}]'),
      adviceCards: JSON.parse('[{"type":"继续观察","relatedMember":"爸爸","relatedAsset":"贵州茅台","reason":"基本面稳健","riskLevel":"low"}]'),
      newsItems: JSON.parse('[{"title":"贵州茅台一季度营收同比增长8.5%","impact":"positive","importance":"high"}]'),
      pushStatus: JSON.parse('{"pushed":true,"channel":"wecom_robot","pushTime":"2026-04-28 07:32","success":true}'),
    },
  });
  console.log(`  Created daily brief`);

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
