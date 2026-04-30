# Provider 配置指南

单家庭自用应用的 provider 配置说明。所有真实 provider 都需要显式配置环境变量，默认 mock 模式无需任何 key。

## Provider 总览

| Provider 类型 | Mock | 真实实现 | 配置复杂度 |
|--------------|------|---------|-----------|
| AI 简报 | MockAiProvider | DeepSeek | 需 API key |
| AI 简报 | — | 阿里云百炼 | 骨架预留 |
| 微信推送 | MockPushProvider | WeCom Bot | 需 Webhook URL |
| 微信推送 | — | Server 酱 | 需 SendKey |
| 行情数据 | MockMarketData | 天天基金/Tushare | 可选 token |
| OCR | MockOcrProvider | 阿里云 OCR | 骨架预留 |
| 文件存储 | LocalStorageProvider | 阿里云 OSS | 骨架预留 |

## DeepSeek 配置

### 1. 获取 API Key

访问 https://platform.deepseek.com 注册并获取 API key。

### 2. 环境变量

```env
AI_PROVIDER="deepseek"
AI_ENABLED=true
AI_MODEL="deepseek-chat"
DEEPSEEK_API_KEY="sk-xxxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

### 3. 验证

```bash
# 检查配置
npm run providers:doctor

# 真实调用测试
npm run real-providers:smoke

# 生成简报
npm run job:generate-brief
```

### 4. 故障排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `DeepSeek API 401` | API key 无效 | 检查 DEEPSEEK_API_KEY |
| `DeepSeek API 429` | 限流 | 等待或降低请求频率 |
| AI_PROVIDER 自动 fallback 到 mock | key 缺失或 AI_ENABLED=false | 检查环境变量 |

## WeCom Bot 配置

### 1. 获取 Webhook

在企业微信群中添加群机器人，获取 Webhook URL。

### 2. 环境变量

```env
WECHAT_PUSH_ENABLED=true
WECHAT_PUSH_PROVIDER="wecom-bot"
WECHAT_WORK_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx"
```

### 3. 验证

```bash
npm run providers:doctor
npm run real-providers:smoke
```

或者通过 API：

```bash
curl -X POST http://localhost:3000/api/push/test
```

### 4. 故障排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `errcode: 93000` | webhook key 无效 | 检查 URL |
| `网络错误` | 无法访问 qyapi | 确认 ECS 网络策略 |

## Server 酱 配置

### 1. 获取 SendKey

访问 https://sct.ftqq.com 注册并获取 SendKey。

### 2. 环境变量

```env
WECHAT_PUSH_ENABLED=true
WECHAT_PUSH_PROVIDER="server-chan"
SERVER_CHAN_SEND_KEY="SCTxxxx"
```

### 3. 验证

```bash
npm run providers:doctor
npm run real-providers:smoke
```

## 诊断命令

| 命令 | 说明 | 需要 key？ |
|------|------|-----------|
| `npm run providers:doctor` | 检查所有 provider 配置状态 | 否 |
| `npm run real-providers:smoke` | 真实调用测试 | 是（否则 SKIP） |

## 回退到 Mock

```env
# 禁用所有真实 provider
AI_PROVIDER="mock"
AI_ENABLED=false
WECHAT_PUSH_ENABLED=false
WECHAT_PUSH_PROVIDER="mock"
MARKET_DATA_MODE="mock"
OCR_PROVIDER="mock"
```

Mock 模式无需任何外部 key，系统完整可运行。

## 常见问题

**Q: 没有真实 key 时系统能跑吗？**
A: 可以。所有 provider 默认使用 mock，不依赖外部服务。

**Q: 配置了真实 key 但调用失败怎么办？**
A: AI 会 fallback 到 MockAiProvider。推送会记录失败到 PushNotification。

**Q: 如何确认当前使用的 provider？**
A: GET /api/ai/status 和 GET /api/push/status 不暴露 key 但返回 provider 名称和状态。

**Q: 大陆网络访问 DeepSeek 没问题吗？**
A: DeepSeek API (api.deepseek.com) 国内可访问。企业微信 qyapi 和 Server 酱 sctapi 均国内可用。

## 安全提醒

- 不提交任何真实 key 到 Git 仓库
- .env.production 已加入 .gitignore
- 所有 status API 不返回 key/webhook/send key
- 生产环境必须修改默认密码和 secret
