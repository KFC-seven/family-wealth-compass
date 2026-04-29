import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, handleApiError } from "@/server/api/response";
import { validateBody, importSessionCreateSchema } from "@/server/api/validators";

export async function POST(request: Request) {
  try {
    const result = await validateBody(request, importSessionCreateSchema);
    if ("error" in result) return result.error;

    const session = await prisma.importSession.create({
      data: result.data,
    });

    return createSuccessResponse({ id: session.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const sessions = await prisma.importSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return createSuccessResponse(sessions);
  } catch (err) {
    return handleApiError(err);
  }
}
