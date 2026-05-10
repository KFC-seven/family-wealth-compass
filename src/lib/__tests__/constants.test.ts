import { describe, it, expect } from "vitest";
import { CURRENCY_SYMBOL, APP_NAME, NAV_ITEMS } from "@/lib/constants";

describe("constants", () => {
  it("exports CURRENCY_SYMBOL", () => {
    expect(CURRENCY_SYMBOL).toBe("¥");
  });

  it("exports APP_NAME", () => {
    expect(APP_NAME).toBe("家庭财富罗盘");
  });

  it("exports NAV_ITEMS with correct routes", () => {
    expect(NAV_ITEMS).toHaveLength(6);
    expect(NAV_ITEMS.map((i) => i.href)).toEqual(["/", "/members", "/holdings", "/import", "/brief", "/settings"]);
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["总览", "成员", "持仓", "导入", "简报", "设置"]);
  });

  it("NAV_ITEMS includes all client-accessible pages", () => {
    const routes = NAV_ITEMS.map((i) => i.href);
    expect(routes).toContain("/");
    expect(routes).toContain("/members");
    expect(routes).toContain("/holdings");
    expect(routes).toContain("/import");
    expect(routes).toContain("/brief");
    expect(routes).toContain("/settings");
    // Login and account are not in main nav
    expect(routes).not.toContain("/login");
    expect(routes).not.toContain("/account");
  });

  it("NAV_ITEMS is readonly (as const)", () => {
    const items: readonly { readonly label: string; readonly href: string }[] = NAV_ITEMS;
    expect(items).toBeDefined();
  });
});
