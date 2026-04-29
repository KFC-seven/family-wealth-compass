"use client";

import { useState } from "react";
import { Pencil, Trash2, RotateCcw, ChevronDown, ChevronUp, X, AlertCircle, Check } from "lucide-react";
import { RecognizedAssetRow, RecognizedField, RecognitionRowStatus } from "@/types/import";
import { ASSET_TYPE_LABELS, AssetType } from "@/types/finance";
import { formatMoney } from "@/lib/format";
import { RecognitionStatusBadge, ConfidenceBadge } from "./RecognitionStatusBadge";
import { cn } from "@/lib/utils";

interface RecognitionResultTableProps {
  rows: RecognizedAssetRow[];
  onUpdateRow: (rowId: string, fields: Partial<RecognizedAssetRow["fields"]>) => void;
  onToggleAction: (rowId: string, action: "save" | "ignore") => void;
  onAddRow: () => void;
  readOnly?: boolean;
}

const MEMBER_OPTIONS = ["爸爸", "妈妈", "孩子"];
const ACCOUNT_OPTIONS: Record<string, string[]> = {
  alipay: ["支付宝基金账户"],
  broker: ["华泰证券账户"],
  bank: ["招商银行账户", "工商银行理财账户", "黄金积存金账户"],
};
const ASSET_TYPES = Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));

function EditableField({
  field,
  options,
  onChange,
}: {
  field: RecognizedField;
  options?: string[];
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(field.value);

  if (!editing) {
    return (
      <button onClick={() => field.editable && setEditing(true)} className={cn(
        "text-xs text-left w-full hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
        !field.value && "text-muted-foreground italic",
        field.confidence < 80 && field.value ? "border border-amber-200 dark:border-amber-900 rounded" : ""
      )}>
        <div className="flex items-center gap-1">
          <span>{field.value || "未识别"}</span>
          {field.editable && <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100" />}
          {field.confidence < 80 && field.value && <ConfidenceBadge confidence={field.confidence} />}
        </div>
      </button>
    );
  }

  return (
    <div className="relative">
      {options ? (
        <select
          value={val}
          onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
          onBlur={() => setEditing(false)}
          autoFocus
          className="w-full text-xs bg-background border border-border rounded px-1 py-0.5"
        >
          <option value="">选择...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { onChange(val); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onChange(val); setEditing(false); } }}
          autoFocus
          className="w-full text-xs bg-background border border-border rounded px-1 py-0.5"
        />
      )}
    </div>
  );
}

export function RecognitionResultTable({ rows, onUpdateRow, onToggleAction, onAddRow, readOnly }: RecognitionResultTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
        <AlertCircle className="w-8 h-8 opacity-30" />
        <p>暂无识别结果</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const f = row.fields;
        const mktVal = parseFloat(f.marketValue.value);
        const isExpanded = expandedRow === row.id;
        const isIgnored = row.userAction === "ignore";

        return (
          <div key={row.id} className={cn(
            "rounded-xl border border-border overflow-hidden transition-opacity",
            isIgnored && "opacity-50"
          )}>
            {/* Desktop table row */}
            <div className="hidden md:flex items-center p-4 gap-3 group">
              <RecognitionStatusBadge status={row.status} className="flex-shrink-0" />
              <div className="grid grid-cols-8 gap-2 flex-1 min-w-0">
                <div className="min-w-0">
                  <EditableField field={f.member} options={MEMBER_OPTIONS} onChange={(v) => {
                    const newField = { ...f.member, value: v };
                    onUpdateRow(row.id, { member: newField });
                  }} />
                </div>
                <div className="min-w-0">
                  <EditableField field={f.account} options={ACCOUNT_OPTIONS[row.source]} onChange={(v) => {
                    onUpdateRow(row.id, { account: { ...f.account, value: v } });
                  }} />
                </div>
                <div className="min-w-0 col-span-2">
                  <EditableField field={f.assetName} onChange={(v) => {
                    onUpdateRow(row.id, { assetName: { ...f.assetName, value: v } });
                  }} />
                </div>
                <div className="min-w-0">
                  <EditableField field={f.assetType} options={ASSET_TYPES.map((a) => a.value)} onChange={(v) => {
                    onUpdateRow(row.id, { assetType: { ...f.assetType, value: v } });
                  }} />
                </div>
                <div className="min-w-0 text-right">
                  <span className="text-xs tabular-nums">{f.quantity.value || "-"}</span>
                </div>
                <div className="min-w-0 text-right">
                  <span className={cn("text-xs tabular-nums font-medium", !isNaN(mktVal) && (mktVal >= 0 ? "text-positive" : "text-negative"))}>
                    {f.marketValue.value ? formatMoney(mktVal) : "-"}
                  </span>
                </div>
                <div className="min-w-0 text-right">
                  <span className="text-xs tabular-nums text-muted-foreground">{f.holdingReturnRate.value || "-"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!readOnly && (
                  <>
                    {isIgnored ? (
                      <button onClick={() => onToggleAction(row.id, "save")} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="恢复">
                        <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <button onClick={() => onToggleAction(row.id, "ignore")} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="忽略">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => setExpandedRow(isExpanded ? null : row.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.assetName.value || "未识别"}</p>
                  <RecognitionStatusBadge status={row.status} />
                </div>
                {!readOnly && (
                  <button onClick={() => onToggleAction(row.id, isIgnored ? "save" : "ignore")} className="p-1.5">
                    {isIgnored ? <RotateCcw className="w-4 h-4 text-muted-foreground" /> : <X className="w-4 h-4 text-muted-foreground" />}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">成员</span> {f.member.value || "-"}</div>
                <div><span className="text-muted-foreground">账户</span> {f.account.value || "-"}</div>
                <div><span className="text-muted-foreground">类型</span> {ASSET_TYPE_LABELS[f.assetType.value as AssetType] || f.assetType.value || "-"}</div>
                <div><span className="text-muted-foreground">数量</span> {f.quantity.value || "-"}</div>
                <div><span className="text-muted-foreground">市值</span> {f.marketValue.value ? formatMoney(mktVal) : "-"}</div>
                <div><span className="text-muted-foreground">收益率</span> {f.holdingReturnRate.value || "-"}</div>
              </div>
            </div>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="border-t border-border p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {Object.entries(f).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-muted-foreground mb-0.5">{key}</p>
                      <div className="flex items-center gap-1">
                        <span>{val.value || "-"}</span>
                        {val.value && val.confidence < 80 && <ConfidenceBadge confidence={val.confidence} />}
                      </div>
                    </div>
                  ))}
                </div>
                {row.issues.length > 0 && (
                  <div className="space-y-1">
                    {row.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-warning">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button
          onClick={onAddRow}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          + 手动添加一行
        </button>
      )}
    </div>
  );
}
