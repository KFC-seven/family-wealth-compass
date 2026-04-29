"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  SettingsSection, SettingsToggleRow, SettingsSelectRow,
  SettingsInputRow, TagSelector, RiskPreferenceSelector, SaveButton,
} from "@/components/settings/SettingsComponents";
import {
  mockHouseholdSettings, mockMemberPermissions, mockAccountSettings,
  mockAssetTypeSettings, mockInvestorPhilosophies, mockWeChatPushSettings,
  mockDataSourceSettings, mockScheduledJobs, mockReturnMethodSettings,
  mockAppearanceSettings,
} from "@/data/mock-settings";
import type { InvestorPhilosophySettings } from "@/types/settings";
import { User, Shield, Building2, PieChart, Lightbulb, Bell, Database, Clock, Calculator, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("household");
  const [philosophyMember, setPhilosophyMember] = useState("member-1");
  const [pushEnabled, setPushEnabled] = useState(mockWeChatPushSettings.enabled);

  const currentPhilosophy = mockInvestorPhilosophies.find((p) => p.memberId === philosophyMember) || mockInvestorPhilosophies[0];

  const ActiveIcon = SECTIONS.find((s) => s.id === activeSection)?.icon || User;

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
          {activeSection === "household" && (
            <SettingsSection title="家庭设置" description="家庭基本信息和权限模式">
              <SettingsInputRow label="家庭名称" value={mockHouseholdSettings.name} onChange={() => {}} />
              <SettingsSelectRow label="默认币种" value={mockHouseholdSettings.defaultCurrency}
                options={[{ value: "CNY", label: "人民币 (CNY)" }, { value: "USD", label: "美元 (USD)" }]} onChange={() => {}} />
              <SettingsSelectRow label="权限模式" value={mockHouseholdSettings.permissionMode}
                options={[{ value: "all_view", label: "全部可见" }, { value: "custom", label: "自定义权限" }]} onChange={() => {}} />
              <SettingsToggleRow label="显示家庭总资产" checked={mockHouseholdSettings.totalAssetsDisplay === "show"} onChange={() => {}} />
              <div className="flex justify-end pt-2"><SaveButton onClick={() => {}} /></div>
            </SettingsSection>
          )}

          {activeSection === "members" && (
            <SettingsSection title="成员管理" description="管理家庭成员及其权限">
              {mockMemberPermissions.map((m) => (
                <div key={m.memberId} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.name}</p>
                      {m.isAdmin && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">管理员</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.role} · 可查看 {m.canView.join("、")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-2 h-2 rounded-full", m.enabled ? "bg-positive" : "bg-neutral")} />
                    <span className="text-xs text-muted-foreground">{m.enabled ? "启用" : "停用"}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors" disabled>
                + 新增成员
              </button>
            </SettingsSection>
          )}

          {activeSection === "accounts" && (
            <SettingsSection title="账户管理" description="管理各成员名下的资产账户">
              {mockAccountSettings.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.platform} · {acc.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{acc.currency}</span>
                    <span className={cn("w-2 h-2 rounded-full", acc.enabled ? "bg-positive" : "bg-neutral")} />
                    <SettingsToggleRow label="" checked={acc.enabled} onChange={() => {}} />
                  </div>
                </div>
              ))}
            </SettingsSection>
          )}

          {activeSection === "assetTypes" && (
            <SettingsSection title="资产类型设置" description="管理可配置的资产类别">
              <div className="grid gap-3 sm:grid-cols-2">
                {mockAssetTypeSettings.map((at) => (
                  <div key={at.type} className="p-3.5 rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: at.color }} />
                        <span className="text-sm font-medium">{at.label}</span>
                      </div>
                      <SettingsToggleRow label="" checked={at.enabled} onChange={() => {}} />
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">风险 {at.riskLevel}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded">{at.dailyUpdate ? "每日更新" : "手动更新"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {activeSection === "philosophy" && (
            <SettingsSection title="个人投资理念" description="每个成员可独立配置投资理念，AI 建议将据此生成">
              {/* Member tabs */}
              <div className="flex gap-2 mb-2">
                {mockInvestorPhilosophies.map((p) => (
                  <button
                    key={p.memberId}
                    onClick={() => setPhilosophyMember(p.memberId)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      philosophyMember === p.memberId ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {p.memberId === "member-1" ? "爸爸" : p.memberId === "member-2" ? "妈妈" : "孩子"}
                  </button>
                ))}
              </div>

              <PhilosophyForm philosophy={currentPhilosophy} />
            </SettingsSection>
          )}

          {activeSection === "wechat" && (
            <SettingsSection title="微信推送设置" description="配置每日简报推送方式和内容范围">
              <SettingsToggleRow label="启用每日推送" description="每天早上自动推送投资简报" checked={pushEnabled} onChange={setPushEnabled} />
              <SettingsInputRow label="推送时间" value={mockWeChatPushSettings.pushTime} onChange={() => {}} type="time" />
              <SettingsSelectRow label="推送渠道" value={mockWeChatPushSettings.channel}
                options={[
                  { value: "wecom_robot", label: "企业微信群机器人" },
                  { value: "server_chan", label: "Server 酱" },
                  { value: "wechat", label: "微信通道 (暂不可用)" },
                  { value: "disabled", label: "暂不启用" },
                ]} onChange={() => {}} />
              <SettingsInputRow label="Webhook URL" value={mockWeChatPushSettings.webhookUrl} placeholder="https://qyapi.weixin.qq.com/..." onChange={() => {}} />
              <SettingsInputRow label="Server 酱 SendKey" value={mockWeChatPushSettings.serverChanKey} placeholder="请输入 SendKey" onChange={() => {}} />
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">推送内容范围</p>
                <SettingsToggleRow label="包含家庭总资产" checked={mockWeChatPushSettings.includeTotalAssets} onChange={() => {}} />
                <SettingsToggleRow label="包含成员明细" checked={mockWeChatPushSettings.includeMemberDetail} onChange={() => {}} />
                <SettingsToggleRow label="包含 AI 建议" checked={mockWeChatPushSettings.includeAIAdvice} onChange={() => {}} />
                <SettingsToggleRow label="仅高风险提醒" description="只推送高风险级别的提醒" checked={mockWeChatPushSettings.onlyHighRisk} onChange={() => {}} />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors" disabled>测试推送</button>
                <SaveButton onClick={() => {}} />
              </div>
              <p className="text-xs text-muted-foreground text-right">推送内容可能包含资产信息，请谨慎配置接收渠道。</p>
            </SettingsSection>
          )}

          {activeSection === "datasource" && (
            <SettingsSection title="数据源设置" description="配置各数据源连接状态">
              <div className="grid gap-2">
                {mockDataSourceSettings.map((ds) => (
                  <div key={ds.name} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-medium">{ds.name}</p>
                      <p className="text-xs text-muted-foreground">{ds.updateFrequency}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        ds.status === "configured" ? "bg-green-50 text-green-700 dark:bg-green-950/30" :
                        ds.status === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/30" :
                        ds.status === "manual" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {ds.status === "unconfigured" ? "未配置" : ds.status === "configured" ? "已配置" : ds.status === "error" ? "异常" : "手动"}
                      </span>
                      <button className="text-xs text-primary hover:underline" disabled>配置</button>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {activeSection === "jobs" && (
            <SettingsSection title="定时任务设置" description="管理后台定时任务">
              <div className="grid gap-2">
                {mockScheduledJobs.map((job) => (
                  <div key={job.name} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-medium">{job.name}</p>
                      <p className="text-xs text-muted-foreground">{job.schedule}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full", job.status === "enabled" ? "bg-positive" : "bg-neutral")} />
                      <span className="text-xs text-muted-foreground">{job.status === "enabled" ? "启用" : "未启用"}</span>
                      <SettingsToggleRow label="" checked={job.status === "enabled"} onChange={() => {}} />
                    </div>
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {activeSection === "returnMethod" && (
            <SettingsSection title="收益口径设置" description="与 return-calculation-spec.md 保持一致">
              <div className="space-y-3 text-sm">
                {[
                  { label: "成本算法", value: mockReturnMethodSettings.costMethod },
                  { label: "持仓收益", value: mockReturnMethodSettings.holdingReturnDef },
                  { label: "已实现收益", value: mockReturnMethodSettings.realizedReturnDef },
                  { label: "累计收益", value: mockReturnMethodSettings.cumulativeReturnDef },
                  { label: "区间收益", value: mockReturnMethodSettings.periodReturnDef },
                  { label: "现金流处理", value: mockReturnMethodSettings.cashFlowHandling },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">未来可选算法</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mockReturnMethodSettings.futureOptions.map((opt) => (
                      <span key={opt} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{opt}</span>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {activeSection === "appearance" && (
            <SettingsSection title="外观和显示设置" description="界面主题和显示偏好">
              <SettingsSelectRow label="主题" value={mockAppearanceSettings.theme}
                options={[{ value: "light", label: "浅色" }, { value: "dark", label: "深色" }, { value: "system", label: "跟随系统" }]} onChange={() => {}} />
              <SettingsSelectRow label="涨跌色习惯" value={mockAppearanceSettings.returnColorScheme}
                options={[{ value: "cn_red_up", label: "红涨绿跌（国内习惯）" }, { value: "global_green_up", label: "绿涨红跌（国际习惯）" }]} onChange={() => {}} />
              <SettingsSelectRow label="默认时间范围" value={mockAppearanceSettings.defaultTimeRange}
                options={[{ value: "近7日", label: "近7日" }, { value: "近30日", label: "近30日" }, { value: "今年", label: "今年" }, { value: "全部", label: "全部" }]} onChange={() => {}} />
              <SettingsSelectRow label="默认币种" value={mockAppearanceSettings.defaultCurrency}
                options={[{ value: "CNY", label: "人民币" }, { value: "USD", label: "美元" }]} onChange={() => {}} />
              <SettingsSelectRow label="金额小数位" value={mockAppearanceSettings.decimalPlaces.toString()}
                options={[{ value: "0", label: "0 位" }, { value: "2", label: "2 位" }, { value: "4", label: "4 位" }]} onChange={() => {}} />
              <SettingsToggleRow label="隐私模式" description="隐藏金额数值（占位）" checked={mockAppearanceSettings.privacyMode} onChange={() => {}} />
              <div className="flex justify-end pt-2"><SaveButton onClick={() => {}} /></div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}

function PhilosophyForm({ philosophy }: { philosophy: InvestorPhilosophySettings }) {
  return (
    <div className="space-y-4">
      <RiskPreferenceSelector value={philosophy.riskPreference} onChange={() => {}} />
      <SettingsSelectRow label="投资周期" value={philosophy.investmentHorizon}
        options={[{ value: "短期", label: "短期（1年内）" }, { value: "中期", label: "中期（1-3年）" }, { value: "中长期", label: "中长期（3-5年）" }, { value: "长期", label: "长期（5年以上）" }, { value: "超长期", label: "超长期（10年以上）" }]} onChange={() => {}} />
      <SettingsSelectRow label="主要目标" value={philosophy.mainGoal}
        options={[{ value: "保值", label: "保值" }, { value: "稳健增值", label: "稳健增值" }, { value: "长期增值", label: "长期增值" }, { value: "教育金", label: "教育金" }, { value: "养老", label: "养老" }, { value: "现金流", label: "现金流" }]} onChange={() => {}} />
      <SettingsInputRow label="最大单一资产占比" value={`${philosophy.maxSingleAssetRatio}%`} onChange={() => {}} />
      <SettingsInputRow label="最大单一行业占比" value={`${philosophy.maxSingleIndustryRatio}%`} onChange={() => {}} />
      <SettingsInputRow label="最低现金储备月数" value={`${philosophy.minCashReserveMonths} 个月`} onChange={() => {}} />
      <TagSelector label="偏好资产" tags={philosophy.preferredAssets}
        options={["A股核心资产", "优质基金", "理财产品", "银行理财", "黄金", "指数基金", "债券基金", "成长型基金", "科技股", "债券", "现金"]} onChange={() => {}} />
      <TagSelector label="避免行为" tags={philosophy.avoidBehaviors}
        options={["频繁交易", "追涨杀跌", "杠杆操作", "高风险投机", "单一资产重仓", "不熟悉领域投资", "盲目跟风", "过度集中"]} onChange={() => {}} />
      <SettingsSelectRow label="交易频率" value={philosophy.tradingFrequency}
        options={[{ value: "极低频", label: "极低频" }, { value: "低频", label: "低频" }, { value: "中频", label: "中频" }, { value: "高频", label: "高频" }]} onChange={() => {}} />
      <SettingsSelectRow label="回撤容忍度" value={philosophy.drawdownTolerance}
        options={[{ value: "5%", label: "5%" }, { value: "8%", label: "8%" }, { value: "10%", label: "10%" }, { value: "15%", label: "15%" }, { value: "20%", label: "20%" }, { value: "30%", label: "30%" }]} onChange={() => {}} />
      <SettingsSelectRow label="AI 建议风格" value={philosophy.aiAdviceStyle}
        options={[{ value: "保守", label: "保守" }, { value: "平衡", label: "平衡" }, { value: "偏积极", label: "偏积极" }]} onChange={() => {}} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium">自定义投资理念</p>
        <textarea className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none" rows={3} value={philosophy.customText} onChange={() => {}} />
      </div>
      <div className="flex justify-end pt-2"><SaveButton onClick={() => {}} /></div>
    </div>
  );
}
