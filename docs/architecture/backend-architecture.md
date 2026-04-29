# 后端架构设计

## 技术栈

- **运行时**: Next.js 16 App Router + Node.js server
- **语言**: TypeScript
- **数据库 ORM**: Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- **输入校验**: Zod 4
- **包管理**: npm

## 目录结构

```
src/
  app/api/               # Next.js Route Handlers
    health/               # 健康检查
    portfolio/
      household-summary/  # 家庭总览摘要
    members/              # 成员列表 + 详情 + 摘要
    holdings/             # 持仓列表 + 详情 + 交易记录
    transactions/         # 交易记录 (GET/POST)
    import-sessions/      # 导入会话 (GET/POST)
    daily-brief/          # 每日简报
    settings/             # 设置 (GET/POST)
  server/
    db/prisma.ts          # Prisma 客户端单例
    api/
      response.ts         # API 统一响应格式
      validators.ts       # Zod 校验 schema
    finance/
      calculations.ts     # 收益计算工具
      mappers.ts          # 数据映射工具
prisma/
  schema.prisma           # 数据库模型
  seed.ts                 # 种子数据
```

## API 设计原则

1. 统一响应格式：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`
2. 金额统一为 number（前端不做 Decimal 运算）
3. 日期使用 ISO 8601 字符串
4. 错误有明确的 code 和 message
5. Route Handler 保持薄层，逻辑在 server/ 目录

## 数据库设计原则

1. 核心领域对象（成员、账户、持仓、交易）用独立表
2. 非关键配置用 JSON 字段（简报、设置）
3. 收益字段作为快照缓存，不依赖实时计算
4. 全部使用 cuid 主键
5. 金额使用 Decimal 类型

## 本阶段边界

- 只实现了 GET 接口 + 少数 POST 占位
- 前端仍默认使用 mock 数据
- seed 数据覆盖了核心业务场景
- 未实现真实外部集成

## 中国大陆环境设计约束

- 不依赖 Vercel 或境外服务
- 使用系统字体栈，不请求 Google Fonts
- 支持阿里云 ECS 自托管
- npm registry 和 Prisma engine mirror 镜像可配置

## 后续阶段

1. 逐页将 mock 切换为 API 调用
2. 真实定时任务（净值更新、简报生成）
3. 阿里云 OSS 文件上传
4. 国内 AI/OCR/推送集成
