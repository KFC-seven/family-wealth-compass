"use client";

import { CheckCircle2, ArrowLeft, Upload } from "lucide-react";
import { ImportSaveMode, ImportResult } from "@/types/import";
import { cn } from "@/lib/utils";

interface ImportSaveModeSelectorProps {
  mode: ImportSaveMode;
  onChange: (mode: ImportSaveMode) => void;
}

export function ImportSaveModeSelector({ mode, onChange }: ImportSaveModeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">保存方式</p>
      <div className="flex gap-2">
        {(["holding_snapshot", "transaction"] as ImportSaveMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${
              mode === m
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {m === "holding_snapshot" ? "持仓快照" : "交易记录"}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ImportSuccessStateProps {
  result: ImportResult;
  onGoHome: () => void;
  onContinue: () => void;
}

export function ImportSuccessState({ result, onGoHome, onContinue }: ImportSuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-full bg-positive/10 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-positive" />
      </div>
      <div className="text-center">
        <p className="text-xl font-bold">导入成功</p>
        <p className="text-sm text-muted-foreground mt-1">数据已保存</p>
      </div>
      <div className="grid grid-cols-3 gap-6 text-center">
        <div>
          <p className="text-2xl font-bold tabular-nums text-positive">{result.savedCount}</p>
          <p className="text-xs text-muted-foreground">成功保存</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-muted-foreground">{result.ignoredCount}</p>
          <p className="text-xs text-muted-foreground">已忽略</p>
        </div>
        <div>
          <p className={cn("text-2xl font-bold tabular-nums", result.issueCount > 0 ? "text-warning" : "text-muted-foreground")}>
            {result.issueCount}
          </p>
          <p className="text-xs text-muted-foreground">异常提示</p>
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={onGoHome} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回总览
        </button>
        <button onClick={onContinue} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors">
          <Upload className="w-4 h-4" />
          继续导入
        </button>
      </div>
    </div>
  );
}
