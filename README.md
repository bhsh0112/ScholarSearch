# ScholarSearch（V1）

面向 CS 研究生的“精准 + 全面 + 可持续追踪”文献检索工具（Web 应用）。

V1 范围（已实现）：
- 聚合检索：**OpenAlex + Crossref + arXiv**（基础去重合并）
- 保存检索：Saved Search（用于日常追踪）
- 追踪任务：增量写库 + 站内通知 + 可选邮件（SMTP）
- 多维过滤：来源/年份/期刊会议/作者（V1 先做统一 post-filter，保证跨源一致）

## 目录结构
- `web/`：Next.js（App Router）应用
- `docker-compose.yml`：预留 Postgres（V1 默认用 SQLite，本地零依赖）

## 本地启动（Windows PowerShell）

### 1）安装依赖

进入 `web/`：

```bash
cd web
npm install
```

### 2）配置环境变量

V1 默认走 SQLite（无需 Docker）：
- 复制 `web/env.example` 的内容到你本地的 `web/.env`（或 `web/.env.local`）
- 至少配置 `DATABASE_URL`（建议保持默认：`file:./dev.db`）

> 注意：`web/.env` 文件不会被提交，请只在本地创建。

### 3）初始化数据库（迁移 + seed）

```bash
cd web
$env:DATABASE_URL="file:./dev.db"
npm run db:migrate
npm run db:seed
```

### 4）启动开发服务器

```bash
cd web
$env:DATABASE_URL="file:./dev.db"
npm run dev
```

打开：`http://localhost:3000`

### 5）运行一次追踪任务（生成站内通知）

先在页面里点击“保存检索”，再在另一个终端运行：

```bash
cd web
$env:CRON_SECRET="dev"
$env:APP_BASE_URL="http://localhost:3000"
npm run worker
```

然后在首页底部“站内通知”区域点击“刷新”即可看到新增通知。

## 多维过滤（V1）
首页支持在查询之外添加 filters：
- **来源**：OpenAlex / Crossref / arXiv（可多选）
- **年份区间**：from/to
- **期刊/会议（venue）**：逗号分隔，任意一个命中即可
- **作者**：逗号分隔，按作者名子串匹配（大小写不敏感）

这些过滤条件会：
- 影响 `POST /api/search` 的返回结果（去重后再过滤）
- 随“保存检索”一起写入 `SavedSearch.filters`，并在追踪任务中复用

## AI：自由表述 → 检索式草案 + filters（可选）
V1 支持点击首页的“AI 生成”，把自由表述交给第三方 LLM（OpenAI-compatible）生成：
- **queryDraft**：可编辑的“检索式草案”
- **filters（可选）**：作者/venue/年份/来源等结构化限制

配置方式：在 `web/.env` 中加入（参考 `web/env.example`）：
- `LLM_BASE_URL`：例如 `https://api.openai.com` 或其他兼容服务的 base url
- `LLM_API_KEY`
- `LLM_MODEL`

隐私提示：启用后会把用户输入的 query 发送给第三方模型服务。

## 邮件通知（可选）
在 `web/.env` 中配置：
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

未配置 SMTP 时，系统只会生成站内通知，不会报错。

## 支付（微信/支付宝，扫码开通订阅）
已支持在 `/pricing` 使用 **微信支付/支付宝** 扫码开通订阅，支付成功后会写入 `Subscription`，并自动解锁 Free/Pro/Max 的配额限制（AI、主题数量、TopN、频率等）。

配置方式：
- 参考 `web/env.example` 增加支付相关环境变量（支付宝：`ALIPAY_*`；微信：`WECHATPAY_*`）
- 回调地址必须是 **公网 HTTPS 可访问**：
  - 支付宝回调：`/api/pay/alipay/notify`
  - 微信回调：`/api/pay/wechat/notify`

本地/测试机联调建议：
- 使用内网穿透（例如 cloudflared/ngrok）把 `http://localhost:3000` 暴露成公网 HTTPS
- 将 `ALIPAY_NOTIFY_URL` / `WECHATPAY_NOTIFY_URL` 临时指向该公网 URL

## 支付（V1 最简）：收款码人工开通会员
如果你不想在第一版接入支付网关回调（或没有公网 HTTPS 环境），可以使用“**静态收款码 + 人工审核开通**”：

- **用户侧**：进入 `/pricing`，选择“收款码（人工开通）”，扫码付款后点击“我已付款”提交确认
- **管理员侧**：访问 `/admin/manual-topups`，点击“通过并开通”即可为该用户开通/续费订阅

需要配置：
- `MANUAL_PAY_QR_URL`：你的收款码图片 URL（建议 https）
- `MANUAL_PAY_QR_URL_WECHAT`：微信收款码图片 URL（可选；配置后用户可切换微信/支付宝）
- `APP_USER_EMAIL`：管理员邮箱（用于审核权限）


