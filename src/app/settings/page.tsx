"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  SettingsSection, SettingsToggleRow, SettingsSelectRow,
  SettingsInputRow, TagSelector, RiskPreferenceSelector, SaveButton,
} from "@/components/settings/SettingsComponents";
import {
  mockDataSourceSettings, mockScheduledJobs, mockAppearanceSettings,
  mockWeChatPushSettings, mockReturnMethodSettings,
} from "@/data/mock-settings";
import type { InvestorPhilosophySettings, WeChatPushSettings, AppearanceSettings, ReturnMethodSettings } from "@/types/settings";
import { User, Shield, Building2, PieChart, Lightbulb, Bell, Database, Clock, Calculator, Palette, Play, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, USE_API_DATA } from "@/lib/api/api-client";

const SECTIONS = [
  { id: "household", label: "家庭设置", icon: User },
  { id: "members", label: "成员管理", icon: Shield },
  { id: "accounts", label: "账户管理", icon: Building2 },
  { id: "assetTypes", label: "资产类型", icon: PieChart },
  { id: "philosophy", label: "投资理念", icon: Lightbulb },
  { id: "wechat", label: "微信推送", icon: Bell },
  { id: "datasource", label: "数据源", icon: Database },
  { id: "jobs", label: "定时任务", icon: Clock },
  { id: "returnMethod", label: "收益口径", icon: Calculator },
  { id: "appearance", label: "外观", icon: Palette },
] as const;

// ── Types ──

interface HouseholdFormState {
  name: string;
  baseCurrency: string;
  permissionMode: string;
  totalAssetsDisplay: string;
}

interface MemberItem {
  id: string;
  name: string;
  displayName: string | null;
  roleLabel: string | null;
  isAdmin: boolean;
  isActive: boolean;
}

interface AccountItem {
  id: string;
  memberId: string;
  memberName: string;
  name: string;
  type: string;
  platform: string | null;
  currency: string;
  includeInTotal: boolean;
  isActive: boolean;
}

interface AssetTypeDisplayItem {
  type: string;
  label: string;
  enabled: boolean;
  color: string;
  riskLevel: string;
  dailyUpdate: boolean;
}

interface PhilosophyState {
  memberId: string;
  riskPreference: string;
  investmentHorizon: string;
  mainGoal: string;
  maxSingleAssetRatio: number;
  maxSingleIndustryRatio: number;
  minCashReserveMonths: number;
  preferredAssets: string[];
  avoidBehaviors: string[];
  tradingFrequency: string;
  drawdownTolerance: string;
  aiAdviceStyle: string;
  customText: string;
}

// ── Helpers ──

const defaultAssetTypes: AssetTypeDisplayItem[] = [
  { type: "cash", label: "现金", enabled: true, color: "#6b7280", riskLevel: "低", dailyUpdate: false },
  { type: "aShare", label: "A股", enabled: true, color: "#b91c1c", riskLevel: "高", dailyUpdate: true },
  { type: "usStock", label: "美股", enabled: true, color: "#2563eb", riskLevel: "高", dailyUpdate: true },
  { type: "etf", label: "场内基金", enabled: true, color: "#4f46e5", riskLevel: "中", dailyUpdate: true },
  { type: "mutualFund", label: "场外基金", enabled: true, color: "#7c3aed", riskLevel: "中", dailyUpdate: false },
  { type: "bankWealth", label: "银行理财", enabled: true, color: "#0891b2", riskLevel: "低", dailyUpdate: false },
  { type: "gold", label: "黄金积存金", enabled: true, color: "#d97706", riskLevel: "中", dailyUpdate: true },
];

const defaultPhilosophy: PhilosophyState = {
  memberId: "", riskPreference: "平衡", investmentHorizon: "中长期",
  mainGoal: "稳健增值", maxSingleAssetRatio: 30, maxSingleIndustryRatio: 40,
  minCashReserveMonths: 3, preferredAssets: [], avoidBehaviors: [],
  tradingFrequency: "低频", drawdownTolerance: "15%", aiAdviceStyle: "平衡", customText: "",
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("household");
  const [philosophyMember, setPhilosophyMember] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Household ──
  const [household, setHousehold] = useState<HouseholdFormState>({
    name: "", baseCurrency: "CNY", permissionMode: "ALL_VISIBLE", totalAssetsDisplay: "show",
  });

  // ── Members ──
  const [apiMembers, setApiMembers] = useState<MemberItem[]>([]);

  // ── Accounts ──
  const [apiAccounts, setApiAccounts] = useState<AccountItem[]>([]);

  // ── Asset Types ──
  const [assetTypes, setAssetTypes] = useState<AssetTypeDisplayItem[]>(defaultAssetTypes);

  // ── Philosophy (keyed by memberId, loaded per active member) ──
  const [philosophies, setPhilosophies] = useState<Record<string, PhilosophyState>>({});
  const [philosophySaving, setPhilosophySaving] = useState(false);

  // ── Push Settings ──
  const [pushSettings, setPushSettings] = useState<WeChatPushSettings>(mockWeChatPushSettings);

  // ── Return Method ──
  const [returnMethod, setReturnMethod] = useState<ReturnMethodSettings>(mockReturnMethodSettings);

  // ── Appearance ──
  const [appearance, setAppearance] = useState<AppearanceSettings>(mockAppearanceSettings);

  // ── Jobs & Datasource (existing) ──
  const [apiJobs, setApiJobs] = useState<Array<{
    id: string; name: string; displayName: string; description: string | null;
    cronExpression: string | null; timezone: string; isEnabled: boolean;
    lastRunAt: string | null; lastStatus: string | null; config: unknown;
  }> | null>(null);
  const [apiJobRuns, setApiJobRuns] = useState<Array<{
    id: string; jobName: string; status: string;
    startedAt: string; finishedAt: string | null; durationMs: number | null;
    triggeredBy: string; successCount: number; failureCount: number; skippedCount: number;
    errorMessage: string | null;
  }> | null>(null);
  const [apiSources, setApiSources] = useState<Array<{
    id: string; name: string; displayName: string; type: string;
    isEnabled: boolean; priority: number; lastStatus: string;
    lastCheckedAt: string | null;
  }> | null>(null);
  const [runningJob, setRunningJob] = useState(false);
  const [checkingSources, setCheckingSources] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // ── Data Loading ──

  useEffect(() => {
    async function loadAll() {
      if (!USE_API_DATA) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch settings (includes household, push, return method, appearance, assetTypeConfig)
        const settingsData = await api.settings();
        if (settingsData.household) {
          setHousehold({
            name: settingsData.household.name,
            baseCurrency: settingsData.household.baseCurrency,
            permissionMode: settingsData.household.permissionMode,
            totalAssetsDisplay: settingsData.householdDisplay?.totalAssetsDisplay || "show",
          });
        }
        if (settingsData.pushSettings) {
          const ps = settingsData.pushSettings as Record<string, unknown>;
          setPushSettings({
            enabled: (ps.enabled as boolean) || false,
            pushTime: (ps.pushTime as string) || "07:30",
            channel: (ps.channel as WeChatPushSettings["channel"]) || "disabled",
            webhookUrl: "",
            serverChanKey: "",
            includeTotalAssets: (ps.includeTotalAssets as boolean) || false,
            includeMemberDetail: (ps.includeMemberDetail as boolean) || false,
            includeAIAdvice: (ps.includeAIAdvice as boolean) || false,
            onlyHighRisk: (ps.onlyHighRisk as boolean) || false,
          });
        }
        if (settingsData.returnMethod) {
          const rm = settingsData.returnMethod as Record<string, unknown>;
          setReturnMethod({
            costMethod: (rm.costMethod as string) || "平均成本法",
            holdingReturnDef: (rm.holdingReturnDef as string) || "",
            realizedReturnDef: (rm.realizedReturnDef as string) || "",
            cumulativeReturnDef: (rm.cumulativeReturnDef as string) || "",
            periodReturnDef: (rm.periodReturnDef as string) || "",
            cashFlowHandling: (rm.cashFlowHandling as string) || "",
            futureOptions: Array.isArray(rm.futureOptions) ? rm.futureOptions as string[] : [],
          });
        }
        if (settingsData.appearance) {
          const ap = settingsData.appearance as Record<string, unknown>;
          setAppearance({
            theme: (ap.theme as AppearanceSettings["theme"]) || "system",
            returnColorScheme: (ap.returnColorScheme as AppearanceSettings["returnColorScheme"]) || "cn_red_up",
            defaultTimeRange: (ap.defaultTimeRange as string) || "近30日",
            defaultCurrency: (ap.defaultCurrency as string) || "CNY",
            decimalPlaces: (ap.decimalPlaces as number) || 2,
            privacyMode: (ap.privacyMode as boolean) || false,
          });
        }
        if (settingsData.assetTypeConfig && Array.isArray(settingsData.assetTypeConfig)) {
          const atc = settingsData.assetTypeConfig as Array<Record<string, unknown>>;
          setAssetTypes(atc.map((a, i) => ({
            type: (a.type as string) || defaultAssetTypes[i]?.type || `type-${i}`,
            label: (a.label as string) || defaultAssetTypes[i]?.label || "",
            enabled: (a.enabled as boolean) ?? true,
            color: (a.color as string) || defaultAssetTypes[i]?.color || "#6b7280",
            riskLevel: (a.riskLevel as string) || defaultAssetTypes[i]?.riskLevel || "中",
            dailyUpdate: (a.dailyUpdate as boolean) ?? false,
          })));
        }

        // Fetch members
        const membersData = await api.members();
        const memberItems: MemberItem[] = membersData.map((m) => ({
          id: m.id,
          name: m.name,
          displayName: null,
          roleLabel: m.roleLabel || null,
          isAdmin: m.isAdmin,
          isActive: (m as Record<string, unknown>).isActive as boolean ?? true,
        }));
        setApiMembers(memberItems);

        // Set first philosophy member
        if (memberItems.length > 0 && !philosophyMember) {
          setPhilosophyMember(memberItems[0].id);
        }

        // Fetch accounts
        try {
          const accountsData = await api.accounts();
          setApiAccounts(accountsData);
        } catch {
          // accounts API might not be available; fallback
        }

        // Load jobs and sources
        fetchJobsData();
        fetchSourcesData();
      } catch {
        // API fallback — keep default mock values
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Philosophy loading (when member changes) ──

  useEffect(() => {
    if (!USE_API_DATA || !philosophyMember) return;
    if (philosophies[philosophyMember]) return; // already loaded

    async function loadProfile() {
      try {
        const profile = await api.memberProfile(philosophyMember);
        if (profile) {
          setPhilosophies((prev) => ({
            ...prev,
            [philosophyMember]: {
              memberId: profile.memberId,
              riskPreference: profile.riskPreference,
              investmentHorizon: profile.investmentHorizon,
              mainGoal: profile.primaryGoal,
              maxSingleAssetRatio: profile.maxSingleAssetWeight,
              maxSingleIndustryRatio: profile.maxIndustryWeight,
              minCashReserveMonths: profile.minCashReserveMonths,
              preferredAssets: profile.preferredAssets,
              avoidBehaviors: profile.avoidedAssetsOrBehaviors,
              tradingFrequency: profile.tradingFrequencyPreference,
              drawdownTolerance: profile.drawdownTolerance,
              aiAdviceStyle: profile.adviceStyle,
              customText: profile.customPhilosophyText,
            },
          }));
        } else {
          // No profile yet, set defaults
          setPhilosophies((prev) => ({
            ...prev,
            [philosophyMember]: { ...defaultPhilosophy, memberId: philosophyMember },
          }));
        }
      } catch {
        // fallback to default
        setPhilosophies((prev) => ({
          ...prev,
          [philosophyMember]: { ...defaultPhilosophy, memberId: philosophyMember },
        }));
      }
    }
    loadProfile();
  }, [philosophyMember, philosophies, USE_API_DATA]);

  // ── Jobs & Sources fetch (reused) ──

  const fetchJobsData = useCallback(async () => {
    if (!USE_API_DATA) return;
    try {
      const [jobs, runs] = await Promise.all([api.jobs(), api.jobsRuns(10)]);
      setApiJobs(jobs);
      setApiJobRuns(runs);
    } catch {
      // API 不可用时保留 mock
    }
  }, []);

  const fetchSourcesData = useCallback(async () => {
    if (!USE_API_DATA) return;
    try {
      const sources = await api.marketDataSources();
      setApiSources(sources);
    } catch {
      // API 不可用时保留 mock
    }
  }, []);

  // ── Action Handlers ──

  const handleRunDailyValuation = async () => {
    if (!USE_API_DATA) {
      setActionMsg("请设置 NEXT_PUBLIC_USE_API=true 后使用");
      return;
    }
    setRunningJob(true);
    setActionMsg("");
    try {
      const result = await api.runJob("run-daily-valuation");
      setActionMsg(`执行完成: ${result.status} (成功 ${result.successCount}, 失败 ${result.failureCount})`);
      fetchJobsData();
    } catch (err) {
      setActionMsg(`执行失败: ${(err as Error).message}`);
    } finally {
      setRunningJob(false);
    }
  };

  const handleCheckSources = async () => {
    if (!USE_API_DATA) {
      setActionMsg("请设置 NEXT_PUBLIC_USE_API=true 后使用");
      return;
    }
    setCheckingSources(true);
    setActionMsg("");
    try {
      await api.checkMarketDataSources();
      setActionMsg("数据源检查完成");
      fetchSourcesData();
    } catch (err) {
      setActionMsg(`检查失败: ${(err as Error).message}`);
    } finally {
      setCheckingSources(false);
    }
  };

  // ── Save Handlers ──

  const handleSaveHousehold = async () => {
    if (!USE_API_DATA) return;
    try {
      await api.updateHousehold({
        name: household.name,
        baseCurrency: household.baseCurrency,
        permissionMode: household.permissionMode,
        totalAssetsDisplay: household.totalAssetsDisplay,
      });
    } catch (err) {
      console.error("保存家庭设置失败", err);
    }
  };

  const handleSaveMember = async (memberId: string, data: Record<string, unknown>) => {
    if (!USE_API_DATA) return;
    try {
      await api.updateMember(memberId, data);
      // Refresh members list
      const membersData = await api.members();
      setApiMembers(membersData.map((m) => ({
        id: m.id,
        name: m.name,
        displayName: null,
        roleLabel: m.roleLabel || null,
        isAdmin: m.isAdmin,
        isActive: (m as Record<string, unknown>).isActive as boolean ?? true,
      })));
    } catch (err) {
      console.error("保存成员变更失败", err);
    }
  };

  const handleToggleAccount = async (accountId: string, field: "includeInTotal" | "isActive", value: boolean) => {
    if (!USE_API_DATA) return;
    try {
      await api.updateAccount(accountId, { [field]: value });
      setApiAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, [field]: value } : a))
      );
    } catch (err) {
      console.error("更新账户失败", err);
    }
  };

  const handleSaveAssetTypes = async () => {
    if (!USE_API_DATA) return;
    try {
      await api.updateSettings({
        appearance: {
          ...appearance,
          assetTypeConfig: assetTypes,
          totalAssetsDisplay: household.totalAssetsDisplay,
        },
      });
    } catch (err) {
      console.error("保存资产类型配置失败", err);
    }
  };

  const handleSavePhilosophy = async () => {
    if (!USE_API_DATA || !philosophyMember) return;
    setPhilosophySaving(true);
    try {
      const p = philosophies[philosophyMember] || defaultPhilosophy;
      await api.updateMemberProfile(philosophyMember, {
        riskPreference: p.riskPreference,
        investmentHorizon: p.investmentHorizon,
        primaryGoal: p.mainGoal,
        maxSingleAssetWeight: p.maxSingleAssetRatio,
        maxIndustryWeight: p.maxSingleIndustryRatio,
        minCashReserveMonths: p.minCashReserveMonths,
        preferredAssets: p.preferredAssets,
        avoidedAssetsOrBehaviors: p.avoidBehaviors,
        tradingFrequencyPreference: p.tradingFrequency,
        drawdownTolerance: p.drawdownTolerance,
        adviceStyle: p.aiAdviceStyle,
        customPhilosophyText: p.customText,
      });
    } catch (err) {
      console.error("保存投资理念失败", err);
    } finally {
      setPhilosophySaving(false);
    }
  };

  const handleSavePushSettings = async () => {
    if (!USE_API_DATA) return;
    try {
      await api.updateSettings({
        pushSettings: {
          enabled: pushSettings.enabled,
          pushTime: pushSettings.pushTime,
          channel: pushSettings.channel,
          includeTotalAssets: pushSettings.includeTotalAssets,
          includeMemberDetail: pushSettings.includeMemberDetail,
          includeAIAdvice: pushSettings.includeAIAdvice,
          onlyHighRisk: pushSettings.onlyHighRisk,
        },
      });
    } catch (err) {
      console.error("保存推送设置失败", err);
    }
  };

  const handleSaveAppearance = async () => {
    if (!USE_API_DATA) return;
    try {
      await api.updateSettings({
        appearance: {
          ...appearance,
          assetTypeConfig: assetTypes,
          totalAssetsDisplay: household.totalAssetsDisplay,
        },
      });
    } catch (err) {
      console.error("保存外观设置失败", err);
    }
  };

  // ── Derived ──

  const currentPhilosophy = philosophyMember
    ? philosophies[philosophyMember] || { ...defaultPhilosophy, memberId: philosophyMember }
    : defaultPhilosophy;

  const ActiveIcon = SECTIONS.find((s) => s.id === activeSection)?.icon || User;

  const jobStatusCn: Record<string, string> = {
    SUCCESS: "成功", FAILED: "失败", PARTIAL: "部分成功", RUNNING: "运行中", SKIPPED: "已跳过",
  };
  const sourceStatusCn: Record<string, string> = {
    HEALTHY: "正常", DEGRADED: "降级", FAILED: "异常", DISABLED: "已禁用",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="设置" subtitle="家庭配置、成员权限、投资理念和数据源" />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* ── Household ── */}
          {activeSection === "household" && (
            <SettingsSection title="家庭设置" description="家庭基本信息和权限模式">
              <SettingsInputRow label="家庭名称" value={household.name} onChange={(v) => setHousehold((p) => ({ ...p, name: v }))} />
              <SettingsSelectRow label="默认币种" value={household.baseCurrency}
                options={[{ value: "CNY", label: "人民币 (CNY)" }, { value: "USD", label: "美元 (USD)" }]}
                onChange={(v) => setHousehold((p) => ({ ...p, baseCurrency: v }))} />
              <SettingsSelectRow label="权限模式" value={household.permissionMode}
                options={[{ value: "ALL_VISIBLE", label: "全部可见" }, { value: "CUSTOM", label: "自定义权限" }]}
                onChange={(v) => setHousehold((p) => ({ ...p, permissionMode: v }))} />
              <SettingsToggleRow label="显示家庭总资产" checked={household.totalAssetsDisplay === "show"}
                onChange={(v) => setHousehold((p) => ({ ...p, totalAssetsDisplay: v ? "show" : "hide" }))} />
              <div className="flex justify-end pt-2"><SaveButton onClick={handleSaveHousehold} /></div>
            </SettingsSection>
          )}

          {/* ── Members ── */}
          {activeSection === "members" && (
            <SettingsSection title="成员管理" description="管理家庭成员及其权限">
              {(apiMembers.length > 0 ? apiMembers : []).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.displayName || m.name}</p>
                      {m.isAdmin && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">管理员</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.roleLabel || "成员"}
                      {!USE_API_DATA && " · (mock数据)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSaveMember(m.id, { isActive: !m.isActive })}
                      className={cn("w-2 h-2 rounded-full", m.isActive ? "bg-positive" : "bg-neutral")}
                      title={m.isActive ? "点击停用" : "点击启用"}
                    />
                    <span className="text-xs text-muted-foreground">{m.isActive ? "启用" : "停用"}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors" disabled>
                + 新增成员
              </button>
            </SettingsSection>
          )}

          {/* ── Accounts ── */}
          {activeSection === "accounts" && (
            <SettingsSection title="账户管理" description="管理各成员名下的资产账户">
              {(apiAccounts.length > 0 ? apiAccounts : []).map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {acc.memberName} · {acc.platform || acc.type} · {acc.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{acc.currency}</span>
                    <SettingsToggleRow label="" checked={acc.isActive}
                      onChange={(v) => handleToggleAccount(acc.id, "isActive", v)} />
                  </div>
                </div>
              ))}
            </SettingsSection>
          )}

          {/* ── Asset Types ── */}
          {activeSection === "assetTypes" && (
            <SettingsSection title="资产类型设置" description="管理可配置的资产类别">
              <div className="grid gap-3 sm:grid-cols-2">
                {assetTypes.map((at, i) => (
                  <div key={at.type} className="p-3.5 rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: at.color }} />
                        <span className="text-sm font-medium">{at.label}</span>
                      </div>
                      <SettingsToggleRow label="" checked={at.enabled}
                        onChange={(v) => setAssetTypes((prev) =>
                          prev.map((a, idx) => idx === i ? { ...a, enabled: v } : a)
                        )} />
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">风险 {at.riskLevel}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{at.dailyUpdate ? "每日更新" : "手动更新"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2"><SaveButton onClick={handleSaveAssetTypes} /></div>
            </SettingsSection>
          )}

          {/* ── Philosophy ── */}
          {activeSection === "philosophy" && (
            <SettingsSection title="个人投资理念" description="每个成员可独立配置投资理念，AI 建议将据此生成">
              {/* Member tabs */}
              {apiMembers.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {apiMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPhilosophyMember(m.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                        philosophyMember === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {m.displayName || m.name}
                    </button>
                  ))}
                </div>
              )}

              <PhilosophyForm
                philosophy={currentPhilosophy}
                saving={philosophySaving}
                onChange={(updated) =>
                  setPhilosophies((prev) => ({
                    ...prev,
                    [philosophyMember]: updated,
                  }))
                }
                onSave={handleSavePhilosophy}
              />
            </SettingsSection>
          )}

          {/* ── WeChat Push ── */}
          {activeSection === "wechat" && (
            <SettingsSection title="微信推送设置" description="配置每日简报推送方式和内容范围">
              <SettingsToggleRow label="启用每日推送" description="每天早上自动推送投资简报"
                checked={pushSettings.enabled}
                onChange={(v) => setPushSettings((p) => ({ ...p, enabled: v }))} />
              <SettingsInputRow label="推送时间" value={pushSettings.pushTime}
                onChange={(v) => setPushSettings((p) => ({ ...p, pushTime: v }))} type="time" />
              <SettingsSelectRow label="推送渠道" value={pushSettings.channel}
                options={[
                  { value: "wecom_robot", label: "企业微信群机器人" },
                  { value: "server_chan", label: "Server 酱" },
                  { value: "disabled", label: "暂不启用" },
                ]}
                onChange={(v) => setPushSettings((p) => ({ ...p, channel: v as WeChatPushSettings["channel"] }))} />
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground">
                  Webhook URL 和 Server 酱 SendKey 通过环境变量配置，不在此处显示。
                  {pushSettings.channel === "wecom_robot" && " 请设置环境变量 WECOM_BOT_WEBHOOK_URL。"}
                  {pushSettings.channel === "server_chan" && " 请设置环境变量 SERVER_CHAN_SENDKEY。"}
                </p>
              </div>
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">推送内容范围</p>
                <SettingsToggleRow label="包含家庭总资产" checked={pushSettings.includeTotalAssets}
                  onChange={(v) => setPushSettings((p) => ({ ...p, includeTotalAssets: v }))} />
                <SettingsToggleRow label="包含成员明细" checked={pushSettings.includeMemberDetail}
                  onChange={(v) => setPushSettings((p) => ({ ...p, includeMemberDetail: v }))} />
                <SettingsToggleRow label="包含 AI 建议" checked={pushSettings.includeAIAdvice}
                  onChange={(v) => setPushSettings((p) => ({ ...p, includeAIAdvice: v }))} />
                <SettingsToggleRow label="仅高风险提醒" description="只推送高风险级别的提醒"
                  checked={pushSettings.onlyHighRisk}
                  onChange={(v) => setPushSettings((p) => ({ ...p, onlyHighRisk: v }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors" disabled>
                  测试推送
                </button>
                <SaveButton onClick={handleSavePushSettings} />
              </div>
              <p className="text-xs text-muted-foreground text-right">推送内容可能包含资产信息，请谨慎配置接收渠道。</p>
            </SettingsSection>
          )}

          {/* ── Data Source ── */}
          {activeSection === "datasource" && (
            <SettingsSection title="数据源设置" description="配置各数据源连接状态">
              <div className="grid gap-2">
                {(apiSources ?? mockDataSourceSettings.map(ds => ({
                  id: ds.name, name: ds.name, displayName: ds.name,
                  type: ds.status === "manual" ? "MANUAL" : "OTHER",
                  isEnabled: true, priority: 100,
                  lastStatus: ds.status === "configured" ? "HEALTHY" : ds.status === "error" ? "FAILED" : ds.status === "manual" ? "HEALTHY" : "DISABLED",
                  lastCheckedAt: null,
                }))).map((ds) => (
                  <div key={ds.name} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-medium">{ds.displayName || ds.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ds.type}
                        {ds.lastCheckedAt ? ` · 上次检查: ${new Date(ds.lastCheckedAt).toLocaleString("zh-CN")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        ds.lastStatus === "HEALTHY" ? "bg-green-50 text-green-700 dark:bg-green-950/30" :
                        ds.lastStatus === "DEGRADED" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30" :
                        ds.lastStatus === "FAILED" ? "bg-red-50 text-red-700 dark:bg-red-950/30" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {sourceStatusCn[ds.lastStatus] ?? ds.lastStatus}
                      </span>
                      <span className={cn("w-2 h-2 rounded-full", ds.isEnabled ? "bg-positive" : "bg-neutral")} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={handleCheckSources}
                  disabled={checkingSources}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {checkingSources ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  检查数据源
                </button>
                {actionMsg && <p className="text-xs text-muted-foreground">{actionMsg}</p>}
              </div>
            </SettingsSection>
          )}

          {/* ── Jobs ── */}
          {activeSection === "jobs" && (
            <SettingsSection title="定时任务设置" description="管理后台定时任务">
              <div className="grid gap-2 mb-4">
                {(apiJobs ?? mockScheduledJobs.map(j => ({
                  id: j.name, name: j.name, displayName: j.name,
                  description: null, cronExpression: j.schedule, timezone: "Asia/Shanghai",
                  isEnabled: j.status === "enabled", lastRunAt: null, lastStatus: j.status === "enabled" ? "SUCCESS" : "SKIPPED",
                  config: {},
                }))).map((job) => (
                  <div key={job.name} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{job.displayName}</p>
                        {job.lastStatus && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            job.lastStatus === "SUCCESS" ? "bg-green-50 text-green-700 dark:bg-green-950/30" :
                            job.lastStatus === "FAILED" ? "bg-red-50 text-red-700 dark:bg-red-950/30" :
                            job.lastStatus === "PARTIAL" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30" :
                            job.lastStatus === "RUNNING" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {jobStatusCn[job.lastStatus] ?? job.lastStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.cronExpression ? `Cron: ${job.cronExpression}` : "按需/手动"}
                        {job.lastRunAt ? ` · 上次: ${new Date(job.lastRunAt).toLocaleString("zh-CN")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full", job.isEnabled ? "bg-positive" : "bg-neutral")} />
                      <span className="text-xs text-muted-foreground">{job.isEnabled ? "启用" : "未启用"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent JobRuns */}
              {apiJobRuns && apiJobRuns.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">最近执行记录</p>
                  <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                    {apiJobRuns.slice(0, 10).map((run) => (
                      <div key={run.id} className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/50">
                        <span className={cn(
                          "px-1 py-0.5 rounded text-[10px] font-medium",
                          run.status === "SUCCESS" ? "bg-green-50 text-green-700" :
                          run.status === "FAILED" ? "bg-red-50 text-red-700" :
                          run.status === "PARTIAL" ? "bg-amber-50 text-amber-700" :
                          "bg-blue-50 text-blue-700"
                        )}>{jobStatusCn[run.status] ?? run.status}</span>
                        <span className="font-medium">{run.jobName}</span>
                        <span>{run.triggeredBy}</span>
                        <span>{new Date(run.startedAt).toLocaleString("zh-CN")}</span>
                        <span className="tabular-nums">成功{run.successCount} 失败{run.failureCount} 跳过{run.skippedCount}</span>
                        {run.durationMs != null && <span className="tabular-nums">{run.durationMs}ms</span>}
                        {run.errorMessage && (
                          <span className="text-red-600 truncate max-w-[200px]" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleRunDailyValuation}
                  disabled={runningJob}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {runningJob ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  手动运行每日估值
                </button>
                {actionMsg && <p className="text-xs text-muted-foreground">{actionMsg}</p>}
              </div>
            </SettingsSection>
          )}

          {/* ── Return Method ── */}
          {activeSection === "returnMethod" && (
            <SettingsSection title="收益口径设置" description="与 return-calculation-spec.md 保持一致">
              <div className="space-y-3 text-sm">
                {[
                  { label: "成本算法", value: returnMethod.costMethod },
                  { label: "持仓收益", value: returnMethod.holdingReturnDef },
                  { label: "已实现收益", value: returnMethod.realizedReturnDef },
                  { label: "累计收益", value: returnMethod.cumulativeReturnDef },
                  { label: "区间收益", value: returnMethod.periodReturnDef },
                  { label: "现金流处理", value: returnMethod.cashFlowHandling },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">未来可选算法</p>
                  <div className="flex flex-wrap gap-1.5">
                    {returnMethod.futureOptions.map((opt) => (
                      <span key={opt} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{opt}</span>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* ── Appearance ── */}
          {activeSection === "appearance" && (
            <SettingsSection title="外观和显示设置" description="界面主题和显示偏好">
              <SettingsSelectRow label="主题" value={appearance.theme}
                options={[{ value: "light", label: "浅色" }, { value: "dark", label: "深色" }, { value: "system", label: "跟随系统" }]}
                onChange={(v) => setAppearance((p) => ({ ...p, theme: v as AppearanceSettings["theme"] }))} />
              <SettingsSelectRow label="涨跌色习惯" value={appearance.returnColorScheme}
                options={[{ value: "cn_red_up", label: "红涨绿跌（国内习惯）" }, { value: "global_green_up", label: "绿涨红跌（国际习惯）" }]}
                onChange={(v) => setAppearance((p) => ({ ...p, returnColorScheme: v as AppearanceSettings["returnColorScheme"] }))} />
              <SettingsSelectRow label="默认时间范围" value={appearance.defaultTimeRange}
                options={[{ value: "近7日", label: "近7日" }, { value: "近30日", label: "近30日" }, { value: "今年", label: "今年" }, { value: "全部", label: "全部" }]}
                onChange={(v) => setAppearance((p) => ({ ...p, defaultTimeRange: v }))} />
              <SettingsSelectRow label="默认币种" value={appearance.defaultCurrency}
                options={[{ value: "CNY", label: "人民币" }, { value: "USD", label: "美元" }]}
                onChange={(v) => setAppearance((p) => ({ ...p, defaultCurrency: v }))} />
              <SettingsSelectRow label="金额小数位" value={appearance.decimalPlaces.toString()}
                options={[{ value: "0", label: "0 位" }, { value: "2", label: "2 位" }, { value: "4", label: "4 位" }]}
                onChange={(v) => setAppearance((p) => ({ ...p, decimalPlaces: parseInt(v) }))} />
              <SettingsToggleRow label="隐私模式" description="隐藏金额数值（占位）"
                checked={appearance.privacyMode}
                onChange={(v) => setAppearance((p) => ({ ...p, privacyMode: v }))} />
              <div className="flex justify-end pt-2"><SaveButton onClick={handleSaveAppearance} /></div>
            </SettingsSection>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Philosophy Form ──

function PhilosophyForm({
  philosophy, saving, onChange, onSave,
}: {
  philosophy: PhilosophyState;
  saving: boolean;
  onChange: (p: PhilosophyState) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <RiskPreferenceSelector value={philosophy.riskPreference} onChange={(v) => onChange({ ...philosophy, riskPreference: v })} />
      <SettingsSelectRow label="投资周期" value={philosophy.investmentHorizon}
        options={[
          { value: "短期", label: "短期（1年内）" },
          { value: "中期", label: "中期（1-3年）" },
          { value: "中长期", label: "中长期（3-5年）" },
          { value: "长期", label: "长期（5年以上）" },
          { value: "超长期", label: "超长期（10年以上）" },
        ]}
        onChange={(v) => onChange({ ...philosophy, investmentHorizon: v })} />
      <SettingsSelectRow label="主要目标" value={philosophy.mainGoal}
        options={[
          { value: "保值", label: "保值" },
          { value: "稳健增值", label: "稳健增值" },
          { value: "长期增值", label: "长期增值" },
          { value: "教育金", label: "教育金" },
          { value: "养老", label: "养老" },
          { value: "现金流", label: "现金流" },
        ]}
        onChange={(v) => onChange({ ...philosophy, mainGoal: v })} />
      <SettingsInputRow label="最大单一资产占比" value={`${philosophy.maxSingleAssetRatio}`}
        onChange={(v) => onChange({ ...philosophy, maxSingleAssetRatio: parseInt(v) || 0 })} />
      <SettingsInputRow label="最大单一行业占比" value={`${philosophy.maxSingleIndustryRatio}`}
        onChange={(v) => onChange({ ...philosophy, maxSingleIndustryRatio: parseInt(v) || 0 })} />
      <SettingsInputRow label="最低现金储备月数" value={`${philosophy.minCashReserveMonths}`}
        onChange={(v) => onChange({ ...philosophy, minCashReserveMonths: parseInt(v) || 0 })} />
      <TagSelector label="偏好资产" tags={philosophy.preferredAssets}
        options={["A股核心资产", "优质基金", "理财产品", "银行理财", "黄金", "指数基金", "债券基金", "成长型基金", "科技股", "债券", "现金"]}
        onChange={(tags) => onChange({ ...philosophy, preferredAssets: tags })} />
      <TagSelector label="避免行为" tags={philosophy.avoidBehaviors}
        options={["频繁交易", "追涨杀跌", "杠杆操作", "高风险投机", "单一资产重仓", "不熟悉领域投资", "盲目跟风", "过度集中"]}
        onChange={(tags) => onChange({ ...philosophy, avoidBehaviors: tags })} />
      <SettingsSelectRow label="交易频率" value={philosophy.tradingFrequency}
        options={[
          { value: "极低频", label: "极低频" },
          { value: "低频", label: "低频" },
          { value: "中频", label: "中频" },
          { value: "高频", label: "高频" },
        ]}
        onChange={(v) => onChange({ ...philosophy, tradingFrequency: v })} />
      <SettingsSelectRow label="回撤容忍度" value={philosophy.drawdownTolerance}
        options={[
          { value: "5%", label: "5%" },
          { value: "8%", label: "8%" },
          { value: "10%", label: "10%" },
          { value: "15%", label: "15%" },
          { value: "20%", label: "20%" },
          { value: "30%", label: "30%" },
        ]}
        onChange={(v) => onChange({ ...philosophy, drawdownTolerance: v })} />
      <SettingsSelectRow label="AI 建议风格" value={philosophy.aiAdviceStyle}
        options={[
          { value: "保守", label: "保守" },
          { value: "平衡", label: "平衡" },
          { value: "偏积极", label: "偏积极" },
        ]}
        onChange={(v) => onChange({ ...philosophy, aiAdviceStyle: v })} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium">自定义投资理念</p>
        <textarea
          className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none"
          rows={3}
          value={philosophy.customText}
          onChange={(e) => onChange({ ...philosophy, customText: e.target.value })}
        />
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton onClick={onSave} />
      </div>
    </div>
  );
}
