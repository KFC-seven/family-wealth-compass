"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortKey = "marketValue" | "holdingReturn" | "holdingReturnRate" | "assetName";

interface SortOption {
  key: SortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "marketValue", label: "市值" },
  { key: "holdingReturn", label: "收益金额" },
  { key: "holdingReturnRate", label: "收益率" },
  { key: "assetName", label: "名称" },
];

interface SortBarProps {
  onSortChange: (key: SortKey, desc: boolean) => void;
  className?: string;
}

export function SortBar({ onSortChange, className }: SortBarProps) {
  const [active, setActive] = useState<SortKey>("marketValue");
  const [desc, setDesc] = useState(true);

  const handleClick = (key: SortKey) => {
    if (key === active) {
      const newDesc = !desc;
      setDesc(newDesc);
      onSortChange(key, newDesc);
    } else {
      setActive(key);
      setDesc(true);
      onSortChange(key, true);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => handleClick(opt.key)}
          className={cn(
            "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md text-xs transition-colors",
            active === opt.key
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {opt.label}
          {active === opt.key ? (
            desc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function useSorted<T extends Record<string, any>>(
  items: T[],
  initialKey: SortKey = "marketValue",
): { sorted: T[]; sortBar: React.ReactNode; sortKey: SortKey; desc: boolean } {
  const [sortKey, setSortKey] = useState<SortKey>(initialKey);
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === "assetName") {
        va = 0; vb = 0; // alphabetical handled below
        const cmp = String(a.assetName || "").localeCompare(String(b.assetName || ""));
        return desc ? -cmp : cmp;
      }
      va = parseFloat(a[sortKey]) || 0;
      vb = parseFloat(b[sortKey]) || 0;
      return desc ? vb - va : va - vb;
    });
  }, [items, sortKey, desc]);

  const handleSort = (key: SortKey, d: boolean) => {
    setSortKey(key);
    setDesc(d);
  };

  return {
    sorted,
    sortKey,
    desc,
    sortBar: <SortBar onSortChange={handleSort} />,
  };
}
