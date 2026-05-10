"use client";

import { ImportMode, IMPORT_MODE_LABELS } from "@/types/import";
import { Camera, Pencil, ArrowRightLeft, ClipboardPaste } from "lucide-react";

const MODE_ICONS: Record<ImportMode, typeof Camera> = {
  ocr: Camera,
  manual_holding: Pencil,
  manual_transaction: ArrowRightLeft,
  batch_paste: ClipboardPaste,
};

interface ImportModeTabsProps {
  mode: ImportMode;
  onChange: (mode: ImportMode) => void;
}

export function ImportModeTabs({ mode, onChange }: ImportModeTabsProps) {
  const modes: ImportMode[] = ["ocr", "manual_holding", "manual_transaction", "batch_paste"];

  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-xl overflow-x-auto">
      {modes.map((m) => {
        const Icon = MODE_ICONS[m];
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {IMPORT_MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
