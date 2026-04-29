# Design System

## 1. Objective

This document defines the design system for the household wealth and investment management web application.

The first implementation phase is a frontend high-fidelity prototype using local mock data. The design system must be stable enough to support later backend implementation without major UI restructuring.

## 2. Design Direction

The interface should be Apple-inspired, premium, calm, and financially trustworthy.

The product should emphasize:

- High clarity
- Low visual noise
- Strong data hierarchy
- Elegant cards
- Carefully spaced layouts
- Responsive web experience
- Rich but restrained charts
- Daily-use comfort

The design should not resemble a generic admin system.

## 3. Visual Identity

### 3.1 Keywords

- Calm
- Precise
- Premium
- Trustworthy
- Private
- Analytical
- Minimal
- Financial

### 3.2 UI Personality

The UI should feel like a private family financial cockpit.

It should help the user answer:

- 我家现在有多少钱？
- 今天赚了还是亏了？
- 哪些资产贡献最大？
- 哪些持仓风险最高？
- 我的操作是否符合自己的投资理念？
- 今天有哪些消息值得关注？

## 4. Color System

### 4.1 Base Colors

Use semantic design tokens rather than ad-hoc color classes.

Recommended tokens:

```ts
const colors = {
  background: "app background",
  foreground: "primary text",
  muted: "secondary text",
  card: "card surface",
  cardBorder: "subtle card border",
  accent: "primary accent",
  positive: "positive return",
  negative: "negative return",
  warning: "risk or caution",
  neutral: "stable or unavailable value",
}
```

### 4.2 Asset Category Colors

Asset categories should use consistent colors throughout the application.

Recommended categories:

```ts
const assetCategoryColors = {
  cash: "neutral blue-gray",
  aShare: "muted red or graphite-accent",
  usStock: "muted blue",
  etf: "muted indigo",
  mutualFund: "muted violet",
  bankWealth: "muted cyan",
  gold: "muted amber",
}
```

Avoid highly saturated colors. These colors should support recognition, not dominate the interface.

### 4.3 Return Colors

Use the same semantic logic everywhere.

```ts
positive return: positive color
negative return: negative color
zero or unavailable: neutral color
warning or risk: warning color
```

For the Chinese market, red and green can be culturally ambiguous because A-share convention often uses red for rising and green for falling, while international products often use green for positive and red for negative.

The product should define one consistent convention in settings or product configuration. For MVP, use:

```txt
positive = red
negative = green
neutral = gray
```

This matches common mainland China financial-market convention. If later adding global mode, allow the convention to be configurable.

## 5. Typography

### 5.1 Font

Use a modern system font stack.

Recommended:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "PingFang SC",
  "Microsoft YaHei",
  "Segoe UI",
  sans-serif;
```

### 5.2 Hierarchy

Recommended financial hierarchy:

```txt
Display number: 36px - 56px
Page title: 28px - 36px
Section title: 18px - 24px
Metric value: 20px - 28px
Body text: 14px - 16px
Caption: 12px - 13px
```

### 5.3 Numeric Emphasis

Use tabular numbers where possible.

Recommended CSS:

```css
font-variant-numeric: tabular-nums;
```

Money and return values should be easy to scan and compare.

## 6. Spacing and Radius

### 6.1 Spacing

Use a consistent spacing scale.

Recommended:

```ts
spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
}
```

### 6.2 Radius

Use soft but not exaggerated radii.

Recommended:

```ts
radius = {
  sm: "10px",
  md: "16px",
  lg: "22px",
  xl: "28px",
}
```

Primary dashboard cards can use larger radii. Tables and compact components should use smaller radii.

## 7. Surfaces

### 7.1 Background

Use a calm background.

Light mode:

- near-white
- subtle gray
- no heavy texture

Dark mode:

- near-black graphite
- low contrast
- no neon effect

### 7.2 Cards

Cards should use:

- subtle border
- soft surface
- light shadow only when useful
- consistent padding
- clear title and content separation

Avoid floating-card overload. Not every element needs a card.

## 8. Navigation

### 8.1 Primary Navigation

Recommended primary navigation:

- 总览
- 成员
- 持仓
- 导入
- 简报
- 设置

Desktop:

- Sidebar or top navigation is acceptable.
- Sidebar should be calm and minimal.

Mobile:

- Bottom navigation or compact top navigation is acceptable.
- Primary summary must remain easy to access.

### 8.2 Breadcrumbs

Use breadcrumbs for deep pages:

```txt
总览 / 爸爸 / 易方达沪深300ETF联接A
```

## 9. Core Components

### 9.1 FinancialSummaryCard

Used for household, member, and position summaries.

Required fields:

- Title
- Scope
- Current value
- Daily return
- Cumulative return
- Holding return
- Realized return
- Optional cash balance

### 9.2 MetricCard

Used for compact KPIs.

Required fields:

- Label
- Value
- Optional delta
- Optional percentage
- Optional tooltip

### 9.3 ReturnBadge

Used to display positive, negative, or neutral returns.

Required fields:

- Amount
- Percentage
- Period or return type
- Semantic state

### 9.4 MoneyText

Central component for money display.

Required behavior:

- Currency symbol
- Thousand separators
- Decimal handling
- Empty value handling
- Negative value handling

### 9.5 ChartCard

Wrapper for all charts.

Required fields:

- Title
- Subtitle
- Time range selector if relevant
- Loading state
- Empty state
- Error state

### 9.6 HoldingCard

Used for individual holdings.

Required fields:

- Asset name
- Asset type
- Member
- Account
- Current market value
- Holding cost
- Holding return
- Cumulative return
- Position weight
- Risk tag

### 9.7 AdviceCard

Used for AI-generated investment analysis.

Required fields:

- Advice type
- Related asset
- Reason
- Risk level
- Trigger condition
- Uncertainty
- Match with investor philosophy
- Timestamp

### 9.8 NewsBriefCard

Used for daily news summaries.

Required fields:

- Headline
- Category
- Related holdings
- Impact direction
- Importance
- Summary
- Source list if available

## 10. Page Patterns

### 10.1 Household Dashboard

Main purpose:

Show the overall state of family wealth.

Primary modules:

- Household total assets
- Daily return
- Cumulative return
- Holding return
- Realized return
- Cash balance
- Asset allocation
- Member allocation
- 30-day return chart
- 12-month asset trend
- Top gainers and losers
- Risk alerts
- Daily brief entry

### 10.2 Member Detail

Main purpose:

Show one family member's assets and performance.

Primary modules:

- Member summary
- Asset allocation
- Account list
- Current holdings
- Cleared holdings
- Transaction history
- Return trend
- Investor philosophy

### 10.3 Position Detail

Main purpose:

Show the full lifecycle and analysis of one holding.

Primary modules:

- Position summary
- Current market value
- Remaining cost
- Holding return
- Realized return
- Cumulative return
- Price / NAV chart
- Buy and sell markers
- Transaction list
- Related news
- AI analysis

### 10.4 Import Review

Main purpose:

Convert screenshots into confirmed structured holdings or transactions.

Primary modules:

- Screenshot upload
- Preview
- OCR recognition status
- Editable recognition table
- Manual correction
- Save / discard / re-recognize actions

The first prototype can simulate OCR results using mock data.

### 10.5 Daily Investment Brief

Main purpose:

Show market news and AI analysis related to household holdings.

Primary modules:

- Market overview
- Household-level impact
- Member-level impact
- Holding-level news
- Risk alerts
- Optional action ideas
- Investor philosophy match

### 10.6 Settings

Main purpose:

Configure family, accounts, investor philosophy, push channel, and data sources.

Primary modules:

- Family members
- Accounts
- Asset categories
- Investor philosophy
- WeChat push configuration
- Data source configuration
- Scheduled job settings

## 11. Interaction Patterns

### 11.1 Time Range Selection

Use consistent time ranges:

- 今日
- 近7日
- 近30日
- 本月
- 今年
- 全部
- 自定义

### 11.2 Scope Switching

Users should be able to switch scope where useful:

- 家庭
- 成员
- 账户
- 单仓

### 11.3 Empty States

Every major module must have a useful empty state.

Examples:

- 暂无持仓，点击添加第一笔资产。
- 暂无交易记录。
- 暂无可用净值数据。
- 今日简报尚未生成。

### 11.4 Loading States

Use skeletons or subtle loading indicators.

Avoid full-page spinners when only a card is loading.

### 11.5 Error States

Error states should explain:

- What failed
- Whether the user can retry
- Whether manual input is available

## 12. Data Visualization Rules

### 12.1 Dashboard Chart Limit

The main household dashboard should show no more than 4-6 major visual modules at once.

More detailed analytics should live in deeper pages.

### 12.2 Tooltip Content

Financial chart tooltips should include:

- Date
- Value
- Absolute return
- Percentage return where applicable
- Scope if ambiguous

### 12.3 Buy/Sell Markers

Position detail charts should support buy and sell markers.

Markers should be subtle and not obscure the price line.

## 13. Accessibility

Minimum requirements:

- Sufficient contrast
- Keyboard accessible controls
- Clear focus state
- Text not embedded in images
- Responsive font sizes
- Color is not the only indicator of positive or negative values

Return values should include + or - signs in addition to color.

## 14. Frontend Prototype Constraints

During the prototype phase:

- Use mock data only.
- Do not implement real backend APIs.
- Do not implement real OCR.
- Do not implement real market data fetching.
- Do not implement real WeChat push.
- Simulate these flows in UI so that product structure can be validated.

## 15. Acceptance Criteria

The design system is considered successfully applied when:

- The household dashboard feels premium and non-generic.
- The app is usable on mobile and desktop.
- Financial numbers are clear and consistently formatted.
- Return metrics are not ambiguous.
- Charts are readable and restrained.
- AI advice appears as careful decision support.
- The import review flow is understandable.
- Settings can express family members, accounts, investor philosophy, and push preferences.
