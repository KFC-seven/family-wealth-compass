"use client";

import { AlertCircle } from "lucide-react";
import { ImportValidationIssue } from "@/types/import";
import { cn } from "@/lib/utils";

interface ImportValidationPanelProps {
  issues: ImportValidationIssue[];
}

export function ImportValidationPanel({ issues }: ImportValidationPanelProps) {
  const errors = issues.filter((i) => i.type === "error");
  const warnings = issues.filter((i) => i.type === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2 h-2 rounded-full bg-positive" />
        <span className="text-positive font-medium">校验通过</span>
        <span className="text-muted-foreground">所有字段正常</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-negative">{errors.length} 个错误</p>
          {errors.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-negative bg-red-50/50 dark:bg-red-950/20 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-warning">{warnings.length} 个警告</p>
          {warnings.slice(0, 5).map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-warning bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{issue.message}</span>
            </div>
          ))}
          {warnings.length > 5 && (
            <p className="text-xs text-muted-foreground">还有 {warnings.length - 5} 条警告...</p>
          )}
        </div>
      )}
    </div>
  );
}
