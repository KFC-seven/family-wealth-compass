import { describe, it, expect, vi } from "vitest";

vi.mock("@/server/api/response", () => ({
  createSuccessResponse: () => new Response("OK", { status: 200 }),
  createErrorResponse: () => new Response("ERR", { status: 400 }),
  handleApiError: () => new Response("FATAL", { status: 500 }),
}));

import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

describe("debug mock resolution", () => {
  it("createSuccessResponse mock works", () => {
    const res = createSuccessResponse({ foo: "bar" });
    expect(res?.status).toBe(200);
  });

  it("createErrorResponse mock works", () => {
    const res = createErrorResponse({ code: "ERR" });
    expect(res?.status).toBe(400);
  });

  it("handleApiError mock works", () => {
    const res = handleApiError(new Error("test"));
    expect(res?.status).toBe(500);
  });
});
