"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportModeTabs } from "@/components/import/ImportModeTabs";
import { ImportUploadPanel } from "@/components/import/ImportUploadPanel";
import { ScreenshotPreview } from "@/components/import/ScreenshotPreview";
import { RecognitionProgress } from "@/components/import/RecognitionProgress";
import { RecognitionResultTable } from "@/components/import/RecognitionResultTable";
import { ImportValidationPanel } from "@/components/import/ImportValidationPanel";
import { ImportSummaryCard } from "@/components/import/ImportSummaryCard";
import { ImportSuccessState } from "@/components/import/ImportSaveModeSelector";
import { ManualHoldingForm } from "@/components/import/ManualHoldingForm";
import { ManualTransactionForm } from "@/components/import/ManualTransactionForm";
import { BatchPastePanel } from "@/components/import/BatchPastePanel";
import { emptyImportFields } from "@/lib/import-helpers";
import { mockImportExamples, mockImportRowsMap } from "@/data/mock-import";
import { validateRecognizedRows, calculateImportSummary } from "@/lib/import-validation";
import type { ImportSession, ImportMode, ImportSaveMode, RecognizedAssetRow } from "@/types/import";
import { api, USE_API_DATA } from "@/lib/api/api-client";
import { AlertTriangle, CheckCircle2, ArrowLeft, Upload } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("ocr");
  const [session, setSession] = useState<ImportSession>({
    id: "", source: null, screenshotUrl: null, status: "selecting",
    rows: [], validationIssues: [], saveMode: "holding_snapshot", mode: "ocr",
  });
  const [recogStatus, setRecogStatus] = useState<"idle" | "uploading" | "recognizing" | "done" | "error">("idle");
  const [apiSessionId, setApiSessionId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [useApi, setUseApi] = useState(USE_API_DATA);
  const [memberOptions, setMemberOptions] = useState<string[]>([]);
  const [accountOptions, setAccountOptions] = useState<string[]>([]);

  // ---- Fetch member/account options from API ----
  useEffect(() => {
    if (!useApi) return;
    (async () => {
      try {
        const members = await api.members();
        setMemberOptions(members.map((m) => m.name));

        const accountNames = new Set<string>();
        for (const m of members) {
          try {
            const detail = await api.member(m.id);
            for (const acc of detail.accounts) {
              accountNames.add(acc.name);
            }
          } catch {}
        }
        setAccountOptions([...accountNames]);
      } catch {}
    })();
  }, [useApi]);

  // ---- Mode switching ----
  const handleModeChange = useCallback((newMode: ImportMode) => {
    setMode(newMode);
    // Reset state for new mode
    setSession((s) => ({
      ...s,
      mode: newMode,
      status: "selecting",
      rows: [],
      source: newMode === "manual_holding" || newMode === "manual_transaction" || newMode === "batch_paste"
        ? "manual" : null,
      saveMode: newMode === "manual_transaction" ? "transaction" : "holding_snapshot",
      screenshotUrl: null,
    }));
    setRecogStatus("idle");
    setApiSessionId(null);
    setUploadedFile(null);
  }, []);

  // ---- API session helper ----
  const createApiSession = useCallback(async (sourcePlatform: string, saveMode: string) => {
    if (!useApi) return null;
    try {
      const houseResp = await api.householdSummary();
      const sessResp = await api.createImportSession({
        sourcePlatform,
        saveMode,
        householdId: houseResp.householdId,
      });
      setApiSessionId(sessResp.id);
      return sessResp.id;
    } catch {
      return null;
    }
  }, [useApi]);

  // ---- OCR flow ----
  const handleSelectExample = useCallback((exampleId: string) => {
    const example = mockImportExamples.find((e) => e.id === exampleId);
    if (!example) return;
    setRecogStatus("recognizing");
    setSession((s) => ({ ...s, source: example.source, screenshotUrl: exampleId, status: "recognizing" }));
    const rows = mockImportRowsMap[exampleId] || [];
    setRecogStatus("recognizing");
    setSession((s) => ({ ...s, source: example.source, screenshotUrl: exampleId, status: "recognizing" }));
    setTimeout(() => {
      setRecogStatus("done");
      setSession((s) => ({
        ...s,
        status: "review",
        rows: rows.map((r) => ({ ...r, fields: { ...r.fields }, source: example.source })),
      }));
    }, 1500);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setRecogStatus("uploading");
    try {
      const houseResp = await api.householdSummary();
      const sessResp = await api.createImportSession({
        sourcePlatform: "ALIPAY", saveMode: "HOLDING_SNAPSHOT", householdId: houseResp.householdId,
      });
      const sessId = sessResp.id;
      setApiSessionId(sessId);
      await api.uploadImportFile(sessId, file);
      setSession((s) => ({ ...s, id: sessId, source: "alipay", screenshotUrl: URL.createObjectURL(file), status: "uploaded" }));
      setRecogStatus("recognizing");
      setSession((s) => ({ ...s, status: "recognizing" }));
      await api.recognizeImport(sessId);
      const full = await api.getImportSession(sessId);
      setRecogStatus("done");
      setSession((s) => ({
        ...s, id: sessId, source: "alipay", status: "review",
        rows: full.rows.map((r: any) => ({
          id: r.id, source: full.sourcePlatform as any,
          fields: {
            member: { value: r.memberId ?? "", confidence: r.confidence, editable: true },
            account: { value: r.accountId ?? "", confidence: r.confidence, editable: true },
            assetName: { value: r.assetName, confidence: r.confidence, editable: true },
            assetCode: { value: r.assetCode ?? "", confidence: r.confidence, editable: true },
            assetType: { value: r.assetType, confidence: r.confidence, editable: true },
            currency: { value: r.currency, confidence: r.confidence, editable: true },
            market: { value: r.market ?? "", confidence: r.confidence, editable: true },
            quantity: { value: r.quantity ?? "", confidence: r.confidence, editable: true },
            price: { value: r.price ?? "", confidence: r.confidence, editable: true },
            marketValue: { value: r.marketValue ?? "", confidence: r.confidence, editable: true },
            cost: { value: r.cost ?? "", confidence: r.confidence, editable: true },
            holdingReturn: { value: r.holdingReturn ?? "", confidence: r.confidence, editable: true },
            holdingReturnRate: { value: "", confidence: r.confidence, editable: true },
            cashBalance: { value: "", confidence: r.confidence, editable: true },
            dataDate: { value: new Date().toISOString().slice(0, 10), confidence: r.confidence, editable: true },
            note: { value: r.note ?? "", confidence: 100, editable: true },
            transactionType: { value: "", confidence: 100, editable: true },
            tradeDate: { value: "", confidence: 100, editable: true },
            grossAmount: { value: "", confidence: 100, editable: true },
            fee: { value: "", confidence: 100, editable: true },
            tax: { value: "", confidence: 100, editable: true },
            netAmount: { value: "", confidence: 100, editable: true },
            cashImpact: { value: "", confidence: 100, editable: true },
            realizedReturn: { value: "", confidence: 100, editable: true },
          },
          status: r.status as any,
          issues: r.validationIssues ? (Array.isArray(r.validationIssues) ? r.validationIssues.map((i: any) => i.message ?? JSON.stringify(i)) : []) : [],
          userAction: r.action === "IGNORE" ? "ignore" : "save",
        })),
      }));
    } catch (err) {
      console.warn("[Import] API flow failed", err);
      setRecogStatus("error");
      setUseApi(false);
    }
  }, []);

  const handleUploadClick = useCallback(() => {
    if (useApi) { fileInputRef.current?.click(); }
    else { handleSelectExample(mockImportExamples[0].id); }
  }, [useApi, handleSelectExample]);

  // ---- Manual holding rows ----
  const handleManualHoldingRowsChange = useCallback((rows: RecognizedAssetRow[]) => {
    setSession((s) => ({ ...s, rows, status: "review" }));
  }, []);

  // ---- Manual transaction rows ----
  const handleManualTransactionRowsChange = useCallback((rows: RecognizedAssetRow[]) => {
    setSession((s) => ({ ...s, rows, status: "review" }));
  }, []);

  // ---- Batch paste onRowsReady ----
  const handleBatchRowsReady = useCallback((rows: RecognizedAssetRow[]) => {
    setSession((s) => ({ ...s, rows: [...s.rows, ...rows], status: "review" }));
  }, []);

  // ---- Shared logic ----
  const validationIssues = useMemo(() => {
    if (session.status !== "review" && session.status !== "summary") return [];
    return validateRecognizedRows(session.rows);
  }, [session.rows, session.status]);

  const handleUpdateRow = useCallback((rowId: string, fields: Partial<RecognizedAssetRow["fields"]>) => {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) => r.id === rowId ? { ...r, fields: { ...r.fields, ...fields } } : r),
    }));
    if (apiSessionId && useApi) {
      const row = session.rows.find((r) => r.id === rowId);
      if (row) {
        const updatedFields = { ...row.fields, ...fields };
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(updatedFields)) {
          payload[k] = (v as any).value;
        }
        api.updateImportRow(apiSessionId, rowId, payload).catch(() => {});
      }
    }
  }, [apiSessionId, session.rows, useApi]);

  const handleToggleAction = useCallback((rowId: string, action: "save" | "ignore") => {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) => r.id === rowId ? { ...r, userAction: action } : r),
    }));
    if (apiSessionId && useApi) {
      api.updateImportRow(apiSessionId, rowId, {
        action: action === "ignore" ? "IGNORE" : "SAVE",
        status: action === "ignore" ? "IGNORED" : "CONFIRMED",
      }).catch(() => {});
    }
  }, [apiSessionId, useApi]);

  const handleAddRow = useCallback(() => {
    const emptyF = emptyImportFields();

    const newRow: RecognizedAssetRow = {
      id: `manual-${Date.now()}`,
      source: session.source || "manual",
      fields: emptyF,
      status: "missing_field",
      issues: ["手动添加，请填写必填字段"],
      userAction: "save",
    };
    setSession((s) => ({ ...s, rows: [...s.rows, newRow] }));
    if (apiSessionId && useApi) {
      api.addImportRow(apiSessionId, { assetName: "", assetType: "OTHER", action: "MANUAL" })
        .then((resp) => {
          setSession((s) => ({ ...s, rows: s.rows.map((r) => (r.id === newRow.id ? { ...r, id: resp.id } : r)) }));
        }).catch(() => {});
    }
  }, [session.source, apiSessionId, useApi]);

  const handleGoToSummary = useCallback(async () => {
    // For manual modes, ensure we create an API session first
    if (mode !== "ocr" && !apiSessionId && useApi) {
      const sp = mode === "manual_transaction" ? "MANUAL" : "MANUAL";
      const sm = (mode === "manual_transaction" || session.saveMode === "transaction") ? "TRANSACTION_RECORD" : "HOLDING_SNAPSHOT";
      const sessId = await createApiSession(sp, sm);
      if (sessId) {
        setApiSessionId(sessId);
        // Sync current rows to API
        for (const row of session.rows) {
          try {
            const payload: Record<string, unknown> = {
              assetName: row.fields.assetName.value,
              assetType: row.fields.assetType.value || "OTHER",
              action: "MANUAL",
            };
            // Add all field values
            for (const [k, v] of Object.entries(row.fields)) {
              if (v.value) payload[k] = v.value;
            }
            await api.addImportRow(sessId, payload);
          } catch {}
        }
      }
    }
    setSession((s) => ({ ...s, status: "summary" }));
  }, [mode, apiSessionId, useApi, session, createApiSession]);

  const handleBackToReview = useCallback(() => {
    setSession((s) => ({ ...s, status: "review" }));
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (apiSessionId && useApi) {
      setSession((s) => ({ ...s, status: "saving" }));
      try {
        const sm = mode === "manual_transaction" || session.saveMode === "transaction"
          ? "TRANSACTION_RECORD" : "HOLDING_SNAPSHOT";
        const result = await api.confirmImport(apiSessionId, { saveMode: sm });
        const rows = session.rows;
        const members = [...new Set(rows.filter((r) => r.fields.member.value).map((r) => r.fields.member.value))];
        const accounts = [...new Set(rows.filter((r) => r.fields.account.value).map((r) => r.fields.account.value))];
        const assetTypes = [...new Set(rows.filter((r) => r.fields.assetType.value).map((r) => r.fields.assetType.value))];
        setSession((s) => ({
          ...s, status: "done" as const,
          result: { savedCount: result.savedCount, ignoredCount: result.ignoreCount,
            issueCount: rows.length - result.savedCount - result.ignoreCount,
            members, accounts, assetTypes },
        }));
      } catch (err) {
        setSession((s) => ({ ...s, status: "review" }));
        console.error("[Import] Save failed", err);
      }
    } else {
      setSession((s) => ({ ...s, status: "saving" }));
      setTimeout(() => {
        setSession((s) => {
          const savedCount = s.rows.filter((r) => r.userAction === "save").length;
          const ignoredCount = s.rows.filter((r) => r.userAction === "ignore").length;
          const members = [...new Set(s.rows.filter((r) => r.fields.member.value).map((r) => r.fields.member.value))];
          const accounts = [...new Set(s.rows.filter((r) => r.fields.account.value).map((r) => r.fields.account.value))];
          const assetTypes = [...new Set(s.rows.filter((r) => r.fields.assetType.value).map((r) => r.fields.assetType.value))];
          return { ...s, status: "done" as const,
            result: { savedCount, ignoredCount, issueCount: validationIssues.length, members, accounts, assetTypes },
          };
        });
      }, 1200);
    }
  }, [apiSessionId, useApi, mode, session.saveMode, session.rows, validationIssues]);

  const handleGoHome = useCallback(() => router.push("/"), [router]);
  const handleContinue = useCallback(() => {
    setSession({
      id: "", source: null, screenshotUrl: null, status: "selecting",
      rows: [], validationIssues: [], saveMode: "holding_snapshot", mode,
    });
    setRecogStatus("idle");
    setApiSessionId(null);
    setUploadedFile(null);
  }, [mode]);

  const summary = useMemo(() => {
    if (session.status !== "summary") return null;
    return calculateImportSummary(session.rows, session.saveMode);
  }, [session.rows, session.saveMode, session.status]);

  const effectiveIssues = session.status === "summary" || session.status === "review" ? validationIssues : [];
  const hasErrors = effectiveIssues.some((i) => i.type === "error");

  const isSelecting = session.status === "selecting" || session.status === "recognizing" || session.status === "uploaded";
  const isReview = session.status === "review";
  const isSummary = session.status === "summary";
  const isDone = session.status === "done";
  const isRecognizing = session.status === "recognizing";
  const isUploading = recogStatus === "uploading";

  // Page title adapts to mode
  const pageTitle = mode === "ocr" ? "导入持仓截图"
    : mode === "manual_holding" ? "手动录入持仓"
    : mode === "manual_transaction" ? "手动录入交易"
    : "批量粘贴导入";
  const pageSubtitle = mode === "ocr" ? "上传或选择示例截图，系统将自动识别持仓信息"
    : mode === "manual_holding" ? "直接录入当前持仓数据，无需上传截图"
    : mode === "manual_transaction" ? "直接录入交易记录，支持买入/卖出/分红/利息/出入金/费用/调整"
    : "从 Excel / 表格粘贴数据，批量导入";

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />

      {/* Hidden file input for OCR mode */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect} className="hidden" />

      {!useApi && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          当前使用 mock fallback。设置 NEXT_PUBLIC_USE_API=true 启用 API 模式。
        </div>
      )}

      {/* Mode Tabs */}
      <ImportModeTabs mode={mode} onChange={handleModeChange} />

      {isDone && session.result ? (
        <ImportSuccessState result={session.result} onGoHome={handleGoHome} onContinue={handleContinue} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* OCR mode: upload panel */}
            {mode === "ocr" && isSelecting && (
              <ImportUploadPanel
                examples={mockImportExamples}
                onSelectExample={handleSelectExample}
                onUploadClick={handleUploadClick}
                selectedId={session.screenshotUrl || undefined}
                recognizing={isRecognizing || isUploading}
              />
            )}

            {mode === "ocr" && session.source && (
              <ScreenshotPreview
                source={session.source}
                label={
                  session.screenshotUrl && !session.screenshotUrl.startsWith("blob:")
                    ? mockImportExamples.find((e) => e.id === session.screenshotUrl)?.screenshotLabel || "截图预览"
                    : "上传截图预览"
                }
                status={recogStatus === "done" ? "done" : recogStatus === "recognizing" ? "recognizing" : "preview"}
              />
            )}

            {mode === "ocr" && <RecognitionProgress status={recogStatus} />}

            {/* Batch paste panel */}
            {mode === "batch_paste" && isSelecting && (
              <BatchPastePanel
                source="batch_paste"
                saveMode={session.saveMode}
                onRowsReady={handleBatchRowsReady}
              />
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-3 space-y-4">
            {/* OCR review mode */}
            {mode === "ocr" && isReview && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">识别结果 ({session.rows.length} 行)</p>
                </div>
                <ImportValidationPanel issues={effectiveIssues} />
                <RecognitionResultTable
                  rows={session.rows}
                  onUpdateRow={handleUpdateRow}
                  onToggleAction={handleToggleAction}
                  onAddRow={handleAddRow}
                  memberOptions={memberOptions}
                  accountOptions={accountOptions}
                />
                <div className="flex justify-end pt-2">
                  <button onClick={handleGoToSummary} disabled={hasErrors}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={hasErrors ? "请先修复错误" : undefined}>
                    {hasErrors ? "存在错误，请修复" : "查看保存摘要"}
                  </button>
                </div>
              </>
            )}

            {/* Manual holding review */}
            {(mode === "manual_holding" || mode === "batch_paste") && (isReview || isSelecting || isSummary) && session.saveMode === "holding_snapshot" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {session.rows.length > 0 ? `持仓数据 (${session.rows.length} 行)` : "手动录入持仓"}
                  </p>
                </div>
                {isReview && <ImportValidationPanel issues={effectiveIssues} />}
                <ManualHoldingForm
                  rows={session.rows}
                  source={session.source ?? "manual"}
                  onRowsChange={handleManualHoldingRowsChange}
                  memberOptions={memberOptions}
                  accountOptions={accountOptions}
                />
                {session.rows.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <button onClick={handleGoToSummary} disabled={hasErrors}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={hasErrors ? "请先修复错误" : undefined}>
                      {hasErrors ? "存在错误，请修复" : "查看保存摘要"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Manual transaction review */}
            {(mode === "manual_transaction" || mode === "batch_paste") && (isReview || isSelecting || isSummary) && session.saveMode === "transaction" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {session.rows.length > 0 ? `交易记录 (${session.rows.length} 行)` : "手动录入交易"}
                  </p>
                </div>
                {isReview && <ImportValidationPanel issues={effectiveIssues} />}
                <ManualTransactionForm
                  rows={session.rows}
                  source={session.source ?? "manual"}
                  onRowsChange={handleManualTransactionRowsChange}
                  memberOptions={memberOptions}
                  accountOptions={accountOptions}
                />
                {session.rows.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <button onClick={handleGoToSummary} disabled={hasErrors}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={hasErrors ? "请先修复错误" : undefined}>
                      {hasErrors ? "存在错误，请修复" : "查看保存摘要"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Mode not selected yet */}
            {mode === "batch_paste" && session.rows.length === 0 && !isReview && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm space-y-2">
                <p>在左侧粘贴数据后，解析的表格将显示在此处</p>
              </div>
            )}

            {/* Summary card */}
            {isSummary && summary && (
              <ImportSummaryCard
                summary={summary}
                onConfirm={handleConfirmSave}
                onBack={handleBackToReview}
                saving={session.status === "saving"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
