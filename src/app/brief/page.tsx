"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { BriefHeaderCard } from "@/components/brief/BriefHeaderCard";
import { MarketOverviewCard } from "@/components/brief/MarketOverviewCard";
import { HouseholdImpactCard } from "@/components/brief/HouseholdImpactCard";
import { MemberImpactCard } from "@/components/brief/MemberImpactCard";
import { BriefNewsCard } from "@/components/brief/BriefNewsCard";
import { BriefRiskAlertCard } from "@/components/brief/BriefRiskAlertCard";
import { AdviceCard } from "@/components/brief/AdviceCard";
import { WeChatPushStatusCard } from "@/components/brief/WeChatPushStatusCard";
import { BriefHistoryList } from "@/components/brief/BriefHistoryList";
import { mockBrief, mockBriefHistory } from "@/data/mock-brief";

export default function BriefPage() {
  const [brief] = useState(mockBrief);
  const [activeDate, setActiveDate] = useState(brief.date);

  const totalMemberImpacts = brief.memberImpacts.reduce((s, m) => s + m.affectedHoldingCount, 0);
  const highRiskCount = brief.riskAlerts.filter((r) => r.level === "high").length;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="每日投资简报" subtitle="基于家庭持仓和市场动态生成的每日投资分析" />

      {/* Top summary */}
      <BriefHeaderCard
        date={brief.date}
        generatedAt={brief.generatedAt}
        status={brief.status}
        todayReturn={brief.householdImpact.todayReturn}
        todayReturnRate={brief.householdImpact.todayReturnRate}
        affectedHoldings={totalMemberImpacts}
        highRiskCount={highRiskCount}
        pushed={brief.pushStatus.pushed}
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Market Overview */}
          <ChartCard title="今日市场概览" subtitle="各市场表现及对家庭持仓的影响">
            <div className="grid gap-3 sm:grid-cols-2">
              {brief.marketOverview.map((item) => (
                <MarketOverviewCard key={item.id} item={item} />
              ))}
            </div>
          </ChartCard>

          {/* Household Impact */}
          <HouseholdImpactCard summary={brief.householdImpact} />

          {/* Member Impacts */}
          <ChartCard title="成员影响" subtitle={`${brief.memberImpacts.length} 个成员`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brief.memberImpacts.map((m) => (
                <MemberImpactCard key={m.memberId} data={m} />
              ))}
            </div>
          </ChartCard>

          {/* News */}
          <ChartCard title="持仓相关新闻" subtitle={`${brief.news.length} 条相关内容`}>
            <div className="space-y-3">
              {brief.news.map((item) => (
                <BriefNewsCard key={item.id} item={item} />
              ))}
            </div>
          </ChartCard>

          {/* Risk Alerts */}
          <ChartCard title="风险提醒" subtitle={`${brief.riskAlerts.length} 条`}>
            <div className="space-y-3">
              {brief.riskAlerts.map((alert) => (
                <BriefRiskAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </ChartCard>

          {/* Advice Cards */}
          <ChartCard title="操作建议" subtitle={`${brief.adviceCards.length} 条建议 · 决策辅助，非交易指令`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {brief.adviceCards.map((advice) => (
                <AdviceCard key={advice.id} advice={advice} />
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <WeChatPushStatusCard status={brief.pushStatus} />
          <ChartCard title="历史简报">
            <BriefHistoryList
              items={mockBriefHistory}
              activeDate={activeDate}
              onSelect={setActiveDate}
            />
          </ChartCard>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
        以上内容为基于持仓和公开信息的辅助分析，不构成确定性投资指令。
      </div>
    </div>
  );
}
