import { createSuccessResponse } from "@/server/api/response";

export async function GET() {
  return createSuccessResponse({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
