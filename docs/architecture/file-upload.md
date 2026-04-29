# 文件上传架构

## 设计概述

轻量文件存储抽象层，支持本地磁盘存储，预留阿里云 OSS。文件不存入数据库 blob 字段。

## 目录结构

```
src/server/storage/
  types.ts                    # FileStorageProvider 接口
  file-validation.ts          # 文件大小/MIME/扩展名校验
  file-hash.ts                # SHA256 哈希
  registry.ts                 # Provider 注册与选择
  providers/
    local-storage-provider.ts    # 本地磁盘存储
    aliyun-oss-storage-provider.ts # 阿里云 OSS 骨架
```

## 本地存储策略

- 文件存到 `./uploads/imports/YYYY/MM/{hash前16位}.{ext}`
- `uploads/` 已加入 `.gitignore`
- 文件名使用 hash 前缀防路径穿越
- 不保留原始文件名作为存储文件名

## 文件校验

| 校验项 | 规则 |
|--------|------|
| 文件大小 | 默认 ≤ 10MB |
| MIME 类型 | image/jpeg, image/png, image/webp |
| 扩展名 | .jpg, .jpeg, .png, .webp |

## 文件 Hash

使用 SHA256 计算文件哈希，存入 ImportSession.fileHash。可用于：
- 去重检测
- 文件完整性校验

## 环境变量

```env
UPLOAD_ENABLED=false              # 上传开关
UPLOAD_STORAGE_PROVIDER="local"   # local | aliyun-oss
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_ALLOWED_MIME_TYPES="image/jpeg,image/png,image/webp"
LOCAL_UPLOAD_DIR="./uploads"
UPLOAD_API_SECRET=""              # 生产环境必设
```

## 阿里云 OSS 预留

`AliyunOssStorageProvider` 已实现骨架（配置检测），真实上传需：
1. `npm install ali-oss`
2. 配置 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_OSS_BUCKET / ALIYUN_OSS_ENDPOINT
3. 实现 `save()` 方法

## 生产环境安全注意事项

1. 上传目录不应暴露为静态资源目录
2. UPLOAD_API_SECRET 必须在生产环境设置
3. 文件上传后应通过安全 API 访问（非直接 URL）
4. 后续建议迁移到阿里云 OSS 私有 bucket + 签名 URL
5. 截图中可能包含敏感资产信息，仅在可信环境中使用

## 当前保护策略

- UPLOAD_ENABLED 默认 false
- UPLOAD_API_SECRET 可选校验（Header: x-upload-api-secret）
- 开发环境若未设置 secret，允许调用
- 这是临时保护，后续认证阶段替换
