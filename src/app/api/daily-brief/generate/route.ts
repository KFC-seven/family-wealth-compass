import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";
import { generateDailyBrief } from "@/server/brief/brief-generator";

export async function POST(req: Request) {
  try {
    const secret = process.env.BRIEF_API_SECRET;
    if (secret) {
      const provided = req.headers.get("x-brief-api-secret");
      if (provided !== secret) return createErrorResponse({ code: "UNAUTHORIZED", message: "BRIEF_API_SECRET 校验失败" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const brief = await generateDailyBrief({ date: body.date, force: body.force ?? false });

    return createSuccessResponse({
      id: brief.id,
      status: brief.status,
      title: brief.title,
      date: brief.date.toISOString().slice(0, 10),
      generatedAt: brief.generatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
