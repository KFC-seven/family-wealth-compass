"use client";

import { useState, useCallback } from "react";
import { RecognizedAssetRow, ImportSource } from "@/types/import";
import { emptyImportFields } from "@/lib/import-helpers";
import { ClipboardPaste, AlertCircle, CheckCircle2 } from "lucide-react";

interface BatchPastePanelProps {
  source: ImportSource;
  saveMode: "holding_snapshot" | "transaction";
  onRowsReady: (rows: RecognizedAssetRow[]) => void;
}

/**
 * 批量粘贴导入面板
 *
 * 支持 TSV / CSV 粘贴，按 Tab 或逗号分列解析。
 * 解析后在确认前允许用户查看预览行。
 */
export function BatchPastePanel({ source, saveMode, onRowsReady }: BatchPastePanelProps) {
  const [text, setText] = useState("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const isHolding = saveMode === "holding_snapshot";
  // 持仓列：成员, 账户, 资产名称, 代码, 类型, 数量, 价格, 市值, 成本, 日期, 备注
  // 交易列：成员, 账户, 交易类型, 资产名称, 代码, 类型, 数量, 价格, 成交金额, 费用, 税费, 净额, 日期, 备注

  const handleParse = useCallback(() => {
    setParseError(null);
    if (!text.trim()) {
      setParseError("请粘贴数据");
      return;
    }
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 1) {
      setParseError("无有效行");
      return;
    }
    // 检测分隔符：Tab 或 Comma
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const rows = lines.map((line) => line.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
    if (rows.some((r) => r.length === 0)) {
      setParseError("解析失败：存在空行");
      return;
    }
    setParsedRows(rows);
  }, [text]);

  const handleConfirm = useCallback(() => {
    if (parsedRows.length === 0) return;

    const recognizedRows: RecognizedAssetRow[] = parsedRows.map((cols, i) => {
      const fields = emptyImportFields();
      if (isHolding) {
        // 持仓列：成员, 账户, 资产名称, 代码, 类型, 数量, 价格, 市值, 成本, 日期, 备注
        if (cols[0]) fields.member.value = cols[0];
        if (cols[1]) fields.account.value = cols[1];
        if (cols[2]) fields.assetName.value = cols[2];
        if (cols[3]) fields.assetCode.value = cols[3];
        if (cols[4]) fields.assetType.value = cols[4];
        if (cols[5]) fields.quantity.value = cols[5];
        if (cols[6]) fields.price.value = cols[6];
        if (cols[7]) fields.marketValue.value = cols[7];
        if (cols[8]) fields.cost.value = cols[8];
        if (cols[9]) fields.dataDate.value = cols[9];
        if (cols[10]) fields.note.value = cols[10];
      } else {
        // 交易列：成员, 账户, 交易类型, 资产名称, 代码, 类型, 数量, 价格, 成交金额, 费用, 税费, 净额, 日期, 备注
        if (cols[0]) fields.member.value = cols[0];
        if (cols[1]) fields.account.value = cols[1];
        if (cols[2]) fields.transactionType.value = cols[2];
        if (cols[3]) fields.assetName.value = cols[3];
        if (cols[4]) fields.assetCode.value = cols[4];
        if (cols[5]) fields.assetType.value = cols[5];
        if (cols[6]) fields.quantity.value = cols[6];
        if (cols[7]) fields.price.value = cols[7];
        if (cols[8]) fields.grossAmount.value = cols[8];
        if (cols[9]) fields.fee.value = cols[9];
        if (cols[10]) fields.tax.value = cols[10];
        if (cols[11]) fields.netAmount.value = cols[11];
        if (cols[12]) fields.tradeDate.value = cols[12];
        if (cols[13]) fields.note.value = cols[13];
      }
      return {
        id: `paste-${Date.now()}-${i}`,
        source,
        fields,
        status: "pending_confirm" as const,
        issues: [],
        userAction: "save" as const,
      };
    });

    setConfirmed(true);
    onRowsReady(recognizedRows);
  }, [parsedRows, source, isHolding, onRowsReady]);

  const handleReset = useCallback(() => {
    setText("");
    setParsedRows([]);
    setParseError(null);
    setConfirmed(false);
  }, []);

  if (confirmed && parsedRows.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle2 className="w-10 h-10 text-positive" />
        <p className="text-sm font-medium">已解析 {parsedRows.length} 行数据</p>
        <p className="text-xs text-muted-foreground">请在下方表格中校验和编辑，确认后保存</p>
        <button onClick={handleReset} className="text-xs text-primary hover:underline">
          重新粘贴
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium mb-1">从 Excel / 表格粘贴数据</p>
          <p>复制 Excel 或网页表格的数据（Tab 分隔），粘贴到下方文本框，点击解析。</p>
          {isHolding ? (
            <p className="mt-1">建议列顺序：成员 | 账户 | 资产名称 | 代码 | 类型 | 数量 | 价格 | 市值 | 成本 | 日期 | 备注</p>
          ) : (
            <p className="mt-1">建议列顺序：成员 | 账户 | 交易类型 | 资产名称 | 代码 | 类型 | 数量 | 价格 | 成交金额 | 费用 | 税费 | 净额 | 日期 | 备注</p>
          )}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setParseError(null); }}
        placeholder={`粘贴 TSV / CSV 数据...\n\n例如：\n爸爸\t支付宝基金账户\t沪深300ETF\t510300\tETF\t1000\t4.12\t4120\t3900\t2026-04-30\n...`}
        className="w-full h-40 text-xs font-mono bg-muted/30 border border-border rounded-xl p-3 resize-y"
      />

      {parseError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {parseError}
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">预览 ({parsedRows.length} 行)：</p>
          <div className="max-h-40 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <tbody>
                {parsedRows.slice(0, 5).map((cols, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {cols.map((c, j) => (
                      <td key={j} className="px-2 py-1 whitespace-nowrap text-muted-foreground">{c || "-"}</td>
                    ))}
                  </tr>
                ))}
                {parsedRows.length > 5 && (
                  <tr>
                    <td colSpan={parsedRows[0]?.length ?? 10} className="px-2 py-1 text-center text-muted-foreground">
                      ... 还有 {parsedRows.length - 5} 行
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40"
        >
          <ClipboardPaste className="w-4 h-4" />
          解析
        </button>
        {parsedRows.length > 0 && (
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            确认，添加到表格
          </button>
        )}
      </div>
    </div>
  );
}

