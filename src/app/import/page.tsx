"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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

export default function ImportPage() {
  const router = useRouter();
  const [session, setSession] = useState<ImportSession>({
    id: "session-1",
    source: null,
    screenshotUrl: null,
    status: "selecting",
    rows: [],
    validationIssues: [],
    saveMode: "holding_snapshot",
  });
  const [recogStatus, setRecogStatus] = useState<"idle" | "recognizing" | "done" | "error">("idle");

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

    // Simulate OCR with delay
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

  const handleUploadClick = useCallback(() => {
    // Mock: simulate upload with first example
    handleSelectExample(mockImportExamples[0].id);
  }, [handleSelectExample]);

  // Re-run validation when rows change
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
  }, []);

  const handleToggleAction = useCallback((rowId: string, action: "save" | "ignore") => {
    setSession((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.id === rowId ? { ...r, userAction: action } : r
      ),
    }));
  }, []);

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
        dataDate: { value: "2026-04-28", confidence: 100, editable: true },
        note: { value: "", confidence: 100, editable: true },
      },
      status: "missing_field",
      issues: ["手动添加，请填写必填字段"],
      userAction: "save",
    };
    setSession((s) => ({ ...s, rows: [...s.rows, newRow] }));
  }, [session.source]);

  const handleSaveModeChange = useCallback((mode: ImportSaveMode) => {
    setSession((s) => ({ ...s, saveMode: mode }));
  }, []);

  const handleGoToSummary = useCallback(() => {
    setSession((s) => ({ ...s, status: "summary" }));
  }, []);

  const handleBackToReview = useCallback(() => {
    setSession((s) => ({ ...s, status: "review" }));
  }, []);

  const handleConfirmSave = useCallback(() => {
    setSession((s) => ({ ...s, status: "saving" }));
    // Simulate save
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
  }, [validationIssues]);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleContinue = useCallback(() => {
    setSession({
      id: "session-1",
      source: null,
      screenshotUrl: null,
      status: "selecting",
      rows: [],
      validationIssues: [],
      saveMode: "holding_snapshot",
    });
    setRecogStatus("idle");
  }, []);

  const summary = useMemo(() => {
    if (session.status !== "summary") return null;
    return calculateImportSummary(session.rows, session.saveMode);
  }, [session.rows, session.saveMode, session.status]);

  // When status changes to review, update validation
  useEffect(() => {
    if (session.status === "review") {
      setSession((s) => ({ ...s, validationIssues }));
    }
  }, [validationIssues]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveIssues = session.status === "summary" || session.status === "review"
    ? validationIssues
    : [];

  const hasErrors = effectiveIssues.some((i) => i.type === "error");

  const isSelecting = session.status === "selecting" || session.status === "recognizing";
  const isReview = session.status === "review";
  const isSummary = session.status === "summary";
  const isDone = session.status === "done";
  const isRecognizing = session.status === "recognizing";

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="导入持仓截图" subtitle="上传或选择示例截图，系统将自动识别持仓信息" />

      {isDone && session.result ? (
        <ImportSuccessState
          result={session.result}
          onGoHome={handleGoHome}
          onContinue={handleContinue}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left panel */}
          <div className="lg:col-span-2 space-y-4">
            {isSelecting && (
              <ImportUploadPanel
                examples={mockImportExamples}
                onSelectExample={handleSelectExample}
                onUploadClick={handleUploadClick}
                selectedId={session.screenshotUrl || undefined}
                recognizing={isRecognizing}
              />
            )}

            {session.source && (
              <ScreenshotPreview
                source={session.source}
                label={
                  session.screenshotUrl
                    ? mockImportExamples.find((e) => e.id === session.screenshotUrl)?.screenshotLabel || "截图预览"
                    : "截图预览"
                }
                status={recogStatus === "done" ? "done" : recogStatus === "recognizing" ? "recognizing" : "preview"}
              />
            )}

            <RecognitionProgress status={recogStatus} />
          </div>

          {/* Right panel */}
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
