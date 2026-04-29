# Frontend MVP PRD

## 1. Product Name

暂定名称：Family Wealth Compass

中文暂定名称：家庭财富罗盘

The name is temporary. It can be changed later without affecting product structure.

## 2. Product Background

The user wants to build a private household wealth and investment management web application for family use.

The application should support manual maintenance of household assets, screenshot-based holding import, daily net value and market data updates in later phases, return tracking, rich visualization, WeChat news push, and AI-assisted investment analysis based on each family member's holdings and personal investment philosophy.

The first phase focuses on frontend high-fidelity prototype development with local mock data.

## 3. Product Scope

### 3.1 In Scope for Frontend MVP

The frontend MVP includes:

1. Household dashboard
2. Member detail page
3. Position detail page
4. Screenshot import review page
5. Daily investment brief page
6. Settings page
7. Mock data
8. Reusable financial UI components
9. Responsive layout
10. Apple-inspired visual style
11. Light and dark mode support
12. Return metric display across single-position, member, and household levels

### 3.2 Out of Scope for Frontend MVP

The frontend MVP does not include:

1. Real backend API
2. Real database
3. Real authentication
4. Real OCR
5. Real market data fetching
6. Real WeChat push
7. Real AI model invocation
8. Real bank, broker, Alipay, or fund platform integration
9. Real trading
10. Production-grade permission system

These items will be addressed after the frontend structure and visual system are approved.

## 4. Target Users

Primary users:

- Family members who want to track their own assets.
- Household administrator who wants to view total family wealth and all member details.

The application is for private family use, not public SaaS.

## 5. Permission Assumptions

The intended permission model combines Mode A and Mode D:

### Mode A

All family members can view:

- Household total assets
- Each member's detailed assets
- Household-level analytics

### Mode D

The system should later allow fine-grained configuration, such as:

- Whether a member can view another member's details
- Whether a member can edit only their own data
- Whether a member can manage household settings
- Whether a member can view investment advice for others

Frontend MVP should prepare UI concepts for permission configuration but does not need to implement real permission enforcement.

## 6. Supported Asset Types

Frontend MVP should include mock support for:

1. Cash
2. A-shares
3. US stocks
4. Exchange-traded funds
5. Mutual funds
6. Bank wealth-management products
7. Gold accumulation products

Future expansion may include:

- Bonds
- Convertible bonds
- Insurance
- Real estate
- Loans
- Credit cards
- Other alternative assets

## 7. Core Concepts

### 7.1 Household

The family-level container.

A household includes:

- Members
- Accounts
- Holdings
- Transactions
- Cash balances
- Daily briefs
- Settings

### 7.2 Member

A family member.

A member may have:

- Multiple accounts
- Multiple holdings
- Personal investment philosophy
- Member-level return metrics

### 7.3 Account

An account is where assets are held.

Examples:

- 支付宝基金账户
- 华泰证券账户
- 招商银行账户
- 工商银行理财账户
- 黄金积存金账户

### 7.4 Asset

A financial instrument or asset category.

Examples:

- 贵州茅台
- Apple Inc.
- 易方达沪深300ETF联接A
- 招商银行理财产品
- 黄金积存金

### 7.5 Holding

A member's position in an asset under an account.

A holding can be:

- Current holding
- Cleared holding
- Watchlist item in the future

### 7.6 Transaction

A financial event that changes holding, cash, cost, or return.

Examples:

- Buy
- Sell
- Dividend
- Interest
- Deposit
- Withdraw
- Fee
- Adjustment

### 7.7 Investor Philosophy

A structured profile that captures how a member wants to invest.

Examples:

- Risk preference
- Investment horizon
- Preferred asset types
- Maximum position concentration
- Maximum industry concentration
- Cash reserve requirement
- Trading frequency preference
- Avoided behaviors

### 7.8 Daily Investment Brief

A daily AI-assisted report that summarizes market news, holding impact, risk alerts, and optional action ideas.

Frontend MVP uses mock data only.

## 8. Required Pages

## 8.1 Household Dashboard

### Objective

Give a clear view of total household wealth and current performance.

### Required Modules

1. Household total asset summary
2. Today return
3. Cumulative return
4. Holding return
5. Realized return
6. Cash balance
7. Asset category allocation
8. Member asset allocation
9. 30-day return trend
10. 12-month total asset trend
11. Top gainers and losers
12. Risk alerts
13. Daily investment brief preview

### Key Interactions

- Select time range
- Switch between household and member scope where appropriate
- Navigate to member detail
- Navigate to position detail
- Navigate to daily brief

### Acceptance Criteria

- The household total asset value is the strongest visual element.
- Daily, cumulative, holding, and realized returns are visually distinct.
- The page is usable on mobile.
- Charts are readable and not cluttered.
- The page does not feel like a generic admin dashboard.

## 8.2 Member Detail Page

### Objective

Show one member's asset structure, accounts, holdings, returns, and investment philosophy.

### Required Modules

1. Member asset summary
2. Member cumulative return
3. Member holding return
4. Member realized return
5. Member cash balance
6. Asset category allocation
7. Account list
8. Current holdings
9. Cleared holdings
10. Transaction list
11. Return trend
12. Investor philosophy card

### Key Interactions

- Switch time range
- Filter holdings by asset type
- Navigate to account details in future
- Navigate to position detail
- Open investor philosophy settings

### Acceptance Criteria

- The page makes member-level scope clear.
- Holdings and cleared positions are clearly separated.
- Investor philosophy is visible enough to inform later AI advice.

## 8.3 Position Detail Page

### Objective

Show the full lifecycle and analysis of one holding.

### Required Modules

1. Position summary
2. Current market value
3. Remaining holding cost
4. Holding return
5. Realized return
6. Cumulative return
7. Position weight in member portfolio
8. Position weight in household portfolio
9. Price / NAV trend chart
10. Buy and sell markers
11. Transaction history
12. Related news
13. AI analysis card

### Key Interactions

- Select chart time range
- View transaction details
- Navigate to related member
- Navigate to related account in future

### Acceptance Criteria

- Single-position scope is clear.
- Buy and sell events are visible on the chart.
- Holding return and cumulative return are not confused.
- AI analysis is clearly presented as decision support.

## 8.4 Screenshot Import Review Page

### Objective

Allow the user to upload holding screenshots, review simulated OCR results, manually correct them, and save them as structured holdings or transactions.

### Required Modules

1. Upload area
2. Screenshot preview
3. OCR status
4. Recognition result table
5. Editable fields
6. Manual add row
7. Ignore row
8. Save confirmation
9. Error and empty states

### Supported Screenshot Sources

Mock examples should represent:

- Alipay
- Broker app
- Bank app

### Required Editable Fields

- Member
- Account
- Asset name
- Asset type
- Asset code if available
- Quantity
- Market value
- Cost
- Holding return
- Currency
- Source platform

### Acceptance Criteria

- The flow is understandable without real OCR.
- The user can see the original screenshot and recognized data side by side.
- Recognition results are editable before saving.
- The UI anticipates recognition errors.

## 8.5 Daily Investment Brief Page

### Objective

Show a daily AI-assisted report based on household holdings, market movement, news, risks, and personal investor philosophy.

### Required Modules

1. Brief date
2. Market overview
3. Household impact summary
4. Member impact sections
5. Holding-related news
6. Risk alerts
7. Optional action ideas
8. Investor philosophy match
9. WeChat push status placeholder

### Advice Card Structure

Each advice card should include:

- Advice type
- Related asset
- Related member
- Core reason
- Risk level
- Trigger condition
- Uncertainty
- Investor philosophy match
- Suggested attention level

### Advice Types

Use labels such as:

- 继续观察
- 分批加仓
- 减仓观察
- 止盈评估
- 降低集中度
- 补充现金
- 暂不操作

Avoid absolute labels such as:

- 立即买入
- 必须卖出
- 保证盈利

### Acceptance Criteria

- The page reads like a structured investment brief, not a chat transcript.
- Advice is scenario-based and risk-aware.
- Personal investment philosophy is visibly integrated.

## 8.6 Settings Page

### Objective

Provide configuration entry points for household, members, accounts, investment philosophy, push settings, and data sources.

### Required Modules

1. Household profile
2. Member management
3. Account management
4. Asset category settings
5. Investor philosophy settings
6. WeChat push settings
7. Data source settings
8. Scheduled job settings placeholder

### Acceptance Criteria

- Settings are grouped logically.
- The user can understand what will be configurable in the backend phase.
- No real backend persistence is required in frontend MVP.

## 9. Mock Data Requirements

Mock data must include:

### 9.1 Members

At least three family members:

- 爸爸
- 妈妈
- 孩子

### 9.2 Accounts

At least five accounts:

- 支付宝基金账户
- 华泰证券账户
- 招商银行账户
- 工商银行理财账户
- 黄金积存金账户

### 9.3 Assets

Mock assets should include:

- A-share stock
- US stock
- ETF
- Mutual fund
- Bank wealth-management product
- Gold accumulation product
- Cash

### 9.4 Transactions

Transactions should include:

- Buy
- Sell
- Dividend
- Interest
- Deposit
- Withdraw
- Fee
- Adjustment

### 9.5 Historical Series

Mock historical data should support charts for:

- 30-day return trend
- 12-month asset trend
- Price / NAV trend
- Position value trend

## 10. Non-Functional Requirements

### 10.1 Responsiveness

All pages must work on mobile and desktop.

### 10.2 Visual Quality

The UI must follow the design system and apple-finance-ui skill.

### 10.3 Maintainability

The frontend should use:

- TypeScript types
- Reusable components
- Centralized formatting utilities
- Centralized mock data
- Clear folder structure

### 10.4 Extensibility

The prototype should be easy to connect to a backend later.

Mock data structures should resemble future API responses.

## 11. Suggested Frontend Folder Structure

```txt
src/
  app/
    page.tsx
    members/[memberId]/page.tsx
    holdings/[holdingId]/page.tsx
    import/page.tsx
    brief/page.tsx
    settings/page.tsx
  components/
    layout/
    financial/
    charts/
    holdings/
    brief/
    import/
    settings/
    ui/
  data/
    mock-household.ts
    mock-members.ts
    mock-holdings.ts
    mock-transactions.ts
    mock-brief.ts
  lib/
    format.ts
    returns.ts
    mock-calculations.ts
    constants.ts
  types/
    finance.ts
    brief.ts
    settings.ts
```

## 12. MVP Completion Criteria

The frontend MVP is complete when:

1. All six required pages exist.
2. Navigation between pages works.
3. Mock data powers all major UI sections.
4. Household, member, and position scopes are represented.
5. Return metrics are displayed using the agreed definitions.
6. UI follows Apple-inspired premium design.
7. Mobile layout is usable.
8. Light and dark mode are supported.
9. Import review flow is simulated.
10. Daily investment brief is simulated.
11. The prototype can be reviewed before backend implementation begins.
