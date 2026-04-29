# apple-finance-ui Skill

## 1. Purpose

This skill defines the visual, interaction, and component standards for a premium Apple-inspired responsive web application for household wealth and investment management.

The application is for private family use. It manages bank deposits, A-shares, US stocks, exchange-traded funds, mutual funds, bank wealth-management products, bonds if later added, and gold accumulation products. It must present financial information with clarity, restraint, trustworthiness, and strong visual hierarchy.

This skill applies to all frontend work in the project.

## 2. Product Positioning

Build a calm, high-trust personal wealth cockpit for a family.

The product should feel closer to:

- Apple Wallet
- Apple Health financial-style summaries
- Apple Card spending overview
- A premium private banking dashboard
- A modern personal finance analytics tool

It should not feel like:

- A generic SaaS admin dashboard
- A broker trading terminal
- A noisy crypto dashboard
- A colorful marketing landing page
- A dense enterprise BI system

## 3. Visual Principles

### 3.1 Overall Style

The interface must be:

- Minimal
- Calm
- Precise
- Premium
- Financially serious
- Easy to scan
- Mobile-first
- Suitable for daily personal use

Avoid visual noise. The main dashboard must communicate the most important financial state within three seconds.

### 3.2 Apple-inspired, Not Apple-copy

Use Apple-inspired design principles rather than trying to imitate specific Apple screens.

Acceptable:

- Strong whitespace
- Large financial numbers
- Subtle cards
- Soft surfaces
- Gentle depth
- Refined typography
- Consistent radii
- Clear grouping
- Smooth but understated transitions

Not acceptable:

- Excessive glassmorphism
- Overuse of blur
- Neon gradients
- Random accent colors
- Heavy shadows
- Decorative illustrations as primary content
- Dashboard clutter
- Dense table-first layouts

## 4. Layout Rules

### 4.1 Responsive First

Every page must work well on:

- Mobile browser
- Tablet browser
- Desktop browser

Mobile is not an afterthought. Components should stack naturally on small screens and expand into multi-column layouts on desktop.

### 4.2 Page Structure

Use this default page structure:

1. Page title and optional short context
2. Primary financial summary card
3. Key metric strip
4. Main chart or primary analysis block
5. Secondary insight cards
6. Detailed tables or records
7. Empty, loading, and error states where appropriate

### 4.3 Grid

Desktop:

- Use a 12-column conceptual grid.
- Main dashboard should prefer 2-column or 3-column compositions.
- Avoid more than 4 dense widgets in one row.

Mobile:

- Use single-column stacking.
- Primary summary card must appear first.
- Important charts should remain readable without horizontal scrolling.

## 5. Typography Rules

### 5.1 Financial Hierarchy

Money values must receive strong typographic hierarchy.

Typical hierarchy:

- Total asset value: largest text on the page.
- Daily return and cumulative return: secondary emphasis.
- Sub-metrics: compact but readable.
- Labels: muted and smaller.

### 5.2 Text Style

Use clear, concise financial language.

Avoid overly promotional or emotional copy.

Good examples:

- 家庭总资产
- 今日收益
- 累计收益
- 持仓收益
- 已实现收益
- 现金余额
- 风险提醒
- 与投资理念匹配

Avoid:

- 爆赚
- 神级收益
- 马上操作
- 绝佳买点
- 无脑买入

## 6. Color Rules

### 6.1 Palette

Use a restrained palette.

Recommended base colors:

- White / near-white background
- Soft gray card surfaces
- Graphite text
- Muted blue accent
- Subtle green for positive returns
- Subtle red for negative returns
- Amber for caution
- Neutral gray for stable or unavailable values

### 6.2 Semantic Colors

Positive, negative, warning, neutral, and informational states must be consistent across the app.

Do not use random colors for individual charts unless they map to consistent asset categories.

### 6.3 Dark Mode

Every page and component must support dark mode.

Dark mode should feel premium and calm, not high-contrast or neon.

## 7. Component Rules

### 7.1 Required Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- recharts
- mock data in TypeScript during frontend prototype stage

### 7.2 Component Design

Build reusable components instead of placing all UI logic in page files.

Recommended component categories:

- Layout components
- Financial metric components
- Money display components
- Return display components
- Chart cards
- Asset allocation cards
- Holding cards
- Advice cards
- News summary cards
- Upload review components
- Settings forms

### 7.3 Avoid Giant Files

Avoid giant page files.

If a page grows too large, split it into:

- Page container
- Header summary
- Metric cards
- Chart sections
- Data tables
- Dialogs
- Utility functions

## 8. Financial Display Rules

### 8.1 Money

Every money value must show:

- Currency symbol or currency code
- Proper thousand separators
- Sensible decimals

Examples:

- ¥1,286,430.25
- $42,103.82
- ¥8,921

### 8.2 Returns

Every return metric should show both:

- Absolute amount
- Percentage

Example:

- +¥3,420.18 · +1.28%
- -¥820.55 · -0.36%

### 8.3 Return Types

The UI must distinguish:

- 今日收益
- 区间收益
- 持仓收益
- 已实现收益
- 累计收益

Do not merge these into a single vague “收益” field.

### 8.4 Asset Scope

Every financial card must make its scope clear:

- 单仓
- 成员
- 家庭

The user should never need to guess what the number refers to.

## 9. Chart Rules

### 9.1 Chart Quality

Charts must be readable, sparse, and purposeful.

Every chart must have:

- Title
- Optional subtitle
- Time range control where useful
- Clear axis or tooltip values
- Empty state
- Loading state
- Error state

### 9.2 Recommended Charts

Use charts for:

- 家庭总资产趋势
- 累计收益趋势
- 日收益柱状图
- 资产类别分布
- 成员资产占比
- 成员收益贡献
- 单仓收益排行
- 单仓亏损排行
- 现金比例趋势
- 资产类型收益贡献
- 单仓价格 / 净值走势
- 买卖点标注

### 9.3 Avoid

Avoid:

- Too many colors
- 3D charts
- Gauge spam
- Pie charts with too many categories
- Tiny charts without value
- Charts that need a long explanation to understand

## 10. AI Analysis and Advice Rules

AI-generated investment content must be presented as:

- Analysis
- Risk alerts
- Optional action ideas
- Scenario-based observations
- Decision support

It must not be presented as:

- Guaranteed investment advice
- Direct trading instruction
- Certain prediction
- Promise of return

Recommended sections for an AI advice card:

- 建议类型
- 影响资产
- 核心理由
- 风险等级
- 触发条件
- 不确定性
- 与个人投资理念匹配度

## 11. Required Pages in Frontend Prototype

The frontend prototype must include:

1. 家庭总览页
2. 成员详情页
3. 单仓详情页
4. 持仓截图导入确认页
5. 每日投资简报页
6. 设置页

Use local mock data only in the prototype stage.

## 12. Quality Checklist

Before considering a page complete, check:

- Is the most important number visible immediately?
- Is the visual hierarchy obvious within three seconds?
- Is the page usable on mobile?
- Are the charts readable without external explanation?
- Are positive, negative, and neutral returns styled consistently?
- Are card spacing, radius, and borders consistent?
- Does the page avoid generic admin-dashboard feeling?
- Does dark mode work?
- Are loading, empty, and error states represented?
- Are AI suggestions framed as decision support rather than direct orders?

## 13. Development Behavior

When implementing frontend features:

1. Start with mock data.
2. Build reusable components first if the pattern appears more than once.
3. Keep financial formatting centralized.
4. Keep return calculations centralized.
5. Avoid hard-coded random Tailwind values.
6. Preserve the Apple-inspired design standard.
7. Prefer clarity over visual novelty.
8. Ask whether a number is single-position, member-level, or household-level if unclear.
