"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  holdingId: string;
  initial: {
    assetName: string;
    quantity: number;
    currentPrice: number;
    marketValue: number;
    remainingCost: number;
    holdingReturn: number;
  };
}

export function EditHoldingButton({ holdingId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    quantity: String(initial.quantity || ""),
    currentPrice: String(initial.currentPrice || ""),
    marketValue: String(initial.marketValue || ""),
    remainingCost: String(initial.remainingCost || ""),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      const qty = parseFloat(form.quantity);
      const price = parseFloat(form.currentPrice);
      const mv = parseFloat(form.marketValue);
      const cost = parseFloat(form.remainingCost);

      if (!isNaN(qty)) body.quantity = qty;
      if (!isNaN(price)) body.currentPrice = price;
      if (!isNaN(mv)) body.currentMarketValue = mv;
      if (!isNaN(cost)) body.remainingCost = cost;
      if (!isNaN(mv) && !isNaN(cost)) body.holdingReturn = mv - cost;

      const res = await fetch(`/api/holdings/${holdingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setOpen(false);
      window.location.reload();
    } catch (e) {
      console.error("Edit holding failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        编辑
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setOpen(false)}>
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">编辑 {initial.assetName}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">数量</span>
                <input
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">当前价格</span>
                <input
                  value={form.currentPrice}
                  onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">市值</span>
                <input
                  value={form.marketValue}
                  onChange={(e) => setForm({ ...form, marketValue: e.target.value })}
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">成本</span>
                <input
                  value={form.remainingCost}
                  onChange={(e) => setForm({ ...form, remainingCost: e.target.value })}
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 mt-0.5"
                />
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
