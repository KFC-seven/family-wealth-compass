import { describe, it, expect } from "vitest";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  ApiError,
} from "../response";

describe("createSuccessResponse", () => {
  it("returns a 200 Response with ok:true and data", async () => {
    const res = createSuccessResponse({ name: "test" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { name: "test" } });
  });

  it("accepts a custom status code", async () => {
    const res = createSuccessResponse(null, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: null });
  });
});

describe("createErrorResponse", () => {
  it("returns a 400 Response with ok:false and error detail", async () => {
    const res = createErrorResponse({ code: "BAD_REQUEST", message: "bad input" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "BAD_REQUEST", message: "bad input" } });
  });

  it("accepts a custom status code", async () => {
    const res = createErrorResponse({ code: "NOT_FOUND", message: "gone" }, 404);
    expect(res.status).toBe(404);
  });

  it("includes optional details", async () => {
    const res = createErrorResponse({ code: "ERR", message: "msg", details: { field: "x" } }, 422);
    const body = await res.json();
    expect(body.error.details).toEqual({ field: "x" });
  });
});

describe("handleApiError", () => {
  it("handles an ApiError with its code, message, and status", async () => {
    const err = new ApiError("NOT_FOUND", "资源不存在", 404);
    const res = handleApiError(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "资源不存在", details: undefined },
    });
  });

  it("handles an ApiError with details", async () => {
    const err = new ApiError("VALIDATION", "invalid", 400, { field: "email" });
    const res = handleApiError(err);
    const body = await res.json();
    expect(body.error.details).toEqual({ field: "email" });
  });

  it("returns 500 for a plain Error", async () => {
    const res = handleApiError(new Error("unexpected"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "服务器内部错误" },
    });
  });

  it("handles non-Error thrown values", async () => {
    const res = handleApiError("string-error");
    expect(res.status).toBe(500);
  });

  it("handles null/undefined thrown values", async () => {
    const res = handleApiError(null);
    expect(res.status).toBe(500);
  });
});

describe("ApiError class", () => {
  it("extends Error with code, status, and details", () => {
    const err = new ApiError("MY_CODE", "message", 418, { extra: true });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("MY_CODE");
    expect(err.message).toBe("message");
    expect(err.status).toBe(418);
    expect(err.details).toEqual({ extra: true });
  });
});
