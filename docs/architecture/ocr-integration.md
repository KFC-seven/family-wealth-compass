# OCR 集成架构

## 设计概述

OCR provider 抽象层，支持 mock、阿里云 OCR，预留腾讯云 OCR 和 PaddleOCR。

## 目录结构

```
src/server/ocr/
  types.ts           # OcrProvider 接口、OcrRowResult、OcrRecognizeResult
  registry.ts        # Provider 注册与选择
  normalize.ts       # 金额、资产类型、平台标准化
  validation.ts      # 行校验（必填/负值/低置信度/去重）
  providers/
    mock-ocr-provider.ts       # Mock OCR（始终可用）
    aliyun-ocr-provider.ts     # 阿里云 OCR 骨架
```

## 核心接口

```typescript
interface OcrProvider {
  name: string;
  isEnabled(): boolean | Promise<boolean>;
  recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult>;
  healthCheck?(): Promise<OcrProviderHealth>;
}
```

## Provider 状态

| Provider | 状态 | 说明 |
|----------|------|------|
| MockOcrProvider | ✅ 完整可用 | 始终可用，根据 sourcePlatform 返回预定义结果 |
| AliyunOcrProvider | ⚠️ 骨架 | 仅配置检测，**真实阿里云 OCR 调用尚未实现** |
| TencentOcrProvider | — 未开始 | 预留方向 |
| PaddleOcrProvider | — 未开始 | 需 Python 环境 |

## MockOcrProvider（当前使用）

- 始终可用，不访问外部网络
- 根据 sourcePlatform 返回预定义结果：
  - ALIPAY: 2 条基金持仓
  - BROKER: 2 条 A 股持仓
  - BANK/OTHER: 1 条银行理财持仓
- 用于开发、测试、OCR fallback

## 阿里云 OCR 骨架（未完成）

**当前状态：骨架，不可用于真实 OCR。** `AliyunOcrProvider` 仅完成配置检测（`isEnabled` 检查 env）。真实接入需：
1. 确认 OCR 产品类型（文档识别 / 表格识别 / 通用文字）
2. 配置 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_OCR_ENDPOINT
3. 设置 OCR_PROVIDER=aliyun, OCR_ENABLED=true
4. 实现 API 签名和调用
5. 映射返回结构为 OcrRowResult[]
6. 生产环境需关注费用和隐私合规

## OCR 结果标准化

### 金额标准化
- 去除 ¥￥$ 符号
- 去除千分位逗号
- 处理百分号
- 验证数值格式

### 资产类型映射
- "A股"/"股票" → A_SHARE
- "基金"/"公募基金" → MUTUAL_FUND
- "银行理财" → BANK_WEALTH
- "黄金"/"积存金" → GOLD_ACCUMULATION
- 等...

### 来源平台映射
- 支付宝相关 → ALIPAY
- 券商相关 → BROKER
- 银行相关 → BANK

## 行校验规则

| 规则 | 处理方式 |
|------|---------|
| 成员为空 | MISSING → 标记 MISSING_FIELDS |
| 账户为空 | MISSING |
| 资产名为空 | MISSING |
| 资产类型为空 | MISSING |
| 市值为负 | INVALID → 默认 IGNORE |
| 数量为负 | INVALID |
| 成本为负 | INVALID |
| 置信度 < 阈值 | LOW_CONFIDENCE 标记 |
| 同一资产名+账户重复 | DUPLICATE 标记 |

## Fallback 策略

1. OCR_PROVIDER=mock（默认）→ MockOcrProvider
2. OCR_PROVIDER=aliyun + OCR_ENABLED=true → 尝试 AliyunOcrProvider
3. Aliyun 未配置 → fallback 到 MockOcrProvider
4. getOcrProvider() 保证永不返回 null

## 环境变量

```env
OCR_PROVIDER="mock"         # mock | aliyun | tencent | paddle
OCR_ENABLED=false
OCR_CONFIDENCE_THRESHOLD=0.8
```

## 中国大陆部署注意事项

- 阿里云 OCR 国内可访问，需实名认证和产品订购
- 腾讯云 OCR 可作为替代方案
- PaddleOCR 可自部署，但需要 Python 环境
- Mock OCR 离线可用，无需任何外部服务
- 默认无真实 OCR API key 也能跑通

## 后续扩展方向

- TencentOcrProvider: 骨架已预留
- PaddleOcrProvider: 需要 Python 服务或脚本桥接
- OCR 结果对比和择优
- 多图批量识别
