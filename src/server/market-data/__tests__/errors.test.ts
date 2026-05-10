import { describe, it, expect } from "vitest";
import {
  ProviderError,
  ProviderUnavailableError,
  ProviderDataError,
  ProviderRateLimitError,
} from "../errors";

describe("ProviderError", () => {
  it("sets correct name and message format", () => {
    const err = new ProviderError("something went wrong", "test-provider");
    expect(err.name).toBe("ProviderError");
    expect(err.message).toContain("[test-provider]");
    expect(err.message).toContain("something went wrong");
    expect(err.providerName).toBe("test-provider");
    expect(err.assetCode).toBeUndefined();
  });

  it("includes assetCode when provided", () => {
    const err = new ProviderError("not found", "test-provider", "000001");
    expect(err.message).toContain("[test-provider]");
    expect(err.message).toContain("000001");
    expect(err.message).toContain("not found");
    expect(err.assetCode).toBe("000001");
  });
});

describe("ProviderUnavailableError", () => {
  it("correctly extends ProviderError", () => {
    const err = new ProviderUnavailableError("my-provider", "API not reachable");
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ProviderUnavailableError");
    expect(err.providerName).toBe("my-provider");
    expect(err.message).toContain("[my-provider]");
    expect(err.message).toContain("API not reachable");
  });

  it("uses default reason when not provided", () => {
    const err = new ProviderUnavailableError("my-provider");
    expect(err.message).toContain("Provider is not available");
  });
});

describe("ProviderDataError", () => {
  it("includes rawResponse", () => {
    const raw = { field: "unexpected" };
    const err = new ProviderDataError("my-provider", "000001", raw);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.name).toBe("ProviderDataError");
    expect(err.providerName).toBe("my-provider");
    expect(err.assetCode).toBe("000001");
    expect(err.rawResponse).toBe(raw);
    expect(err.message).toContain("返回数据格式异常");
  });

  it("works without rawResponse", () => {
    const err = new ProviderDataError("my-provider", "000001");
    expect(err.name).toBe("ProviderDataError");
    expect(err.rawResponse).toBeUndefined();
  });
});

describe("ProviderRateLimitError", () => {
  it("includes retryAfter", () => {
    const err = new ProviderRateLimitError("my-provider", 60);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.name).toBe("ProviderRateLimitError");
    expect(err.providerName).toBe("my-provider");
    expect(err.message).toContain("60s");
    expect(err.message).toContain("限流");
  });

  it("works without retryAfter", () => {
    const err = new ProviderRateLimitError("my-provider");
    expect(err.name).toBe("ProviderRateLimitError");
    expect(err.message).toContain("请求限流");
  });
});
