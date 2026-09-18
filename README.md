# Agent 工作台

Vue 3、TypeScript、Pinia 与 Naive UI 实现的知识与业务办理前端。主入口为 `/agent`；首页保留经典应用入口，并引导进入工作台。浏览器只访问 Java，模型 Key 由后端配置。

三端功能、业务状态、权限和当前 UI/API 差异见 [产品功能说明书（研发版）](https://gitee.com/chy66666/intelligent-integrated-interaction-platform/blob/master/docs/product/产品功能说明书-研发版.md)。

## 三个独立项目

| 项目 | Git 仓库 | 职责 |
|---|---|---|
| Java 后端 | [intelligent-integrated-interaction-platform](https://gitee.com/chy66666/intelligent-integrated-interaction-platform.git) | 登录、工作空间成员、对外 API、审批、业务幂等与 outbox |
| Python 运行时 | [intelligent-agent-runtime](https://gitee.com/chy66666/intelligent-agent-runtime.git) | LangGraph、checkpoint、事件、知识库、模型适配与评测 |
| Vue 前端 | [web-intelligent-integrated-interaction-platform](https://gitee.com/chy66666/web-intelligent-integrated-interaction-platform.git) | 工作台、SSE、审批卡、引用预览、知识与评测管理 |

推荐在任意开发目录下将三个仓库克隆为同级目录：

```sh
git clone https://gitee.com/chy66666/intelligent-integrated-interaction-platform.git
git clone https://gitee.com/chy66666/intelligent-agent-runtime.git
git clone https://gitee.com/chy66666/web-intelligent-integrated-interaction-platform.git
```

Java 仓库的 Compose 默认从同级目录获取 Python、Vue 构建上下文；非同级存放时，在 Java 仓库的本地 `.env` 配置 `AGENT_RUNTIME_PATH` 和 `FRONTEND_PATH`，无需修改代码。三个服务通过可配置的 HTTP 地址联动，不依赖开发者电脑上的固定路径。

## 本地开发

使用 Node.js 22 和 npm，在克隆得到的 `web-intelligent-integrated-interaction-platform` 仓库根目录执行：

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

## 工作台能力

- 工作空间创建与切换、完整会话历史、Agent / 对话模式、选择知识库。
- SSE 任务轨迹、按运行隔离、递增事件序号去重、断线自动重连与手动重连、取消、重试和补充输入。
- 审批卡显示服务端返回的原始草稿；同意、拒绝以及预约回执都以服务端状态为准。
- PDF 上传、异步索引状态、失败原因与重试、删除、授权原文预览和页码引用。
- 评测批次、逐例结果、任务指标与估算费用；费用未知时显示“待统计”。

模型配置由后端统一使用百炼 `qwen3.7-flash` 与 `text-embedding-v4`（1024 维），共用 `DASHSCOPE_API_KEY`。前端沿用登录 Token `iiip_token`；新 API 使用 `/api/v1` 的直接 JSON 响应，错误为 `{code,message}`，登录接口保留 `{ok,msg,data}`。

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
| `src/views/AgentWorkspace.vue` | 工作台页面与用户交互 |
| `src/stores/agent.ts` | 会话和运行状态、请求幂等键、事件恢复 |
| `src/features/agent/api.ts` | Java API 客户端与认证错误处理 |
| `src/features/agent/sse.ts` | UTF-8 流解码和 SSE 行协议 |
| `src/features/agent/KnowledgePanel.vue` | 知识库、上传和索引进度 |
| `src/features/agent/DocumentPreview.vue` | 授权文档与引用页预览 |
| `src/features/agent/EvaluationPanel.vue` | 评测与用量 |

[开发与验证记录](./docs/Agent工作台开发与验证.md)说明测试方法、实际结果和验证边界。按本次研发要求，临时测试脚本执行后删除，保留结果文档和界面截图。
