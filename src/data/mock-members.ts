import { Member, Account } from "@/types/finance";

export const mockAccounts: Account[] = [
  { id: "acc-1", memberId: "member-1", name: "华泰证券账户", platform: "华泰证券", cashBalance: 32500.0 },
  { id: "acc-2", memberId: "member-1", name: "支付宝基金账户", platform: "支付宝", cashBalance: 1280.5 },
  { id: "acc-3", memberId: "member-1", name: "招商银行账户", platform: "招商银行", cashBalance: 85000.0 },
  { id: "acc-4", memberId: "member-2", name: "工商银行理财账户", platform: "工商银行", cashBalance: 0 },
  { id: "acc-5", memberId: "member-2", name: "黄金积存金账户", platform: "工商银行", cashBalance: 0 },
  { id: "acc-6", memberId: "member-2", name: "支付宝基金账户", platform: "支付宝", cashBalance: 3200.0 },
  { id: "acc-7", memberId: "member-3", name: "招商银行账户", platform: "招商银行", cashBalance: 15000.0 },
];

export const mockMembers: Member[] = [
  {
    id: "member-1",
    name: "爸爸",
    totalAssets: 856000.0,
    cashBalance: 118780.5,
    holdingReturn: 18320.0,
    realizedReturn: 9650.0,
    cumulativeReturn: 27970.0,
    cumulativeReturnRate: 0.0835,
    holdings: [],
    accounts: mockAccounts.filter((a) => a.memberId === "member-1"),
  },
  {
    id: "member-2",
    name: "妈妈",
    totalAssets: 423000.0,
    cashBalance: 3200.0,
    holdingReturn: 7890.0,
    realizedReturn: 3120.0,
    cumulativeReturn: 11010.0,
    cumulativeReturnRate: 0.0572,
    holdings: [],
    accounts: mockAccounts.filter((a) => a.memberId === "member-2"),
  },
  {
    id: "member-3",
    name: "孩子",
    totalAssets: 78600.0,
    cashBalance: 15000.0,
    holdingReturn: -1240.0,
    realizedReturn: 580.0,
    cumulativeReturn: -660.0,
    cumulativeReturnRate: -0.0128,
    holdings: [],
    accounts: mockAccounts.filter((a) => a.memberId === "member-3"),
  },
];
