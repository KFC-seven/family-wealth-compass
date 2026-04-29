import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorDetail;
}

export function createSuccessResponse<T>(data: T, status = 200) {
  const body: ApiSuccessResponse<T> = { ok: true, data };
  return NextResponse.json(body, { status });
}

export function createErrorResponse(error: ApiErrorDetail, status = 400) {
  const body: ApiErrorResponse = { ok: false, error };
  return NextResponse.json(body, { status });
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return createErrorResponse(
      { code: err.code, message: err.message, details: err.details },
      err.status
    );
  }
  console.error("Unhandled API error:", err);
  return createErrorResponse(
    { code: "INTERNAL_ERROR", message: "服务器内部错误" },
    500
  );
}
