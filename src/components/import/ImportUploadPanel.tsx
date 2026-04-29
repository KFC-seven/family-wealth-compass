"use client";

import { useState } from "react";
import { Upload, Smartphone, Shield, Landmark } from "lucide-react";
import { ImportExample, ImportSource } from "@/types/import";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sourceIcons: Record<ImportSource, React.ReactNode> = {
  alipay: <Smartphone className="w-5 h-5" />,
  broker: <Shield className="w-5 h-5" />,
  bank: <Landmark className="w-5 h-5" />,
};

interface ImportUploadPanelProps {
  examples: ImportExample[];
  onSelectExample: (id: string) => void;
  onUploadClick: () => void;
  selectedId?: string;
  recognizing?: boolean;
}

export function ImportUploadPanel({ examples, onSelectExample, onUploadClick, selectedId, recognizing }: ImportUploadPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm font-semibold">上传截图</p>
          <button
            onClick={onUploadClick}
            disabled={recognizing}
            className="w-full border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">点击上传截图</p>
            <p className="text-xs text-muted-foreground">支持 JPG、PNG 格式</p>
          </button>
          <p className="text-xs text-muted-foreground text-center">截图可能包含敏感资产信息，请仅在可信环境中使用。</p>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 px-1">或使用示例截图</p>
        <div className="space-y-2">
          {examples.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelectExample(ex.id)}
              disabled={recognizing}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border border-border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                selectedId === ex.id
                  ? "border-primary/50 bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                ex.source === "alipay" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30" :
                ex.source === "broker" ? "bg-red-50 text-red-600 dark:bg-red-950/30" :
                "bg-green-50 text-green-600 dark:bg-green-950/30"
              )}>
                {sourceIcons[ex.source]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{ex.label}</p>
                <p className="text-xs text-muted-foreground">{ex.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
