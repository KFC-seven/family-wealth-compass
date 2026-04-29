"use client";

import { ImportSummary, ImportSaveMode } from "@/types/import";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportSummaryCardProps {
  summary: ImportSummary;
  onConfirm: () => void;
  onBack: () => void;
  saving?: boolean;
}

export function ImportSummaryCard({ summary, onConfirm, onBack, saving }: ImportSummaryCardProps) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <p className="text-base font-semibold">保存前确认</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Metric label="总行数" value={summary.totalRows.toString()} />
          <Metric label="已忽略" value={summary.ignoredRows.toString()} highlight={summary.ignoredRows > 0} />
          <Metric label="低置信度" value={summary.lowConfidenceRows.toString()} highlight={summary.lowConfidenceRows > 0} />
          <Metric label="缺失字段" value={summary.missingFieldRows.toString()} highlight={summary.missingFieldRows > 0} />
          <Metric label="疑似重复" value={summary.duplicateRows.toString()} highlight={summary.duplicateRows > 0} />
          <Metric label="总市值" value={formatMoney(summary.totalMarketValue)} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground">涉及成员:</span>
            <span>{summary.members.join("、") || "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">涉及账户:</span>
            <span>{summary.accounts.join("、") || "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">资产类型:</span>
            <span className="flex gap-1 flex-wrap">{summary.assetTypes.map((t) => <span key={t} className="text-xs bg-secondary px-1.5 py-0.5 rounded">{t}</span>)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">保存方式:</span>
            <span>{summary.saveMode === "holding_snapshot" ? "当前持仓快照" : "交易记录"}</span>
          </div>
        </div>

        {(summary.lowConfidenceRows > 0 || summary.missingFieldRows > 0 || summary.duplicateRows > 0) && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 text-xs text-warning">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>存在待确认问题，建议返回检查后再保存</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            返回修改
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "确认保存"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", highlight && "text-warning")}>{value}</p>
    </div>
  );
}
