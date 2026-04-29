import { Transaction } from "@/types/finance";

export const mockTransactions: Transaction[] = [
  // 爸爸 - 贵州茅台（买入）
  { id: "tx-1", memberId: "member-1", accountId: "acc-1", assetId: "asset-1", type: "DEPOSIT", date: "2025-03-01", amount: 500000, note: "入金" },
  { id: "tx-2", memberId: "member-1", accountId: "acc-1", assetId: "asset-1", type: "BUY", date: "2025-03-05", quantity: 200, price: 1680, amount: 336000, fee: 336, note: "买入贵州茅台" },
  // 爸爸 - Apple Inc.（买入）
  { id: "tx-3", memberId: "member-1", accountId: "acc-1", assetId: "asset-2", type: "BUY", date: "2025-06-10", quantity: 50, price: 175, amount: 8750, fee: 8.75, note: "买入Apple" },
  // 爸爸 - 宁德时代（买入）
  { id: "tx-4", memberId: "member-1", accountId: "acc-1", assetId: "asset-3", type: "BUY", date: "2025-08-15", quantity: 800, price: 212, amount: 169600, fee: 169.6, note: "买入宁德时代" },
  // 爸爸 - 易方达沪深300ETF联接A（完整生命周期：买入→部分卖出→分红）
  { id: "tx-5", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "DEPOSIT", date: "2025-01-10", amount: 200000, note: "入金支付宝" },
  { id: "tx-6", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "BUY", date: "2025-01-15", quantity: 10000, price: 1.42, amount: 142000, fee: 71, note: "首次买入易方达沪深300ETF联接A" },
  { id: "tx-7", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "SELL", date: "2025-09-20", quantity: 2000, price: 1.65, amount: 3300, fee: 1.65, note: "部分卖出获利了结" },
  // Partial sell: Sold 2000 units at 1.65, cost was 1.42/unit, so realized = 3300 - 2840 - 1.65 = 458.35
  // But this specific sell might not match the mock holding data exactly. Let me add more context.
  { id: "tx-8", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "DIVIDEND", date: "2025-06-30", amount: 1560, note: "沪深300ETF联接A分红" },
  { id: "tx-9", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "SELL", date: "2025-11-10", quantity: 2000, price: 1.58, amount: 3160, fee: 1.58, note: "再次部分卖出" },
  // 爸爸 - 富国天惠（买入）
  { id: "tx-10", memberId: "member-1", accountId: "acc-2", assetId: "asset-5", type: "BUY", date: "2025-04-20", quantity: 5000, price: 2.18, amount: 10900, fee: 5.45, note: "买入富国天惠" },
  // 爸爸 - 招商银行理财
  { id: "tx-11", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "DEPOSIT", date: "2025-02-01", amount: 250000, note: "入金招行" },
  { id: "tx-12", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "BUY", date: "2025-02-05", quantity: 1, price: 150000, amount: 150000, fee: 0, note: "购买招行理财产品" },
  { id: "tx-13", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "INTEREST", date: "2025-03-21", amount: 480, note: "理财收益" },
  { id: "tx-14", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "INTEREST", date: "2025-06-21", amount: 510, note: "理财收益" },
  { id: "tx-15", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "INTEREST", date: "2025-09-21", amount: 530, note: "理财收益" },
  { id: "tx-16", memberId: "member-1", accountId: "acc-3", assetId: "asset-6", type: "INTEREST", date: "2025-12-21", amount: 550, note: "理财收益" },
  // 妈妈 - 工商银行理财
  { id: "tx-17", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "DEPOSIT", date: "2025-01-05", amount: 300000, note: "入金工行" },
  { id: "tx-18", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "BUY", date: "2025-01-08", quantity: 1, price: 280000, amount: 280000, fee: 0, note: "购买工行添利宝" },
  { id: "tx-19", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "INTEREST", date: "2025-03-20", amount: 1280, note: "理财收益" },
  { id: "tx-20", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "INTEREST", date: "2025-06-20", amount: 1320, note: "理财收益" },
  { id: "tx-21", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "DIVIDEND", date: "2025-09-20", amount: 200, note: "分红" },
  // 妈妈 - 黄金积存金
  { id: "tx-22", memberId: "member-2", accountId: "acc-5", assetId: "asset-8", type: "DEPOSIT", date: "2025-04-01", amount: 250000, note: "入金购金" },
  { id: "tx-23", memberId: "member-2", accountId: "acc-5", assetId: "asset-8", type: "BUY", date: "2025-04-03", quantity: 200, price: 452, amount: 90400, fee: 45.2, note: "首次购入积存金" },
  { id: "tx-24", memberId: "member-2", accountId: "acc-5", assetId: "asset-8", type: "BUY", date: "2025-07-15", quantity: 150, price: 460, amount: 69000, fee: 34.5, note: "加仓积存金" },
  { id: "tx-25", memberId: "member-2", accountId: "acc-5", assetId: "asset-8", type: "BUY", date: "2025-10-20", quantity: 150, price: 464, amount: 69600, fee: 34.8, note: "加仓积存金" },
  // 妈妈 - 博时黄金ETF联接A
  { id: "tx-26", memberId: "member-2", accountId: "acc-6", assetId: "asset-9", type: "BUY", date: "2025-05-10", quantity: 3000, price: 1.12, amount: 3360, fee: 1.68, note: "买入博时黄金" },
  { id: "tx-27", memberId: "member-2", accountId: "acc-6", assetId: "asset-9", type: "DIVIDEND", date: "2025-08-15", amount: 320, note: "黄金ETF分红" },
  // 妈妈 - 天弘沪深300（买入后亏损）
  { id: "tx-28", memberId: "member-2", accountId: "acc-6", assetId: "asset-10", type: "BUY", date: "2025-09-01", quantity: 6000, price: 1.05, amount: 6300, fee: 3.15, note: "买入天弘沪深300" },
  // 妈妈 - 中欧医疗（已清仓，亏损）
  { id: "tx-29", memberId: "member-2", accountId: "acc-6", assetId: "asset-13", type: "BUY", date: "2025-02-10", quantity: 5000, price: 1.25, amount: 6250, fee: 3.13, note: "买入中欧医疗" },
  { id: "tx-30", memberId: "member-2", accountId: "acc-6", assetId: "asset-13", type: "SELL", date: "2025-11-20", quantity: 5000, price: 0.95, amount: 4750, fee: 2.38, note: "清仓中欧医疗，亏损出场" },
  // 孩子 - 华夏中证500ETF联接A
  { id: "tx-31", memberId: "member-3", accountId: "acc-7", assetId: "asset-11", type: "DEPOSIT", date: "2025-06-01", amount: 100000, note: "入金" },
  { id: "tx-32", memberId: "member-3", accountId: "acc-7", assetId: "asset-11", type: "BUY", date: "2025-06-15", quantity: 10000, price: 0.85, amount: 8500, fee: 4.25, note: "买入华夏中证500" },
  { id: "tx-33", memberId: "member-3", accountId: "acc-7", assetId: "asset-11", type: "SELL", date: "2025-10-10", quantity: 2000, price: 0.88, amount: 1760, fee: 0.88, note: "部分卖出获利" },
  { id: "tx-34", memberId: "member-3", accountId: "acc-7", assetId: "asset-11", type: "DIVIDEND", date: "2025-12-15", amount: 120, note: "分红" },
  // 孩子 - 招商银行朝朝宝
  { id: "tx-35", memberId: "member-3", accountId: "acc-7", assetId: "asset-12", type: "BUY", date: "2025-07-01", quantity: 1, price: 45000, amount: 45000, fee: 0, note: "购买朝朝宝" },
  { id: "tx-36", memberId: "member-3", accountId: "acc-7", assetId: "asset-12", type: "INTEREST", date: "2025-09-21", amount: 210, note: "朝朝宝收益" },
  { id: "tx-37", memberId: "member-3", accountId: "acc-7", assetId: "asset-12", type: "INTEREST", date: "2025-12-21", amount: 225, note: "朝朝宝收益" },
  // 额外：提现和费用
  { id: "tx-38", memberId: "member-1", accountId: "acc-3", assetId: "asset-cash-1", type: "WITHDRAW", date: "2025-05-15", amount: 50000, note: "提现" },
  { id: "tx-39", memberId: "member-1", accountId: "acc-1", assetId: "asset-1", type: "FEE", date: "2025-03-05", amount: 336, note: "交易佣金" },
  { id: "tx-40", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "WITHDRAW", date: "2025-08-01", amount: 20000, note: "提现" },
  // 爸爸 - 清仓：海康威视（已清仓）
  { id: "tx-41", memberId: "member-1", accountId: "acc-1", assetId: "asset-14", type: "BUY", date: "2025-04-10", quantity: 1000, price: 32, amount: 32000, fee: 32, note: "买入海康威视" },
  { id: "tx-42", memberId: "member-1", accountId: "acc-1", assetId: "asset-14", type: "DIVIDEND", date: "2025-06-30", amount: 420, note: "海康威视分红" },
  { id: "tx-43", memberId: "member-1", accountId: "acc-1", assetId: "asset-14", type: "SELL", date: "2025-12-20", quantity: 1000, price: 34.5, amount: 34500, fee: 34.5, note: "清仓海康威视" },
  // 爸爸 - 清仓：国债逆回购（已清仓）
  { id: "tx-44", memberId: "member-1", accountId: "acc-1", assetId: "asset-15", type: "BUY", date: "2025-05-15", quantity: 1, price: 50000, amount: 50000, fee: 0, note: "购买国债逆回购" },
  { id: "tx-45", memberId: "member-1", accountId: "acc-1", assetId: "asset-15", type: "INTEREST", date: "2025-08-15", amount: 580, note: "国债逆回购到期收益" },
  { id: "tx-46", memberId: "member-1", accountId: "acc-1", assetId: "asset-15", type: "SELL", date: "2025-08-16", quantity: 1, price: 50580, amount: 50580, fee: 0, note: "国债逆回购到期赎回" },
  // 孩子 - 清仓：科创50ETF（已清仓，亏损）
  { id: "tx-47", memberId: "member-3", accountId: "acc-7", assetId: "asset-16", type: "BUY", date: "2025-08-20", quantity: 5000, price: 1.05, amount: 5250, fee: 2.63, note: "买入科创50ETF" },
  { id: "tx-48", memberId: "member-3", accountId: "acc-7", assetId: "asset-16", type: "SELL", date: "2026-01-15", quantity: 5000, price: 0.92, amount: 4600, fee: 2.3, note: "清仓科创50ETF" },
  // 妈妈 - 华泰柏瑞沪深300ETF（基金转换）
  { id: "tx-49", memberId: "member-2", accountId: "acc-6", assetId: "asset-17", type: "BUY", date: "2025-11-05", quantity: 2000, price: 2.30, amount: 4600, fee: 2.3, note: "买入华泰柏瑞沪深300ETF" },
  { id: "tx-50", memberId: "member-2", accountId: "acc-6", assetId: "asset-17", type: "SELL", date: "2026-03-10", quantity: 2000, price: 2.45, amount: 4900, fee: 2.45, note: "卖出华泰柏瑞沪深300ETF" },
  { id: "tx-51", memberId: "member-2", accountId: "acc-4", assetId: "asset-7", type: "INTEREST", date: "2025-12-20", amount: 1350, note: "理财收益" },
  { id: "tx-52", memberId: "member-1", accountId: "acc-2", assetId: "asset-4", type: "FEE", date: "2025-03-01", amount: 20, note: "基金管理费" },
  { id: "tx-53", memberId: "member-1", accountId: "acc-2", assetId: "asset-5", type: "DIVIDEND", date: "2025-12-20", amount: 320, note: "富国天惠分红" },
];
