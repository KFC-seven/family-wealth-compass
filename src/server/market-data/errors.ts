/** 行情数据提供者异常 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly assetCode?: string,
  ) {
    super(`[${providerName}]${assetCode ? ` ${assetCode}:` : ""} ${message}`);
    this.name = "ProviderError";
  }
}

/** Provider 不可用（配置关闭/网络不可达等） */
export class ProviderUnavailableError extends ProviderError {
  constructor(providerName: string, reason?: string) {
    super(reason ?? "Provider is not available", providerName);
    this.name = "ProviderUnavailableError";
  }
}

/** Provider 返回数据异常 */
export class ProviderDataError extends ProviderError {
  constructor(
    providerName: string,
    assetCode?: string,
    public readonly rawResponse?: unknown,
  ) {
    super("返回数据格式异常", providerName, assetCode);
    this.name = "ProviderDataError";
  }
}

/** Provider 限流 */
export class ProviderRateLimitError extends ProviderError {
  constructor(providerName: string, retryAfter?: number) {
    super(
      retryAfter ? `请求限流，建议 ${retryAfter}s 后重试` : "请求限流",
      providerName,
    );
    this.name = "ProviderRateLimitError";
  }
}
