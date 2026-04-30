/** 掩码敏感字符串，仅显示前几位和后几位 */
export function maskSecret(value: string | undefined | null, showFirst = 3, showLast = 4): string {
  if (!value || value.length === 0) return "(empty)";
  if (value.length <= showFirst + showLast + 3) return "*".repeat(value.length);
  return value.slice(0, showFirst) + "***" + value.slice(-showLast);
}

/** 掩码 URL 中的 key/secret 参数 */
export function maskUrl(url: string | undefined | null): string {
  if (!url) return "(empty)";
  try {
    const u = new URL(url);
    for (const param of ["key", "secret", "token", "send_key", "webhook_key"]) {
      if (u.searchParams.has(param)) {
        const val = u.searchParams.get(param) ?? "";
        u.searchParams.set(param, maskSecret(val, 2, 3));
      }
    }
    // Also mask path-based secrets (e.g. SCTxxxx.send)
    const path = u.pathname;
    if (path.includes("SCT") || path.includes("sk-")) {
      u.pathname = maskSecret(path, 3, 4);
    }
    return u.toString();
  } catch {
    // Not a valid URL — mask whole string
    if (url.length > 20) return url.slice(0, 8) + "***" + url.slice(-6);
    return "***";
  }
}

/** 掩码 webhook URL */
export function maskWebhook(url: string | undefined | null): string {
  return maskUrl(url);
}

/** 检查 secret 是否已配置 (非空且非 CHANGE_ME) */
export function isSecretConfigured(val: string | undefined): boolean {
  if (!val || val.length === 0) return false;
  if (val === "CHANGE_ME" || val.startsWith("CHANGE_ME")) return false;
  return true;
}
