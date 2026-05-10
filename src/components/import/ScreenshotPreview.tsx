"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Shield, Landmark, CheckCircle2, Clock } from "lucide-react";
import { ImportSource } from "@/types/import";
import { cn } from "@/lib/utils";

const sourceConfig: Record<ImportSource, { icon: React.ReactNode; color: string; bg: string }> = {
  alipay: { icon: <Smartphone className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  broker: { icon: <Shield className="w-4 h-4" />, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  bank: { icon: <Landmark className="w-4 h-4" />, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  manual: { icon: <Smartphone className="w-4 h-4" />, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/30" },
  batch_paste: { icon: <Smartphone className="w-4 h-4" />, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/30" },
};

interface ScreenshotPreviewProps {
  source: ImportSource | null;
  label: string;
  status: "selecting" | "preview" | "recognizing" | "done";
}

export function ScreenshotPreview({ source, label, status }: ScreenshotPreviewProps) {
  if (!source) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center h-48 text-sm text-muted-foreground">
          请选择或上传截图
        </CardContent>
      </Card>
    );
  }

  const cfg = sourceConfig[source];

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
              <span className={cfg.color}>{cfg.icon}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{source === "alipay" ? "支付宝" : source === "broker" ? "券商 App" : "银行 App"}</p>
            </div>
          </div>
          {status === "done" ? (
            <CheckCircle2 className="w-5 h-5 text-positive" />
          ) : status === "recognizing" ? (
            <Clock className="w-5 h-5 text-warning animate-pulse" />
          ) : null}
        </div>
        {/* Mock screenshot placeholder */}
        <div className={cn(
          "rounded-xl h-40 flex items-center justify-center border border-border",
          cfg.bg
        )}>
          <div className="text-center">
            <div className="flex justify-center mb-2">{cfg.icon}</div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">截图预览</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
