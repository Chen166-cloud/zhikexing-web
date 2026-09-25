# 知课行 · AI 课程服务平台

Vue 3、TypeScript、Pinia 与 Naive UI 实现的课程服务前端。知课行将课程咨询、知识检索、Agent 审批和免费试听串联在同一个产品中。浏览器只访问 Java API，模型 Key 由后端配置。

三端功能、业务状态与权限见 [产品功能说明书（研发版）](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/product/产品功能说明书-研发版.md)。

网站对外名称为「知课行 · AI 课程服务平台」，前端 npm 包名为 `zhikexing-web`。三个项目使用下表中的同级目录名和远程仓库地址。

## 三个独立项目

| 项目 | 同级目录 | 远程仓库 | 职责 |
|---|---|---|---|
| Java 后端 | `zhikexing-backend` | [Git 仓库](https://gitee.com/chy66666/zhikexing-backend.git) | 登录、工作空间成员、对外 API、审批、业务幂等与 outbox |
| Python 运行时 | `zhikexing-agent-runtime` | [Git 仓库](https://gitee.com/chy66666/zhikexing-agent-runtime.git) | LangGraph、checkpoint、事件、知识库、模型适配与评测 |
| Vue 前端 | `zhikexing-web` | [Git 仓库](https://gitee.com/chy66666/zhikexing-web.git) | 知课行首页、登录注册、Agent 工作台、试听活动、SSE、审批卡、引用预览、知识与评测管理 |

推荐在任意开发目录下将三个仓库克隆为同级目录：

```sh
git clone git@gitee.com:chy66666/zhikexing-backend.git zhikexing-backend
git clone git@gitee.com:chy66666/zhikexing-agent-runtime.git zhikexing-agent-runtime
git clone git@gitee.com:chy66666/zhikexing-web.git zhikexing-web
```

Java 仓库的 Compose 默认从同级 `zhikexing-agent-runtime`、`zhikexing-web` 获取构建上下文；非同级存放时，在 Java 仓库的本地 `.env` 配置 `AGENT_RUNTIME_PATH` 和 `FRONTEND_PATH`，无需修改代码。三个服务通过可配置的 HTTP 地址联动，不依赖开发者电脑上的固定路径。

## 本地开发

使用 Node.js 22 和 npm，在 `zhikexing-web` 目录执行：

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

默认将 `/api`、`/user`、`/ai` 代理到 `http://localhost:8080`。若 Java 使用其他端口，在 `.env.local` 中设置：

```dotenv
VITE_API_PROXY_TARGET=http://localhost:18080
```

需要固定前端端口时，可直接运行：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5176 --strictPort
```

`VITE_API_BASE_URL` 默认留空，使用当前站点域名。生产环境由 Nginx 将相同路径转发至 Java，并为 Vue 路由配置 `try_files $uri $uri/ /index.html`。任何 `VITE_` 变量都会进入前端构建，不能放 API Key 或内部服务 Token。

使用 Java 仓库中的完整 Docker Compose 部署时，可从 `http://127.0.0.1:8088/login` 登录，或访问 `/register` 创建账户；登录后进入首页 `/`，再前往 `/agent` 使用真实工作台。未登录访问首页或工作台会转到登录页，登录后返回原目标页面。

## 页面与工作台能力

- `/login`、`/register`：独立的知课行品牌页面，展示课程咨询与 AI 助手服务场景；支持用户名密码登录、注册、密码显示切换和表单错误提示。登录与注册页面适配手机、桌面和深色主题。
- `/`：登录后的产品首页，展示课程咨询、知识检索、Agent 办理和免费试听四类服务，以及“咨询 → 核对依据 → 确认办理”的使用路径；入口可直达 `/agent`，页脚保留经典应用链接。全站导航提供首页、工作台、账户昵称、主题切换和退出登录。
- `/agent`：面向成员与 OWNER 的实际工作台，提供会话、知识库、试听活动和评测操作。首页中的流程示意与登录页中的助手对话是产品展示，不是实时会话或实时库存。

- 工作空间创建与切换、完整会话历史、Agent / 对话模式、选择知识库。
- SSE 任务轨迹、按运行隔离、递增事件序号去重、断线自动重连与手动重连、取消、重试和补充输入。
- 审批卡显示服务端返回的原始草稿；普通预约和 `claim_trial` 免费试听审批分别展示，同意、拒绝以及业务回执都以服务端状态为准。试听审批 `EXECUTED` 只表示已提交参与，必须查询请求 `SUCCEEDED` 且有 `orderId` 才算抢到名额。
- `/agent` 左侧“免费试听”标签按工作空间查询活动列表与详情；OWNER 从课程与校区目录选择业务对象，创建、发布、暂停活动并查看对账。空间成员在开放窗口直接抢课，查看服务端保存的本人最近 100 条参与记录，按原请求编号追踪 `PENDING/RESERVED/SUCCEEDED/REJECTED`；刷新页面或换设备后仍可恢复查询。HTTP 202 和数据库剩余量都不保证最终名额。
- PDF 上传、异步索引状态、失败原因与重试、删除、授权原文预览和页码引用。
- 评测批次、逐例结果、任务指标与估算费用；费用未知时显示“待统计”。

试听标签与 Agent 审批使用同一套 Java 业务权限、限流和订单终态。三端代码与 Compose 使用 RocketMQ。2026-09-25 已在 Docker 中启动完整 `app` 和 `observability` Compose，真实 Redis/RocketMQ 业务链路经四次独立 fixture 烟测通过；Playwright 连接真实 Nginx/Java API 完成 OWNER 注册、创建并发布活动、直接抢课、刷新后查看订单、对账及暂停。另有 mock API 浏览器检查覆盖 MEMBER 创建入口隐藏。真实模型效果、真实 API 下的 MEMBER 浏览器路径和浏览器内 Agent 审批尚未验收；详情见后端仓库的[Docker 部署验证记录](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/deployment/Docker部署验证记录.md)。

首页和账户页已完成桌面、390px 与 320px 窄屏、深色主题、表单状态及首页进入 Agent 工作台的浏览器视觉检查；320px 下无横向溢出，控制台无错误。当前页面已部署到 Compose 的 8088 入口，并从登录页进入首页及 Agent 工作台，浏览器控制台无错误或警告。`npm run build` 包含的类型检查和 Vite 生产构建通过。

真实模型模式由后端配置百炼 `qwen3.7-flash` 与 `text-embedding-v4`（1024 维），共用 `DASHSCOPE_API_KEY`；上述 Compose 联调使用 `AI_PROVIDER=fixture`。前端将登录令牌保存在浏览器本地键 `zhikexing_token`，工作空间选择与试听请求回执分别使用 `zhikexing_workspace` 和 `zhikexing_trial_receipts:*`；`/api/v1` API 使用直接 JSON 响应，错误为 `{code,message}`，登录接口使用 `{ok,msg,data}`。

## 构建与源码

```powershell
npm run type-check
npm run build
npm audit
```

生产构建目录为 `dist/`；`.dockerignore` 排除依赖目录、密钥、测试产物与 Git 数据。完整服务、中间件与 Nginx 部署由后端仓库的 Docker 部署资源统一管理。

`.github/workflows/frontend-ci.yml` 在 push、PR 或手动触发时执行 `npm ci`、类型检查及生产构建、`npm audit`。官方 Actions 固定到完整提交 SHA，只有 `contents: read` 权限，不需要模型 API Key。

| 路径 | 作用 |
| --- | --- |
| `src/views/Home.vue` | 知课行首页、能力介绍与工作台入口 |
| `src/views/LoginView.vue`、`src/views/RegisterView.vue`、`src/assets/auth.css` | 账户页面、表单交互与响应式视觉样式 |
| `src/App.vue` | 品牌导航、主题、账户操作与路由外壳 |
| `src/views/AgentWorkspace.vue` | 工作台页面与用户交互 |
| `src/stores/agent.ts` | 会话和运行状态、请求幂等键、事件恢复 |
| `src/features/agent/api.ts` | Java API 客户端与认证错误处理 |
| `src/features/agent/sse.ts` | UTF-8 流解码和 SSE 行协议 |
| `src/features/agent/KnowledgePanel.vue` | 知识库、上传和索引进度 |
| `src/features/agent/DocumentPreview.vue` | 授权文档与引用页预览 |
| `src/features/agent/EvaluationPanel.vue` | 评测与用量 |
| `src/features/agent/TrialCampaignPanel.vue` | 活动管理、直接抢课、本人记录与对账 |

[开发与验证记录](./docs/Agent工作台开发与验证.md)说明测试方法、实际结果和验证边界。
