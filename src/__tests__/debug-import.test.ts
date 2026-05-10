import { describe, it, expect, vi } from "vitest";

// Just test if the route module can be imported at all
import { POST } from "../app/api/auth/login/route";

describe("debug route import", () => {
  it("route exports POST as a function", () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe("function");
  });

  it("calling POST returns something", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });
    try {
      const res = await POST(req);
      console.log("POST returned:", typeof res, res);
      // Just check it's defined - no status assertion
      expect(res).toBeDefined();
    } catch (e) {
      console.log("POST threw:", e);
      expect(e).toBeUndefined(); // will fail, logging the error
    }
  });
});
