import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerJob, getJob, getAllJobs, getJobNames } from "../registry";

describe("JobRegistry", () => {
  const testJob = {
    name: "registry-test-job",
    displayName: "Registry Test",
    execute: vi.fn().mockResolvedValue({ status: "SUCCESS" as const, successCount: 1, failureCount: 0, skippedCount: 0 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerJob adds a job to the registry", () => {
    registerJob(testJob);
    const retrieved = getJob("registry-test-job");
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("registry-test-job");
  });

  it("registerJob warns on duplicate registration", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerJob(testJob);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("registry-test-job"),
    );
    spy.mockRestore();
  });

  it("getJob returns undefined for unknown job name", () => {
    expect(getJob("non-existent-job")).toBeUndefined();
  });

  it("getAllJobs returns all registered jobs", () => {
    const jobs = getAllJobs();
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs.some((j) => j.name === "registry-test-job")).toBe(true);
  });

  it("getJobNames returns all registered job names", () => {
    const names = getJobNames();
    expect(names).toContain("registry-test-job");
  });
});
