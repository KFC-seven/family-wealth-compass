"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Card>
        <CardContent className="p-5 space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

export function SettingsToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors flex-shrink-0",
          checked ? "bg-primary" : "bg-secondary"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

export function SettingsSelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 max-w-[200px]"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function SettingsInputRow({ label, value, placeholder, onChange, type }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium min-w-0 flex-1">{label}</p>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 max-w-[250px] w-full"
      />
    </div>
  );
}

export function TagSelector({ label, tags, options, onChange }: {
  label: string; tags: string[]; options: string[]; onChange: (tags: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = tags.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onChange(selected ? tags.filter((t) => t !== opt) : [...tags, opt])}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RiskPreferenceSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["保守", "稳健", "平衡", "进取", "激进"];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">风险偏好</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-1",
              value === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SaveButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={() => { onClick(); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
      className={cn(
        "px-5 py-2 rounded-xl text-sm font-medium transition-colors",
        saved ? "bg-positive text-white" : "bg-primary text-primary-foreground hover:opacity-90",
        className
      )}
    >
      {saved ? "已保存" : "保存"}
    </button>
  );
}
