import { describe, it, expect } from "vitest";

describe("FinancialSummaryCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/FinancialSummaryCard");
    expect(mod.FinancialSummaryCard).toBeDefined();
    expect(typeof mod.FinancialSummaryCard).toBe("function");
  });
});

describe("ChartCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/charts/ChartCard");
    expect(mod.ChartCard).toBeDefined();
    expect(typeof mod.ChartCard).toBe("function");
  });
});

describe("RiskAlertCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/RiskAlertCard");
    expect(mod.RiskAlertCard).toBeDefined();
    expect(typeof mod.RiskAlertCard).toBe("function");
  });
});

describe("HoldingRankList", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/HoldingRankList");
    expect(mod.HoldingRankList).toBeDefined();
    expect(typeof mod.HoldingRankList).toBe("function");
  });
});

describe("MetricCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/MetricCard");
    expect(mod.MetricCard).toBeDefined();
    expect(typeof mod.MetricCard).toBe("function");
  });
});

describe("ReturnBadge", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/ReturnBadge");
    expect(mod.ReturnBadge).toBeDefined();
    expect(typeof mod.ReturnBadge).toBe("function");
  });
});

describe("MoneyText", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/MoneyText");
    expect(mod.MoneyText).toBeDefined();
    expect(typeof mod.MoneyText).toBe("function");
  });
});

describe("AppShell", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/layout/AppShell");
    expect(mod.AppShell).toBeDefined();
    expect(typeof mod.AppShell).toBe("function");
  });
});

describe("PageHeader", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/layout/PageHeader");
    expect(mod.PageHeader).toBeDefined();
    expect(typeof mod.PageHeader).toBe("function");
  });
});

describe("CashBalanceCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/CashBalanceCard");
    expect(mod.CashBalanceCard).toBeDefined();
    expect(typeof mod.CashBalanceCard).toBe("function");
  });
});

describe("DailyBriefPreviewCard", () => {
  it("can be imported", async () => {
    const mod = await import("@/components/financial/DailyBriefPreviewCard");
    expect(mod.DailyBriefPreviewCard).toBeDefined();
    expect(typeof mod.DailyBriefPreviewCard).toBe("function");
  });
});
