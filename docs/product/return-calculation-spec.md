# Return Calculation Specification

## 1. Purpose

This document defines the return calculation rules for the household wealth and investment management application.

The goal is to make return metrics consistent across:

- Single-position level
- Member level
- Household level

This specification applies to frontend prototype display and later backend implementation.

## 2. Core Principle

The system must distinguish the following concepts:

1. Current market value
2. Remaining holding cost
3. Holding return
4. Realized return
5. Cumulative return
6. Period return
7. Cash balance
8. External cash flow
9. Internal transaction

The word “return” must not be used without specifying the return type.

## 3. Calculation Scopes

### 3.1 Single-Position Scope

A single position refers to one member's lifecycle of holding one asset in one account.

Example:

```txt
Member: 爸爸
Account: 支付宝基金账户
Asset: 易方达沪深300ETF联接A
```

Even after the position is cleared, it remains a historical position for return review.

### 3.2 Member Scope

Member-level calculations aggregate all accounts, holdings, cash, and transactions belonging to one family member.

### 3.3 Household Scope

Household-level calculations aggregate all members.

## 4. Asset Value

### 4.1 Current Market Value

For a single position:

```txt
Current Market Value = Current Quantity × Latest Price or NAV
```

For member level:

```txt
Member Total Assets = Sum(Member Holding Market Values) + Member Cash Balance
```

For household level:

```txt
Household Total Assets = Sum(All Member Total Assets)
```

## 5. Cost Basis

### 5.1 Remaining Holding Cost

Remaining holding cost is the cost basis of the part that is still held.

When partial selling happens, the cost basis of the sold part must be removed from remaining holding cost.

MVP default method:

```txt
Average Cost Method
```

Future optional methods:

- FIFO
- LIFO
- Manual lot matching

### 5.2 Average Cost Method

After buy:

```txt
New Average Cost Per Unit =
(Previous Remaining Cost + Buy Amount + Buy Fee) /
(Previous Quantity + Buy Quantity)
```

After sell:

```txt
Sold Cost = Average Cost Per Unit Before Sell × Sell Quantity
```

Then:

```txt
Remaining Cost = Previous Remaining Cost - Sold Cost
Remaining Quantity = Previous Quantity - Sell Quantity
```

## 6. Holding Return

### 6.1 Definition

Holding return measures unrealized profit or loss on the part that is still held.

```txt
Holding Return = Current Market Value - Remaining Holding Cost
```

### 6.2 Holding Return Rate

```txt
Holding Return Rate = Holding Return / Remaining Holding Cost
```

If remaining holding cost is zero, return rate should be null or not available.

### 6.3 Interpretation

Holding return answers:

```txt
当前仍然持有的资产浮盈浮亏是多少？
```

It does not include gains or losses from already sold units.

## 7. Realized Return

### 7.1 Definition

Realized return measures profit or loss from sold units and settled income.

For a sell transaction:

```txt
Realized Return From Sell =
Sell Proceeds - Sold Cost - Sell Fee - Tax
```

Where:

```txt
Sell Proceeds = Sell Quantity × Sell Price
```

### 7.2 Dividends and Interest

Dividends and interest are considered realized income.

```txt
Realized Income = Dividends + Interest
```

Depending on product type, dividends can also be reinvested. For MVP, use explicit transaction records to determine whether dividends are paid as cash or reinvested.

### 7.3 Total Realized Return

```txt
Total Realized Return =
Sum(Realized Return From Sells)
+ Sum(Dividends)
+ Sum(Interest)
- Sum(Fees not already included)
- Sum(Taxes not already included)
```

## 8. Cumulative Return

### 8.1 Definition

Cumulative return measures the total profit or loss over the lifecycle of a scope.

For a single position:

```txt
Cumulative Return =
Holding Return
+ Realized Return
```

Where realized return already includes dividends, interest, fees, and taxes according to transaction records.

For member level:

```txt
Member Cumulative Return =
Sum(Cumulative Return of Member Positions)
+ Member Cash Return Adjustments if applicable
```

For household level:

```txt
Household Cumulative Return =
Sum(Cumulative Return of All Members)
```

### 8.2 Cash-Flow Cross-Check

For member or household level, cumulative return can be cross-checked using external cash flows.

```txt
Cumulative Return =
Current Total Assets
+ Historical External Withdrawals
- Historical External Deposits
```

This cross-check is useful for detecting data errors.

### 8.3 Interpretation

Cumulative return answers:

```txt
从开始记录以来，总共赚了或亏了多少钱？
```

It includes both unrealized and realized results.

## 9. Period Return

### 9.1 Definition

Period return supports:

- Daily
- Weekly
- Monthly
- Yearly
- Custom date range

Formula:

```txt
Period Return =
Ending Asset Value
- Beginning Asset Value
- Net External Inflow During Period
```

Where:

```txt
Net External Inflow =
External Deposits During Period
- External Withdrawals During Period
```

### 9.2 Internal vs External Flows

Internal transactions do not count as external inflows or outflows.

Internal transactions include:

- Cash buying stock
- Selling stock into cash
- Cash buying fund
- Fund redemption into cash
- Cash buying gold
- Gold selling into cash
- Transfers between accounts within the same member if later supported
- Transfers between family members if treated as internal household transfer

External flows include:

- Money added from outside the tracked system
- Money withdrawn from the tracked system
- Manual external correction
- Initial deposit if treated as starting capital

### 9.3 Interpretation

Period return answers:

```txt
在这个时间区间内，扣除新增投入和提现后，资产真实变化是多少？
```

## 10. Return Rate

### 10.1 Single-Position Cumulative Return Rate

```txt
Single-Position Cumulative Return Rate =
Single-Position Cumulative Return / Cumulative Invested Cost
```

Cumulative invested cost should represent the total historical capital deployed into this position, excluding sells.

### 10.2 Member Cumulative Return Rate

```txt
Member Cumulative Return Rate =
Member Cumulative Return / Member Net External Invested Capital
```

Where:

```txt
Member Net External Invested Capital =
Total External Deposits - Total External Withdrawals
```

### 10.3 Household Cumulative Return Rate

```txt
Household Cumulative Return Rate =
Household Cumulative Return / Household Net External Invested Capital
```

### 10.4 Period Return Rate

MVP simplified formula:

```txt
Period Return Rate =
Period Return / Beginning Asset Value
```

If beginning asset value is zero, return rate should be null or not available.

Future advanced options:

- Time-weighted return
- Money-weighted return
- XIRR

## 11. Cash

### 11.1 Cash as Asset

Cash is an asset category.

Cash includes:

- Bank deposits tracked as cash
- Cash created by selling assets
- Cash used to buy assets
- Interest received as cash
- Dividends received as cash

### 11.2 Cash Is Not Automatically Return

A cash increase is not necessarily investment return.

Examples:

- External deposit increases cash but is not return.
- Selling stock increases cash but may or may not realize return.
- Interest received increases cash and is return.
- Dividend received increases cash and is return.

## 12. Transaction Types

MVP transaction types:

```txt
BUY
SELL
DIVIDEND
INTEREST
DEPOSIT
WITHDRAW
FEE
ADJUSTMENT
```

### 12.1 BUY

Effects:

- Increase holding quantity
- Increase remaining holding cost
- Decrease cash if cash account is linked
- Fee increases cost unless recorded separately

**Manual import (Phase 18) implementation**:
- Holding quantity += buyQty
- Holding remainingCost += 买入净成本 (netAmount = grossAmount - fee - tax)
- 平均成本法重算: averageCost = remainingCost / quantity
- cashImpact = -(netAmount)（资金流出，现金减少）
- realizedReturn = 0（买入不产生已实现收益）

### 12.2 SELL

Effects:

- Decrease holding quantity
- Decrease remaining holding cost
- Increase cash
- Generate realized return
- Fee and tax reduce realized return

**Manual import (Phase 18) implementation**:
- 平均成本法: soldCost = averageCost × sellQty
- realizedReturn = netAmount - soldCost
- Holding quantity -= sellQty, remainingCost -= soldCost
- cashImpact = netAmount（资金流入，现金增加）
- 如果 quantity 变为 0: status = CLEARED, marketValue = 0, holdingReturn = 0, clearedAt = tradeDate
- 已清仓持仓保留 realizedReturn 和 cumulativeReturn

### 12.3 DIVIDEND

Effects depend on dividend mode:

Cash dividend:

- Increase cash
- Increase realized return

Reinvested dividend:

- Increase quantity
- Increase cost basis according to reinvestment record

**Manual import (Phase 18) implementation**:
- realizedReturn += netAmount（计入已实现收益）
- cashImpact = netAmount（资金流入）
- 更新 Holding: realizedReturn += netAmount, cumulativeReturn += netAmount

### 12.4 INTEREST

Effects:

- Increase cash
- Increase realized return

**Manual import (Phase 18) implementation**:
- 同 DIVIDEND
- realizedReturn += netAmount
- cashImpact = netAmount

### 12.5 DEPOSIT

Effects:

- Increase cash
- Increase external invested capital
- Not return

**Manual import (Phase 18) implementation**:
- realizedReturn = 0（**不计入收益**）
- cashImpact = netAmount（资金流入）
- 作为外部现金流记录，不影响任何收益指标

### 12.6 WITHDRAW

Effects:

- Decrease cash
- Decrease net invested capital
- Not return

**Manual import (Phase 18) implementation**:
- realizedReturn = 0（**不计入收益**）
- cashImpact = -netAmount（资金流出）
- 作为外部现金流记录

### 12.7 FEE

Effects:

- Decrease cash or increase cost depending on context
- Reduce return if not already included in buy or sell

**Manual import (Phase 18) implementation**:
- realizedReturn = -fee（减少已实现收益）
- cashImpact = -fee（资金流出）
- 更新 Holding: realizedReturn -= fee, cumulativeReturn -= fee

### 12.8 ADJUSTMENT

Effects:

- Manual correction
- Must require note or reason
- Should be visually marked as manual adjustment

**Manual import (Phase 18) implementation**:
- **必须填写备注 (note)**，否则保存时跳过该行
- realizedReturn = 0（不自动推断收益）
- cashImpact = 用户指定的值（如有）
- 不要静默影响收益，必须有人工备注记录

## 13. Example

### 13.1 Single Position Example

Transactions:

```txt
Deposit cash: ¥10,000
Buy fund: ¥10,000 at NAV 1.00, quantity 10,000
Sell half: 5,000 units at NAV 1.16, proceeds ¥5,800, fee ¥10
Latest NAV: 1.12
Remaining quantity: 5,000
```

Average cost per unit before sell:

```txt
¥10,000 / 10,000 = ¥1.00
```

Sold cost:

```txt
5,000 × ¥1.00 = ¥5,000
```

Realized return:

```txt
¥5,800 - ¥5,000 - ¥10 = ¥790
```

Remaining holding cost:

```txt
¥10,000 - ¥5,000 = ¥5,000
```

Current market value:

```txt
5,000 × ¥1.12 = ¥5,600
```

Holding return:

```txt
¥5,600 - ¥5,000 = ¥600
```

Cumulative return:

```txt
¥790 + ¥600 = ¥1,390
```

## 13.1 CLEARED 持仓规则 (Phase 18)

当 SELL 后 Holding quantity 变为 0 时，持仓标记为 CLEARED：

```txt
status = CLEARED
quantity = 0
currentMarketValue = 0
holdingReturn = 0
clearedAt = tradeDate (最后一次卖出日期)
```

**保留字段**：
- realizedReturn — 保留历史已实现收益
- cumulativeReturn — 保留历史累计收益 (= realizedReturn, 因 holdingReturn = 0)

**不保留字段**：
- holdingReturn — 清仓后无持仓收益
- currentMarketValue — 市值为 0
- averageCost / remainingCost — 清仓后无剩余成本

**摘要统计中的已清仓**：
- 成员总资产的已实现收益包含已清仓持仓的 realizedReturn
- 成员累计收益包含已清仓持仓的 cumulativeReturn
- 已清仓持仓不贡献市值和持仓收益
- 已清仓持仓不显示在"当前持仓"列表，但出现在"已清仓"标签页

## 14. Display Rules

### 14.1 Always Label Return Type

Do not display a number as only “收益”.

Use:

- 今日收益
- 区间收益
- 持仓收益
- 已实现收益
- 累计收益

### 14.2 Always Show Scope

Use labels or context to clarify:

- 单仓
- 成员
- 家庭

### 14.3 Always Show Amount and Percentage Where Possible

Example:

```txt
累计收益 +¥12,430.20 · +8.42%
```

If percentage is not available:

```txt
累计收益 +¥12,430.20 · 收益率暂无
```

### 14.4 Zero and Missing Values

Use neutral styling for zero.

For missing values, show:

```txt
暂无数据
```

Do not show misleading zero when the value is unknown.

## 15. Future Advanced Metrics

Not required in frontend MVP, but should be considered later:

1. Annualized return
2. Time-weighted return
3. Money-weighted return
4. XIRR
5. Maximum drawdown
6. Volatility
7. Sharpe ratio
8. Beta
9. Asset concentration risk
10. Industry exposure
11. Currency exposure
12. Geographic exposure

## 16. Validation Rules

The system should flag possible data issues:

- Negative quantity
- Sell quantity greater than current quantity
- Missing price or NAV
- Missing transaction date
- Missing asset type
- Remaining cost below zero
- Cash balance below zero unless margin is explicitly supported
- Cumulative return mismatch between transaction method and cash-flow cross-check

## 17. Frontend Prototype Requirements

In the frontend prototype:

- Mock data must include partial sell examples.
- Mock data must include realized return.
- Mock data must include holding return.
- Mock data must include cumulative return.
- Mock data must include member-level aggregation.
- Mock data must include household-level aggregation.
- UI must display return types clearly.
