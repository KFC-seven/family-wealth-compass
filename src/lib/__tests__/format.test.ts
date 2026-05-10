import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatCompactMoney,
  formatSignedMoney,
  formatPercent,
  formatDate,
  formatMonth,
  formatFullDate,
} from "@/lib/format";

// ── formatMoney ──
describe("formatMoney", () => {
  it("formats positive number with CNY symbol", () => {
    expect(formatMoney(1234.56)).toBe("¥1,234.56");
  });

  it("formats negative number as absolute value (no sign prefix)", () => {
    expect(formatMoney(-1234.56)).toBe("¥1,234.56");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("¥0.00");
  });

  it("formats large number with thousands separators", () => {
    expect(formatMoney(1234567.89)).toBe("¥1,234,567.89");
  });

  it("formats USD with $ symbol", () => {
    expect(formatMoney(100, "USD")).toBe("$100.00");
  });

  it("formats small decimal values", () => {
    expect(formatMoney(0.1)).toBe("¥0.10");
  });

  it("formats NaN as ¥NaN", () => {
    const result = formatMoney(NaN);
    expect(result).toContain("NaN");
  });
});

// ── formatCompactMoney ──
describe("formatCompactMoney", () => {
  it("formats value below 1万 without abbreviation", () => {
    expect(formatCompactMoney(5000)).toBe("¥5,000");
  });

  it("formats value in 万 range", () => {
    expect(formatCompactMoney(1234567)).toBe("¥123.5万");
  });

  it("formats value in 亿 range", () => {
    expect(formatCompactMoney(123456789)).toBe("¥1.23亿");
  });

  it("formats negative value with minus prefix", () => {
    expect(formatCompactMoney(-1234567)).toBe("-¥123.5万");
  });

  it("formats zero", () => {
    expect(formatCompactMoney(0)).toBe("¥0");
  });

  it("formats exactly 1万 boundary without abbreviation", () => {
    // 1万 = 10000
    expect(formatCompactMoney(10000)).toBe("¥1.0万");
  });

  it("formats exactly 1亿 boundary", () => {
    expect(formatCompactMoney(100000000)).toBe("¥1.00亿");
  });

  it("formats negative zero", () => {
    expect(formatCompactMoney(-0)).toBe("¥0");
  });
});

// ── formatSignedMoney ──
describe("formatSignedMoney", () => {
  it("prefixes positive value with +", () => {
    expect(formatSignedMoney(1234.56)).toBe("+¥1,234.56");
  });

  it("prefixes negative value with minus", () => {
    expect(formatSignedMoney(-1234.56)).toBe("-¥1,234.56");
  });

  it("prefixes zero without sign (current behavior)", () => {
    // Current behavior: 0 > 0 is false, so no prefix
    expect(formatSignedMoney(0)).toBe("¥0.00");
  });

  it("formats USD with $ symbol", () => {
    expect(formatSignedMoney(100, "USD")).toBe("+$100.00");
  });
});

// ── formatPercent ──
describe("formatPercent", () => {
  it("formats positive decimal as percentage with +", () => {
    expect(formatPercent(0.1234)).toBe("+12.34%");
  });

  it("formats negative decimal as percentage with -", () => {
    expect(formatPercent(-0.05)).toBe("-5.00%");
  });

  it("returns -- for null input", () => {
    expect(formatPercent(null)).toBe("--");
  });

  it("returns -- for undefined input", () => {
    expect(formatPercent(undefined as unknown as number | null)).toBe("--");
  });

  it("formats zero as 0.00% (no + prefix)", () => {
    // Current behavior: 0 > 0 is false, so no prefix
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("formats 1.0 as +100.00%", () => {
    expect(formatPercent(1)).toBe("+100.00%");
  });

  it("formats -1.0 as -100.00%", () => {
    expect(formatPercent(-1)).toBe("-100.00%");
  });
});

// ── formatDate ──
describe("formatDate", () => {
  it("formats valid ISO date to Chinese month-day format", () => {
    expect(formatDate("2026-05-11")).toBe("5月11日");
  });

  it("handles dates with time component", () => {
    expect(formatDate("2026-05-11T10:30:00Z")).toBe("5月11日");
  });

  it("returns NaN text for invalid date string", () => {
    const result = formatDate("not-a-date");
    expect(result).toContain("NaN");
    expect(result).toContain("月");
  });
});

// ── formatMonth ──
describe("formatMonth", () => {
  it("formats YYYY-MM to Chinese month format", () => {
    expect(formatMonth("2026-05")).toBe("5月");
  });

  it("parses month number correctly for single-digit months", () => {
    expect(formatMonth("2026-03")).toBe("3月");
  });

  it("parses month number for double-digit months", () => {
    expect(formatMonth("2026-11")).toBe("11月");
  });

  it("returns NaN for malformed input", () => {
    const result = formatMonth("invalid");
    expect(result).toContain("NaN");
  });
});

// ── formatFullDate ──
describe("formatFullDate", () => {
  it("formats ISO date to Chinese full date format", () => {
    expect(formatFullDate("2026-05-11")).toBe("2026年5月11日");
  });

  it("handles dates with time component", () => {
    expect(formatFullDate("2026-05-11T10:30:00Z")).toBe("2026年5月11日");
  });

  it("returns NaN text for invalid date string", () => {
    const result = formatFullDate("not-a-date");
    expect(result).toContain("NaN");
    expect(result).toContain("年");
  });
});
