"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  memberId?: string;
  label?: string;
}

export function ExportButton({ memberId, label }: ExportButtonProps) {
  const handleExport = () => {
    const url = memberId
      ? `/api/export/holdings?memberId=${encodeURIComponent(memberId)}`
      : "/api/export/holdings?memberId=all";
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      {label ?? "导出 Excel"}
    </button>
  );
}
