"use client";

import { useState, useCallback } from "react";
import { RecognizedAssetRow, ImportSource, TransactionType, TRANSACTION_TYPE_LABELS } from "@/types/import";
import { formatAssetType } from "@/types/finance";
import { emptyImportFields } from "@/lib/import-helpers";
import { Plus, Trash2 } from "lucide-react";

const DEFAULT_MEMBERS = ["爸爸", "妈妈", "孩子"];
const DEFAULT_ACCOUNTS: Record<string, string[]> = {
  gold: ["黄金积存金账户"],
  manual: ["支付宝基金账户", "华泰证券账户", "招商银行账户", "工商银行理财账户", "黄金积存金账户"],
  batch_paste: ["支付宝基金账户", "华泰证券账户", "招商银行账户", "工商银行理财账户", "黄金积存金账户"],
};
const ASSET_TYPES = [
  { value: "A_SHARE", label: "股票" },
  { value: "MUTUAL_FUND", label: "基金" },
  { value: "GOLD_ACCUMULATION", label: "黄金" },
  { value: "BOND", label: "债券" },
  { value: "CASH", label: "现金" },
];
const TX_TYPES: TransactionType[] = ["BUY", "SELL", "DIVIDEND", "INTEREST", "DEPOSIT", "WITHDRAW", "FEE", "ADJUSTMENT"];
const CURRENCIES = ["CNY", "USD", "HKD"];

function needsAsset(txType: string): boolean {
  return ["BUY", "SELL", "DIVIDEND"].includes(txType);
}

function needsQuantity(txType: string): boolean {
  return ["BUY", "SELL"].includes(txType);
}

function needsPrice(txType: string): boolean {
  return ["BUY", "SELL"].includes(txType);
}

function isCashOnlyTx(txType: string): boolean {
  return ["DEPOSIT", "WITHDRAW"].includes(txType);
}

interface ManualTransactionFormProps {
  rows: RecognizedAssetRow[];
  source: ImportSource;
  onRowsChange: (rows: RecognizedAssetRow[]) => void;
  memberOptions?: string[];
  accountOptions?: string[];
}

export function ManualTransactionForm({ rows, source, onRowsChange, memberOptions, accountOptions }: ManualTransactionFormProps) {
  const members = memberOptions && memberOptions.length > 0 ? memberOptions : DEFAULT_MEMBERS;
  const accounts = accountOptions && accountOptions.length > 0 ? accountOptions : (DEFAULT_ACCOUNTS[source] ?? []);
  const updateRow = useCallback(
    (rowId: string, field: string, value: string) => {
      const newRows = rows.map((r) => {
        if (r.id !== rowId) return r;
        const newFields = {
          ...r.fields,
          [field]: { ...r.fields[field as keyof RecognizedAssetRow["fields"]], value },
        };
        // Auto-calc: grossAmount = quantity * price, netAmount = grossAmount - fee - tax
        const txType = newFields.transactionType.value;
        if (field === "quantity" || field === "price") {
          const qty = parseFloat(field === "quantity" ? value : (newFields.quantity.value || "0"));
          const prc = parseFloat(field === "price" ? value : (newFields.price.value || "0"));
          if (!isNaN(qty) && !isNaN(prc) && qty > 0 && prc > 0) {
            newFields.grossAmount = { ...newFields.grossAmount, value: String(qty * prc) };
          }
        }
        if (field === "grossAmount" || field === "fee" || field === "tax") {
          const gross = parseFloat(field === "grossAmount" ? value : (newFields.grossAmount.value || "0"));
          const fee = parseFloat(field === "fee" ? value : (newFields.fee.value || "0"));
          const tax = parseFloat(field === "tax" ? value : (newFields.tax.value || "0"));
          if (!isNaN(gross)) {
            const net = gross - (isNaN(fee) ? 0 : fee) - (isNaN(tax) ? 0 : tax);
            newFields.netAmount = { ...newFields.netAmount, value: String(net) };
          }
        }
        // If no specific grossAmount, use netAmount
        if (field === "netAmount" && !newFields.grossAmount.value) {
          newFields.grossAmount = { ...newFields.grossAmount, value };
        }
        return { ...r, fields: newFields };
      });
      onRowsChange(newRows);
    },
    [rows, onRowsChange],
  );

  const addRow = useCallback(() => {
    const newRow: RecognizedAssetRow = {
      id: `man-tx-${Date.now()}`,
      source,
      fields: emptyImportFields(),
      status: "missing_field",
      issues: ["请填写交易信息"],
      userAction: "save",
    };
    onRowsChange([...rows, newRow]);
  }, [rows, source, onRowsChange]);

  const deleteRow = useCallback(
    (rowId: string) => {
      onRowsChange(rows.filter((r) => r.id !== rowId));
    },
    [rows, onRowsChange],
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
        <Plus className="w-10 h-10 opacity-30" />
        <p className="text-sm">点击下方按钮添加交易行</p>
        <button
          onClick={addRow}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          添加一笔交易
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const f = row.fields;
        const txType = f.transactionType.value as TransactionType;
        const showAsset = needsAsset(txType);
        const showQty = needsQuantity(txType);
        const showPrice = needsPrice(txType);
        const cashOnly = isCashOnlyTx(txType);

        return (
          <div key={row.id} className="bg-background rounded-xl border border-border p-3 md:p-4">
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={f.transactionType.value}
                  onChange={(e) => updateRow(row.id, "transactionType", e.target.value)}
                  className="text-sm font-medium bg-transparent border-b border-border px-1 py-0.5"
                >
                  {TX_TYPES.map((t) => (
                    <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <button onClick={() => deleteRow(row.id)} className="p-1 text-muted-foreground hover:text-destructive ml-auto">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Field label="成员">
                  <SelectField value={f.member.value} options={members} onChange={(v) => updateRow(row.id, "member", v)} />
                </Field>
                <Field label="账户">
                  <SelectField value={f.account.value} options={accounts ?? []} allowCustom onChange={(v) => updateRow(row.id, "account", v)} />
                </Field>
                {!cashOnly && (
                  <Field label="资产名称">
                    <input value={f.assetName.value} onChange={(e) => updateRow(row.id, "assetName", e.target.value)} placeholder={showAsset ? "*必填" : "可选"} className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5" />
                  </Field>
                )}
                {!cashOnly && (
                  <Field label="类型">
                    <SelectField value={ASSET_TYPES.find(a => a.value === f.assetType.value)?.label || f.assetType.value} options={ASSET_TYPES.map((a) => a.label)} onChange={(v) => { const ev = ASSET_TYPES.find(a => a.label === v)?.value || v; updateRow(row.id, "assetType", ev); }} />
                  </Field>
                )}
                {showQty && (
                  <Field label="数量">
                    <input value={f.quantity.value} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                  </Field>
                )}
                {showPrice && (
                  <Field label="价格">
                    <input value={f.price.value} onChange={(e) => updateRow(row.id, "price", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                  </Field>
                )}
                <Field label={cashOnly ? "金额" : "成交金额"}>
                  <input value={f.grossAmount.value} onChange={(e) => updateRow(row.id, "grossAmount", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                </Field>
                {!cashOnly && (
                  <Field label="费用">
                    <input value={f.fee.value} onChange={(e) => updateRow(row.id, "fee", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                  </Field>
                )}
                {!cashOnly && (
                  <Field label="税费">
                    <input value={f.tax.value} onChange={(e) => updateRow(row.id, "tax", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                  </Field>
                )}
                <Field label="净额">
                  <input value={f.netAmount.value} onChange={(e) => updateRow(row.id, "netAmount", e.target.value)} placeholder="自动计算" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
                </Field>
                <Field label="交易日期">
                  <input type="date" value={f.tradeDate.value} onChange={(e) => updateRow(row.id, "tradeDate", e.target.value)} className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5" />
                </Field>
                <Field label="备注">
                  <input value={f.note.value} onChange={(e) => updateRow(row.id, "note", e.target.value)} placeholder={txType === "ADJUSTMENT" ? "*必须填写" : "可选"} className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5" />
                </Field>
              </div>
            </div>

            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-12 gap-2 items-center">
              <select
                value={f.transactionType.value}
                onChange={(e) => updateRow(row.id, "transactionType", e.target.value)}
                className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5"
              >
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <SelectField value={f.member.value} options={members} onChange={(v) => updateRow(row.id, "member", v)} />
              <SelectField value={f.account.value} options={accounts ?? []} allowCustom onChange={(v) => updateRow(row.id, "account", v)} />
              {!cashOnly ? (
                <div className="col-span-2">
                  <input value={f.assetName.value} onChange={(e) => updateRow(row.id, "assetName", e.target.value)} placeholder={showAsset ? "资产名称 *" : "可选"} className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5" />
                </div>
              ) : (
                <div className="col-span-2" />
              )}
              {showQty ? (
                <input value={f.quantity.value} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
              ) : (
                <div />
              )}
              {showPrice ? (
                <input value={f.price.value} onChange={(e) => updateRow(row.id, "price", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
              ) : (
                <div />
              )}
              <input value={f.grossAmount.value} onChange={(e) => updateRow(row.id, "grossAmount", e.target.value)} placeholder="0" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
              <input value={f.netAmount.value} onChange={(e) => updateRow(row.id, "netAmount", e.target.value)} placeholder="净额" className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5 text-right tabular-nums" />
              <input type="date" value={f.tradeDate.value} onChange={(e) => updateRow(row.id, "tradeDate", e.target.value)} className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5" />
              <button onClick={() => deleteRow(row.id)} className="p-1 text-muted-foreground hover:text-destructive justify-self-end">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={addRow}
        className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加一笔交易
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  );
}

function SelectField({ value, options, onChange, allowCustom }: { value: string; options: string[]; onChange: (v: string) => void; allowCustom?: boolean }) {
  const listId = `sf-${value?.replace(/\s/g, '')}-${Math.random().toString(36).slice(2, 6)}`;

  if (allowCustom) {
    return (
      <div className="relative">
        <input
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入或选择..."
          className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5"
        />
        <datalist id={listId}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs bg-transparent border-b border-border px-1 py-0.5"
    >
      <option value="">选择...</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
