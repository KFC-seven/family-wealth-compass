# 行情 / 净值数据源 (Market Data Sources)

## 一、设计概述

可扩展的数据源抽象层，支持多种行情/净值数据来源，按优先级自动选择、失败降级。

### 核心原则

- 每个 provider 独立实现，统一接口
- 通过 registry 按资产类型和优先级匹配
- 所有真实数据源必须支持失败降级到 mock/manual
- 可配置开关、优先级
- 中国大陆网络环境优先

## 二、目录结构

```
src/server/market-data/
  types.ts           # MarketDataProvider 接口、MarketPriceResult 等类型
  errors.ts          # ProviderError / ProviderUnavailableError / ProviderDataError
  normalize.ts       # 价格去重、币种标准化、有效性校验
  registry.ts        # Provider 注册、优先级匹配、安全获取
  index.ts           # 统一导出
  providers/
    mock-provider.ts             # Mock（离线开发用）
    manual-provider.ts           # 手动价格（使用数据库已有数据）
    eastmoney-fund-provider.ts  # 天天基金（可选，场外基金净值）
    tushare-provider.ts         # Tushare Pro 骨架
```

## 三、核心接口

```typescript
interface MarketDataProvider {
  name: string;
  supportedAssetTypes: AssetTypeEnum[];
  isEnabled(): boolean | Promise<boolean>;
  getLatestPrice(asset: MarketAsset): Promise<MarketPriceResult>;
  getHistoricalPrices?(asset, startDate, endDate): Promise<MarketPriceResult[]>;
  healthCheck?(): Promise<MarketDataProviderHealth>;
}
```

## 四、数据源说明

### 1. MockMarketDataProvider

- **状态**：已实现
- **启用条件**：始终启用
- **支持资产**：全部类型
- **数据来源**：预设基准价格 + 2% 随机抖动
- **用途**：开发和测试默认使用，外部数据不可用时兜底

### 2. ManualPriceProvider

- **状态**：已实现
- **启用条件**：始终启用
- **支持资产**：全部类型
- **数据来源**：数据库 PriceSnapshot 表（MANUAL 来源的数据）
- **用途**：银行理财、黄金积存金等无法自动获取的资产；当天有手动录入价格时优先返回

### 3. EastmoneyFundProvider

- **状态**：已实现（可选）
- **启用条件**：`MARKET_DATA_ENABLE_EASTMONEY_FUND=true`
- **支持资产**：MUTUAL_FUND（场外基金）
- **数据来源**：天天基金公开 JSONP 接口 `fundgz.1234567.com.cn`
- **注意**：这是第三方公开数据接口，稳定性和使用条款需自行确认。家庭自用场景谨慎使用。
- **限制**：仅获取基金净值，不支持股票/ETF 实时行情
- **降级**：请求失败、返回结构变化、限流时自动 fallback 到 mock/manual

### 4. TushareProvider

- **状态**：骨架（本阶段仅 healthCheck）
- **启用条件**：`MARKET_DATA_ENABLE_TUSHARE=true` + `TUSHARE_TOKEN` 已设置
- **支持资产**：A_SHARE、ETF、MUTUAL_FUND
- **说明**：Tushare Pro 是专业的金融数据平台，需注册获取 token。本阶段仅实现配置检测骨架。
- **后续计划**：实现完整 A股行情、ETF 净值、基金净值等接口

### 5. AKShare HTTP（未实现）

- 不要求本阶段实现
- AKShare 是 Python 生态，需要独立 Python 服务或脚本桥接
- 仅在文档中记录为可选方案

## 五、各资产类型的数据源策略

| 资产类型 | 主要数据源 | 兜底策略 |
|---------|----------|--------|
| MUTUAL_FUND | EastmoneyFundProvider（可选） | mock / manual |
| A_SHARE | TushareProvider（骨架） | mock / manual |
| ETF | TushareProvider（骨架） | mock / manual |
| US_STOCK | manual / mock | mock |
| BANK_WEALTH | manual（不自动更新） | mock |
| GOLD_ACCUMULATION | manual / mock | mock |
| CASH | manual（价格固定为 1） | mock |

## 六、Fallback 策略

数据获取顺序：
1. 根据 `MARKET_DATA_MODE` 判断：
   - `mock`：直接使用 MockProvider
   - `mixed`/`real`：查询数据库 MarketDataSource 配置
2. 按 priority 顺序尝试 provider
3. 第一个可用的成功即返回
4. 全部失败 → fallback mock → fallback manual
5. `safeGetPrice()` 保证永远不会因单个 provider 异常而崩溃

## 七、环境变量

```bash
MARKET_DATA_MODE="mock"               # mock | mixed | real
MARKET_DATA_ENABLE_EASTMONEY_FUND=false
MARKET_DATA_ENABLE_TUSHARE=false
TUSHARE_TOKEN=""
```

默认全部安全：mock 模式、无真实外部请求。开启真实数据源必须显式设置。

## 八、中国大陆网络环境注意事项

- 天天基金接口（fundgz.1234567.com.cn）国内可访问
- Tushare Pro（tushare.pro）国内可用，有免费和付费额度
- AKShare 是 Python 生态，国内可用但需 Python 环境
- 不要依赖境外 API（如 Yahoo Finance、Alpha Vantage）作为主要数据源
- 所有外部请求应设置合理的超时时间（10s）

## 九、API

### GET /api/market-data/sources

返回所有 MarketDataSource 配置及对应的 provider 状态。

### POST /api/market-data/sources/check

手动触发所有数据源健康检查，更新数据库状态。

## 十、数据准确性和免责声明

- Mock 价格为模拟数据，不可用于真实投资决策
- 天天基金数据来自第三方公开接口，准确性未经验证
- Tushare 数据来自 Tushare Pro 平台，使用时需遵守其使用条款
- 本系统提供的数据仅供家庭内部参考，不构成投资建议
