import { prisma } from "@/server/db/prisma";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/server/api/response";

/** 手动新增一行 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await prisma.importSession.findUnique({ where: { id: sessionId } });
    if (!session) return createErrorResponse({ code: "NOT_FOUND", message: "会话不存在" }, 404);

    const body = await req.json();

    // 计算当前最大 rowIndex
    const maxRow = await prisma.recognizedImportRow.findFirst({
      where: { importSessionId: sessionId },
      orderBy: { rowIndex: "desc" as const },
    });
    const nextIndex = (maxRow?.rowIndex ?? 0) + 1;

    const row = await prisma.recognizedImportRow.create({
      data: {
        importSessionId: sessionId,
        rowIndex: nextIndex,
        sourcePlatform: session.sourcePlatform,
        memberId: body.memberId ?? null,
        accountId: body.accountId ?? null,
        assetName: body.assetName ?? "",
        assetCode: body.assetCode ?? null,
        assetType: body.assetType ?? "OTHER",
        currency: body.currency ?? "CNY",
        quantity: body.quantity ?? null,
        price: body.price ?? null,
        marketValue: body.marketValue ?? null,
        cost: body.cost ?? null,
        holdingReturn: body.holdingReturn ?? null,
        dataDate: body.dataDate ? new Date(body.dataDate) : null,
        confidence: 100,
        status: "CONFIRMED",
        action: body.action ?? "MANUAL",
        note: body.note ?? null,
      },
    });

    await prisma.importSession.update({
      where: { id: sessionId },
      data: { recognizedRowCount: { increment: 1 } },
    });

    return createSuccessResponse({ id: row.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
