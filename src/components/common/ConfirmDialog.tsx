"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = "确认", cancelLabel = "取消",
  onConfirm, onCancel, variant = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative bg-card rounded-2xl border border-border shadow-lg p-6 max-w-sm w-full mx-4 space-y-4 animate-in">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">{title}</p>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            variant === "destructive" ? "bg-positive text-white hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90",
          )}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
