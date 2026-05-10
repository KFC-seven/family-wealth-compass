import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.hoisted(() => {
  process.env.AUTH_SESSION_COOKIE_NAME = "test_cookie";
  process.env.AUTH_SESSION_MAX_AGE_DAYS = "7";
  process.env.AUTH_REQUIRE_HTTPS = "false";
});

import { setSessionCookie, clearSessionCookie, getSessionCookie } from "../cookies";

beforeEach(() => {
  mockCookieStore.set.mockClear();
  mockCookieStore.get.mockClear();
});

describe("setSessionCookie", () => {
  const token = "test-token-value";

  it("sets an httpOnly cookie with the configured name", async () => {
    await setSessionCookie(token);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "test_cookie",
      token,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      })
    );
  });

  it("sets maxAge to 7 days (604800 seconds)", async () => {
    await setSessionCookie(token);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ maxAge: 604800 })
    );
  });

  it("uses secure=false when AUTH_REQUIRE_HTTPS is not true", async () => {
    await setSessionCookie(token);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: false })
    );
  });
});

describe("clearSessionCookie", () => {
  it("sets the cookie with empty value and maxAge 0", async () => {
    await clearSessionCookie();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "test_cookie",
      "",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
      })
    );
  });

  it("uses the same secure setting as setSessionCookie", async () => {
    await clearSessionCookie();
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: false })
    );
  });
});

describe("getSessionCookie", () => {
  it("returns the cookie value when present", async () => {
    mockCookieStore.get.mockReturnValue({ value: "stored-token" });

    const result = await getSessionCookie();
    expect(result).toBe("stored-token");
    expect(mockCookieStore.get).toHaveBeenCalledWith("test_cookie");
  });

  it("returns undefined when the cookie is not found", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getSessionCookie();
    expect(result).toBeUndefined();
  });
});
