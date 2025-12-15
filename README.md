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

## 本地启动 / 部署（Ubuntu）

以下以常见的 Ubuntu Server 20.04+ 为例，假设你已经拥有一个普通用户（例如 `ubuntu`），并且具备 `sudo` 权限。

### 1）安装系统依赖

确保已安装 Node.js（推荐 20+）、npm 和 git，可使用 `nvm` 或系统包管理器：

```bash
# 安装基础工具
sudo apt update
sudo apt install -y curl git build-essential

# 安装 nvm（可选但推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# 安装 Node.js LTS（例如 20）
nvm install 20
nvm use 20

# 确认版本
node -v
npm -v
```

### 2）拉取代码并安装依赖

```bash
cd ~
git clone <你的仓库地址> ScholarSearch
cd ScholarSearch/web
npm install
```

> 如果是通过其他方式同步代码（例如通过 FTP/压缩包），只要最终目录结构一致即可，关键是进入 `web/` 再执行 `npm install`。

### 3）配置环境变量（SQLite 本地数据库）

Ubuntu 下同样可以使用默认的 SQLite，本地零依赖：

```bash
cd ~/ScholarSearch/web
cp env.example .env    # 或者自行创建 .env，填入对应变量
```

确保 `.env` 中至少有：

```bash
DATABASE_URL="file:./dev.db"
CRON_SECRET="dev"                    # 用于定时任务校验，可自定义
APP_BASE_URL="http://localhost:3000" # 对外访问地址
```

> `.env` 文件不会被提交到仓库，只在服务器本地保存即可。

### 4）初始化数据库（迁移 + seed）

```bash
cd ~/ScholarSearch/web
export DATABASE_URL="file:./dev.db"
npm run db:migrate
npm run db:seed
```

完成后会在 `web/prisma/dev.db` 生成 SQLite 数据库文件。

### 5）启动应用

开发模式（便于调试）：

```bash
cd ~/ScholarSearch/web
export DATABASE_URL="file:./dev.db"
npm run dev
```

运行后在浏览器访问：`http://服务器IP:3000`

如果用于「类生产环境」，建议先构建再以 `next start` 方式运行：

```bash
cd ~/ScholarSearch/web
export DATABASE_URL="file:./dev.db"
npm run build
npm run start
```

> 更进一步，可以使用 `pm2`/`systemd` 等工具将 `npm run start` 以守护进程方式常驻运行，这里不展开。

### 6）运行一次追踪任务（生成站内通知）

在 Web 页面中先点击“保存检索”，再在服务器新开一个终端执行：

```bash
cd ~/ScholarSearch/web
export CRON_SECRET="dev"                    # 与 .env 中保持一致
export APP_BASE_URL="http://localhost:3000" # 根据实际访问地址修改
npm run worker
```

然后回到首页底部“站内通知”区域，点击“刷新”即可看到新增通知。

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


