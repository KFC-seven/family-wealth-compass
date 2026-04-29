"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportUploadPanel } from "@/components/import/ImportUploadPanel";
import { ScreenshotPreview } from "@/components/import/ScreenshotPreview";
import { RecognitionProgress } from "@/components/import/RecognitionProgress";
import { RecognitionResultTable } from "@/components/import/RecognitionResultTable";
import { ImportValidationPanel } from "@/components/import/ImportValidationPanel";
import { ImportSaveModeSelector } from "@/components/import/ImportSaveModeSelector";
import { ImportSummaryCard } from "@/components/import/ImportSummaryCard";
import { ImportSuccessState } from "@/components/import/ImportSaveModeSelector";
import { ChartCard } from "@/components/charts/ChartCard";
import { mockImportExamples, mockImportRowsMap } from "@/data/mock-import";
import { validateRecognizedRows, calculateImportSummary } from "@/lib/import-validation";
import type { ImportSession, ImportSaveMode, RecognizedAssetRow } from "@/types/import";
import { api, USE_API_DATA } from "@/lib/api/api-client";
import { Loader2, Upload, AlertTriangle } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<ImportSession>({
    id: "",
    source: null,
    screenshotUrl: null,
    status: "selecting",
    rows: [],
    validationIssues: [],
    saveMode: "holding_snapshot",
  });
  const [recogStatus, setRecogStatus] = useState<"idle" | "uploading" | "recognizing" | "done" | "error">("idle");
  const [apiSessionId, setApiSessionId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [useApi, setUseApi] = useState(USE_API_DATA);

  // ---- Mock flow (unchanged) ----
  const handleSelectExample = useCallback((exampleId: string) => {
    const example = mockImportExamples.find((e) => e.id === exampleId);
    if (!example) return;
    setRecogStatus("recognizing");
    setSession((s) => ({
      ...s,
      source: example.source,
      screenshotUrl: exampleId,
      status: "recognizing",
    }));
    setTimeout(() => {
      const rows = mockImportRowsMap[exampleId] || [];
      setRecogStatus("done");
      setSession((s) => ({
        ...s,
        status: "review",
        rows: rows.map((r) => ({
          ...r,
          fields: { ...r.fields },
          source: example.source,
        })),
      }));
    }, 1500);
  }, []);

  // ---- API flow ----
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setRecogStatus("uploading");

    try {
      // 1. Create session
      const houseResp = await api.householdSummary();
      const householdId = houseResp.householdId;

      const sessResp = await api.createImportSession({
        sourcePlatform: "ALIPAY",
        saveMode: "HOLDING_SNAPSHOT",
        householdId,
      });

      const sessId = sessResp.id;
      setApiSessionId(sessId);

      // 2. Upload file
      await api.uploadImportFile(sessId, file);

      setSession((s) => ({
        ...s,
        id: sessId,
        source: "alipay",
        screenshotUrl: URL.createObjectURL(file),
        status: "uploaded",
      }));

      // 3. Trigger OCR
      setRecogStatus("recognizing");
      setSession((s) => ({ ...s, status: "recognizing" }));

      const ocrResult = await api.recognizeImport(sessId);

      // 4. Fetch session with rows
      const full = await api.getImportSession(sessId);

      setRecogStatus("done");
      setSession((s) => ({
        ...s,
        id: sessId,
        source: "alipay",
        status: "review",
        rows: full.rows.map((r) => ({
          id: r.id,
          source: full.sourcePlatform as any,
          fields: {
            member: { value: r.memberId ?? "", confidence: r.confidence, editable: true },
            account: { value: r.accountId ?? "", confidence: r.confidence, editable: true },
            assetName: { value: r.assetName, confidence: r.confidence, editable: true },
            assetCode: { value: r.assetCode ?? "", confidence: r.confidence, editable: true },
            assetType: { value: r.assetType, confidence: r.confidence, editable: true },
            currency: { value: r.currency, confidence: r.confidence, editable: true },
            quantity: { value: r.quantity ?? "", confidence: r.confidence, editable: true },
            price: { value: r.price ?? "", confidence: r.confidence, editable: true },
            marketValue: { value: r.marketValue ?? "", confidence: r.confidence, editable: true },
            cost: { value: r.cost ?? "", confidence: r.confidence, editable: true },
            holdingReturn: { value: r.holdingReturn ?? "", confidence: r.confidence, editable: true },
            holdingReturnRate: { value: "", confidence: r.confidence, editable: true },
            cashBalance: { value: "", confidence: r.confidence, editable: true },
            dataDate: { value: new Date().toISOString().slice(0, 10), confidence: r.confidence, editable: true },
            note: { value: r.note ?? "", confidence: 100, editable: true },
          },
          status: r.status as any,
          issues: r.validationIssues ? (Array.isArray(r.validationIssues) ? r.validationIssues.map((i: any) => i.message ?? JSON.stringify(i)) : []) : [],
          userAction: r.action === "IGNORE" ? "ignore" : "save",
        })),
      }));
    } catch (err) {
      console.warn("[Import] API flow failed, falling back to mock", err);
      setRecogStatus("error");
      setUseApi(false);
    }
  }, []);

  const handleUploadClick = useCallback(() => {
    if (useApi) {
      fileInputRef.current?.click();
    } else {
      handleSelectExample(mockImportExamples[0].id);
    }
  }, [useApi, handleSelectExample]);

  // ---- Shared logic ----
  const validationIssues = useMemo(() => {
    if (session.status !== "review" && session.status !== "summary") return [];
    return validateRecognizedRows(session.rows);
  }, [session.rows, session.status]);

  const handleUpdateRow = useCallback((rowId: string, fields: Partial<RecognizedAssetRow["fields"]>) => {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.id === rowId ? { ...r, fields: { ...r.fields, ...fields } } : r
      ),
    }));
    // API sync
    if (apiSessionId && useApi) {
      const row = session.rows.find((r) => r.id === rowId);
      if (row) {
        const updatedFields = { ...row.fields, ...fields };
        api.updateImportRow(apiSessionId, rowId, {
          assetName: updatedFields.assetName.value,
          assetType: updatedFields.assetType.value,
          quantity: updatedFields.quantity.value,
          price: updatedFields.price.value,
          marketValue: updatedFields.marketValue.value,
          cost: updatedFields.cost.value,
          holdingReturn: updatedFields.holdingReturn.value,
        }).catch(() => {});
      }
    }
  }, [apiSessionId, session.rows, useApi]);

  const handleToggleAction = useCallback((rowId: string, action: "save" | "ignore") => {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.id === rowId ? { ...r, userAction: action } : r
      ),
    }));
    if (apiSessionId && useApi) {
      api.updateImportRow(apiSessionId, rowId, {
        action: action === "ignore" ? "IGNORE" : "SAVE",
        status: action === "ignore" ? "IGNORED" : "CONFIRMED",
      }).catch(() => {});
    }
  }, [apiSessionId, useApi]);

  const handleAddRow = useCallback(() => {
    const newRow: RecognizedAssetRow = {
      id: `rec-manual-${Date.now()}`,
      source: session.source || "alipay",
      fields: {
        member: { value: "", confidence: 100, editable: true },
        account: { value: "", confidence: 100, editable: true },
        assetName: { value: "", confidence: 100, editable: true },
        assetCode: { value: "", confidence: 100, editable: true },
        assetType: { value: "", confidence: 100, editable: true },
        currency: { value: "CNY", confidence: 100, editable: true },
        quantity: { value: "", confidence: 100, editable: true },
        price: { value: "", confidence: 100, editable: true },
        marketValue: { value: "", confidence: 100, editable: true },
        cost: { value: "", confidence: 100, editable: true },
        holdingReturn: { value: "", confidence: 100, editable: true },
        holdingReturnRate: { value: "", confidence: 100, editable: true },
        cashBalance: { value: "", confidence: 100, editable: true },
        dataDate: { value: new Date().toISOString().slice(0, 10), confidence: 100, editable: true },
        note: { value: "", confidence: 100, editable: true },
      },
      status: "missing_field",
      issues: ["手动添加，请填写必填字段"],
      userAction: "save",
    };
    setSession((s) => ({ ...s, rows: [...s.rows, newRow] }));
    if (apiSessionId && useApi) {
      api.addImportRow(apiSessionId, {
        assetName: "", assetType: "OTHER", action: "MANUAL",
      }).then((resp) => {
        setSession((s) => ({
          ...s,
          rows: s.rows.map((r) => (r.id === newRow.id ? { ...r, id: resp.id } : r)),
        }));
      }).catch(() => {});
    }
  }, [session.source, apiSessionId, useApi]);

  const handleSaveModeChange = useCallback((mode: ImportSaveMode) => {
    setSession((s) => ({ ...s, saveMode: mode }));
  }, []);

  const handleGoToSummary = useCallback(() => {
    setSession((s) => ({ ...s, status: "summary" }));
  }, []);

  const handleBackToReview = useCallback(() => {
    setSession((s) => ({ ...s, status: "review" }));
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (apiSessionId && useApi) {
      setSession((s) => ({ ...s, status: "saving" }));
      try {
        const result = await api.confirmImport(apiSessionId, {
          saveMode: session.saveMode === "holding_snapshot" ? "HOLDING_SNAPSHOT" : "TRANSACTION_RECORD",
        });
        const rows = session.rows;
        const members = [...new Set(rows.filter((r) => r.fields.member.value).map((r) => r.fields.member.value))];
        const accounts = [...new Set(rows.filter((r) => r.fields.account.value).map((r) => r.fields.account.value))];
        const assetTypes = [...new Set(rows.filter((r) => r.fields.assetType.value).map((r) => r.fields.assetType.value))];
        setSession((s) => ({
          ...s,
          status: "done" as const,
          result: {
            savedCount: result.savedCount,
            ignoredCount: result.ignoreCount,
            issueCount: rows.length - result.savedCount - result.ignoreCount,
            members, accounts, assetTypes,
          },
        }));
      } catch (err) {
        setSession((s) => ({ ...s, status: "review" }));
        console.error("[Import] Save failed", err);
      }
    } else {
      // Mock save
      setSession((s) => ({ ...s, status: "saving" }));
      setTimeout(() => {
        setSession((s) => {
          const savedCount = s.rows.filter((r) => r.userAction === "save").length;
          const ignoredCount = s.rows.filter((r) => r.userAction === "ignore").length;
          const members = [...new Set(s.rows.filter((r) => r.fields.member.value).map((r) => r.fields.member.value))];
          const accounts = [...new Set(s.rows.filter((r) => r.fields.account.value).map((r) => r.fields.account.value))];
          const assetTypes = [...new Set(s.rows.filter((r) => r.fields.assetType.value).map((r) => r.fields.assetType.value))];
          return {
            ...s,
            status: "done" as const,
            result: { savedCount, ignoredCount, issueCount: validationIssues.length, members, accounts, assetTypes },
          };
        });
      }, 1200);
    }
  }, [apiSessionId, useApi, session.saveMode, session.rows, validationIssues]);

  const handleGoHome = useCallback(() => router.push("/"), [router]);
  const handleContinue = useCallback(() => {
    setSession({
      id: "", source: null, screenshotUrl: null, status: "selecting",
      rows: [], validationIssues: [], saveMode: "holding_snapshot",
    });
    setRecogStatus("idle");
    setApiSessionId(null);
    setUploadedFile(null);
  }, []);

  const summary = useMemo(() => {
    if (session.status !== "summary") return null;
    return calculateImportSummary(session.rows, session.saveMode);
  }, [session.rows, session.saveMode, session.status]);

  useEffect(() => {
    if (session.status === "review") {
      setSession((s) => ({ ...s, validationIssues }));
    }
  }, [validationIssues]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveIssues = session.status === "summary" || session.status === "review"
    ? validationIssues : [];
  const hasErrors = effectiveIssues.some((i) => i.type === "error");

  const isSelecting = session.status === "selecting" || session.status === "recognizing" || session.status === "uploaded";
  const isReview = session.status === "review";
  const isSummary = session.status === "summary";
  const isDone = session.status === "done";
  const isRecognizing = session.status === "recognizing";
  const isUploading = recogStatus === "uploading";

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="导入持仓截图" subtitle="上传或选择示例截图，系统将自动识别持仓信息" />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect} className="hidden" />

      {!useApi && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          当前使用 mock OCR fallback。设置 NEXT_PUBLIC_USE_API=true 启用真实上传。
        </div>
      )}

      {isDone && session.result ? (
        <ImportSuccessState result={session.result} onGoHome={handleGoHome} onContinue={handleContinue} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            {isSelecting && (
              <ImportUploadPanel
                examples={mockImportExamples}
                onSelectExample={handleSelectExample}
                onUploadClick={handleUploadClick}
                selectedId={session.screenshotUrl || undefined}
                recognizing={isRecognizing || isUploading}
              />
            )}

            {session.source && (
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

            <RecognitionProgress status={recogStatus} />
          </div>

          <div className="lg:col-span-3 space-y-4">
            {isReview && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">识别结果 ({session.rows.length} 行)</p>
                  <div className="flex items-center gap-2">
                    <ImportSaveModeSelector mode={session.saveMode} onChange={handleSaveModeChange} />
                  </div>
                </div>
                <ImportValidationPanel issues={effectiveIssues} />
                <RecognitionResultTable
                  rows={session.rows}
                  onUpdateRow={handleUpdateRow}
                  onToggleAction={handleToggleAction}
                  onAddRow={handleAddRow}
                />
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGoToSummary}
                    disabled={hasErrors}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={hasErrors ? "请先修复错误" : undefined}
                  >
                    {hasErrors ? "存在错误，请修复" : "查看保存摘要"}
                  </button>
                </div>
              </>
            )}

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
