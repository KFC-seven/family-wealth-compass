import { z } from "zod";
import { createErrorResponse } from "./response";

export const transactionCreateSchema = z.object({
  householdId: z.string().min(1),
  memberId: z.string().min(1),
  accountId: z.string().min(1),
  assetId: z.string().optional(),
  holdingId: z.string().optional(),
  type: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "DEPOSIT", "WITHDRAW", "FEE", "ADJUSTMENT"]),
  tradeDate: z.string().min(1),
  quantity: z.number().optional(),
  price: z.number().optional(),
  grossAmount: z.number(),
  fee: z.number().default(0),
  tax: z.number().default(0),
  netAmount: z.number(),
  currency: z.string().default("CNY"),
  realizedReturn: z.number().optional(),
  cashImpact: z.number().optional(),
  note: z.string().optional(),
  source: z.enum(["MANUAL", "IMPORT", "SEED"]).default("MANUAL"),
});

export const importSessionCreateSchema = z.object({
  householdId: z.string().min(1),
  memberId: z.string().optional(),
  sourcePlatform: z.enum(["ALIPAY", "BROKER", "BANK", "OTHER"]),
  saveMode: z.enum(["HOLDING_SNAPSHOT", "TRANSACTION_RECORD"]),
  originalFileName: z.string().optional(),
});

export const settingsUpdateSchema = z.object({
  appearance: z.record(z.string(), z.any()).optional(),
  returnMethod: z.record(z.string(), z.any()).optional(),
  pushSettings: z.record(z.string(), z.any()).optional(),
  dataSourceSettings: z.array(z.record(z.string(), z.any())).optional(),
  scheduledJobSettings: z.array(z.record(z.string(), z.any())).optional(),
});

export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data: T } | { error: Response }> {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      return {
        error: createErrorResponse(
          {
            code: "VALIDATION_ERROR",
            message: "请求参数校验失败",
            details: result.error.flatten().fieldErrors,
          },
          400
        ),
      };
    }
    return { data: result.data };
  } catch {
    return {
      error: createErrorResponse(
        { code: "VALIDATION_ERROR", message: "请求体不是有效的 JSON" },
        400
      ),
    };
  }
}
