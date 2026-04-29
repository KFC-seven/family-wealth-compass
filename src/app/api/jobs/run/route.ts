import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { runJob } from "@/server/jobs/runner";

// 注册所有任务
import "@/server/jobs/tasks/update-market-prices";
import "@/server/jobs/tasks/refresh-holding-snapshots";
import "@/server/jobs/tasks/generate-portfolio-snapshots";
import "@/server/jobs/tasks/run-daily-valuation";

/**
 * 手动触发任务。
 *
 * Body: { jobName: string, date?: string }
 * Headers: x-job-api-secret (如果环境变量 JOB_API_SECRET 已设置)
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.JOB_API_SECRET;
    if (secret) {
      const provided = req.headers.get("x-job-api-secret");
      if (provided !== secret) {
        return createErrorResponse(
          { code: "UNAUTHORIZED", message: "JOB_API_SECRET 校验失败" },
          401,
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      return createErrorResponse(
        { code: "NOT_CONFIGURED", message: "生产环境必须设置 JOB_API_SECRET" },
        500,
      );
    }

    const body = await req.json();
    const jobName = body.jobName;
    const date = body.date;

    if (!jobName) {
      return createErrorResponse(
        { code: "VALIDATION_ERROR", message: "缺少 jobName" },
        400,
      );
    }

    console.log(`[API] 手动触发任务: ${jobName}${date ? ` 日期=${date}` : ""}`);
    const result = await runJob(jobName, "API", date);

    return createSuccessResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}
