# 知课行 Agent 工作台开发与验证

当前文档日期：2026-09-29。网站名称为「知课行 · AI 课程服务平台」，npm 包名和前端目录名为 `zhikexing-web`。三端仓库地址见 [README](../README.md)。首页为 `/`，课程广场为 `/courses`，工作台为 `/agent`；本文描述当前前端功能、已执行验证和剩余边界。

## 页面与功能

| 页面区域 | 当前功能 |
| --- | --- |
| 登录与注册 | `/login`、`/register` 为独立品牌页面，展示课程咨询、知识检索和试听办理场景；支持密码显示切换、表单校验、服务端错误提示及 `Retry-After` 倒计时，等待或提交期间阻止重复提交，适配桌面、手机与深色主题 |
| 知课行首页 | 登录后展示课程咨询、知识检索、Agent 办理和免费试听四项能力，以及“咨询 → 核对依据 → 确认办理”路径；提供课程广场、工作台、试听活动入口和经典应用链接 |
| 课程广场与详情 | `/courses` 支持名称搜索、方向/学历筛选、价格/周期排序和分页；`/courses/:id` 展示课程信息并把咨询问题带入工作台，用户发送后才创建任务 |
| 智能助理 | 按工作空间管理会话与运行；显示回答、可核对的工具轨迹和文档引用；支持补充输入、停止、重试和人工审批 |
| 知识库 | 创建知识库、上传 PDF、查看解析与索引状态、重试失败文档、预览授权原文和提取内容 |
| 免费试听 | 查询活动列表与详情；成员直接抢课、查看本人最近 100 条申请及按申请编号查询结果；空间 OWNER 创建、发布、暂停活动并查看只读对账 |
| 评测与用量 | 提交问题和可选预期结果，查看逐例结果、引用、延迟及 Agent 运行用量 |

浏览器只调用 Java 公网 API，不直连 Python Runtime、RocketMQ 或数据库，也不保存模型密钥。业务权限由服务端校验：活动创建、发布、暂停和对账仅对 OWNER 开放，普通成员可浏览活动并查询本人的抢课请求。前端根据工作空间角色显示相应操作，不能代替后端授权。

浏览器本地的登录令牌键为 `zhikexing_token`，工作空间选择键为 `zhikexing_workspace`；试听申请回执键以前缀 `zhikexing_trial_receipts:` 隔离登录用户和工作空间。Java API 的 `Authorization` 请求头及 `/api/v1` 路径保持现有契约。

首页的工作台示意和登录/注册页中的 AI 助手对话属于静态产品展示；真实会话、库存与审批状态只在工作台中从服务端获取。认证页面隐藏全站导航，页面内保留知课行品牌标识；登录后首页、课程页面与工作台共用导航。

完整 Compose 的浏览器入口为 `http://127.0.0.1:8088/login`。`/login`、`/register` 是公开路由；未登录访问首页、课程页面或工作台会转到登录页，成功登录后返回目标页。课程申请、审批回执、知识库与评测操作位于 `/agent`。

## 登录保护联动

Java 在 BCrypt 校验前完成全局与账号限流，并用 `Semaphore` 控制单实例认证并发；默认全局 20 次/秒、已有账号 10 次/分钟、认证并发 4 个。10 分钟内密码错误 5 次会进入 60 秒冷却，冷却期间的拒绝请求不延长时间。限流与冷却返回 HTTP 429，认证繁忙或依赖服务不可用返回 HTTP 503，等待时间放在 `Retry-After` 响应头中。后端参数与 Redis 会话实现见[登录保护说明](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/modules/登录保护.md)。

登录与注册共用 [useAuthRetry.js](../src/composables/useAuthRetry.js) 的倒计时逻辑。[api.js](../src/services/api.js) 将 `Retry-After` 秒数交给页面，按钮在倒计时期间不可用，提交函数也会拦截重复调用；普通密码错误仍可直接修正后提交。跨域时由后端 CORS 暴露该响应头。

账号最多保留 3 个会话，超限淘汰最早创建的会话；每次有效请求续期 24 小时。过期或被淘汰后，下一次请求返回 HTTP 401，前端清除 `zhikexing_token` 并返回登录页。部署此次 `login:v2` 会话键升级后，旧 Token 需要重新登录。Runtime 使用内部服务凭据和持久化用户、工作空间身份，浏览器会话失效不取消已提交任务；后续查看结果和提交审批仍需有效登录。

## 课程浏览与咨询

[courseApi](../src/features/courses/api.ts) 复用工作台的 `authorizedFetch`，自动携带登录令牌并处理 401。列表调用 `GET /api/v1/courses`，返回 `{items,total,page,pageSize}`；详情调用 `GET /api/v1/courses/{id}`，不存在时返回 404。

| 查询项 | 页面与接口约定 |
| --- | --- |
| 名称与方向 | `keyword` 搜索课程名称，`type` 筛选方向；服务端去除名称和关键词中的空白后匹配 |
| 我的学历 | `edu` 为 0～4，匹配最低学历要求不高于该值的课程；不选则不限制 |
| 排序 | `sortBy=id/price/duration`，`ascending=true/false`；默认按 ID 升序 |
| 分页 | `page` 从 1 开始，页面固定 `pageSize=12`；筛选提交后回到第 1 页，失败重试保留本次请求页码 |

课程 ID 使用字符串，`price` 按人民币元展示，`duration` 按天展示；课程价格与试听订单的 `amountCent` 单位不同。缺失展示字段显示“待补充”，列表支持加载、空结果和失败重试，详情单独处理不存在状态。校区为全局目录，目前没有课程与校区关联，详情页不推断授课地点。

详情页进入 `/agent?courseId=...&courseName=...`。工作台初始化成功后准备本地空会话，预填包含课程名和编号的问题，并清除 URL 查询参数；用户点击发送后才创建服务端会话和 run，已有任务继续执行。

Java 对默认首页、详情、固定选项及校区使用 Caffeine + Redis 两级缓存，Redisson 锁合并跨实例冷缓存回源；关键词、筛选、非默认排序和其他分页直接查 MySQL。默认本地 TTL 10 秒、共享 TTL 60 秒，允许短暂旧数据。Agent 单个 run 的 30 秒工具结果缓存用于减少重复工具调用，可能叠加展示延迟；登录、权限、库存和审批不使用课程展示缓存。完整范围见[课程目录与两级缓存](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/modules/课程目录与两级缓存.md)。

## 免费试听页面

左侧“免费试听”标签位于 `/agent` 工作台。OWNER 创建草稿时从服务端课程与校区目录下拉选择已有记录，设置 1～10000 个名额及最长 30 天的时间窗口；核对后发布。已发布活动可暂停，暂停后无法恢复该活动。成员看到活动窗口、课程、校区、免费价格和数据库未确认名额。该剩余数不是实时可抢数量，页面不据此承诺抢课成功。

直接抢课调用 `POST /api/v1/workspaces/{workspace}/trials/campaigns/{id}/claims`。页面在发送前保存 `clientRequestId`，网络中断后按原键重试，避免产生另一笔参与请求；重试原请求可在活动窗口关闭后恢复已存在的回执。服务端返回 HTTP 202 和 `requestId` 只表示申请已受理。页面自动短时轮询，也支持手动刷新和输入申请编号查询：

| 状态 | 页面表述 |
| --- | --- |
| `PENDING` | 请求已受理，正在确认名额 |
| `RESERVED` | 名额已预留，正在创建订单 |
| `SUCCEEDED` 且有 `orderId` | 免费试听订单已确认 |
| `REJECTED` | 未获得名额，并显示原因 |

`GET /api/v1/workspaces/{workspace}/trials/claims` 返回当前成员最近 100 条服务端申请记录，包含直接抢课和 Agent 审批申请。页面用它恢复刷新或换设备后的记录；本地仅保留原请求幂等键和已知申请编号，且按登录令牌摘要和工作空间隔离。超出列表范围的申请仍可凭本人 `requestId` 查询。活动管理页可查看只读对账快照，其中数据库守恒结果、在途请求、待补偿数和 Redis 状态分别展示；对账页面不会修改库存。

智能助理中的 `claim_trial` 审批卡继续显示活动信息并要求用户确认。审批执行后的 `EXECUTED` 仅表示申请已提交；若 Agent 回执还是 `PENDING` 或 `RESERVED`，页面不会将其写成订单成功。普通预约审批保持独立。

## 前端实现要点

- [CoursesView.vue](../src/views/CoursesView.vue)、[CourseDetailView.vue](../src/views/CourseDetailView.vue) 承载课程查询和咨询入口；详情请求按当前路由更新，避免较早响应覆盖当前课程。
- [TrialCampaignPanel.vue](../src/features/agent/TrialCampaignPanel.vue) 承载活动、直接抢课、本人记录与管理操作；工作空间切换或组件卸载时清理旧请求视图和轮询，避免把其他空间的结果显示到当前空间。
- [api.ts](../src/features/agent/api.ts) 统一添加登录令牌并封装试听接口；[types.ts](../src/features/agent/types.ts) 将活动、请求及订单编号作为字符串处理，避免大整数 ID 在浏览器中失去精度。
- [AgentWorkspace.vue](../src/views/AgentWorkspace.vue) 提供会话、知识库、评测、审批和“免费试听”标签。活动开始时间在页面内定时更新，按钮会在窗口开启时变为可用。
- SSE 客户端使用流式 `TextDecoder` 处理跨字节分块，按事件序号去重，并在切换会话时取消旧连接。Java 已受理但执行器尚未建立运行时，先查询提交回执；MQ 已投递不等于业务执行成功。
- 文档预览先经授权请求再创建短期 Blob URL，离开预览释放 URL。费用只覆盖可核对的 Agent 运行估算；未知费用显示“待统计”。

## 已执行的验证与边界

2026-09-29 登录保护适配已通过生产构建和 Playwright mock API 检查，具体范围见下表。同日已重建三个应用镜像并启动完整 Compose，经 8088 真实 API 复验课程查询、会话数量限制、退出失效和失败冷却，fixture 试听审批链路也通过。浏览器收到模拟的 429、503、401 时会记录预期 HTTP 错误，历史视觉验收中的“控制台无错误”不适用于错误响应测试。真实浏览器会话淘汰与任务续跑仍未联调。

| 范围 | 已验证结果 |
| --- | --- |
| 当前前端代码 | `npm run build` 通过，包含 `vue-tsc --build` 和 Vite 生产构建；`git diff --check` 通过 |
| 登录保护交互（2026-09-29） | 本地 Vite 5179 + Playwright mock API：登录 429 倒计时、重复提交拦截、到期恢复、普通密码错误后修正及成功；注册 503 等待后成功；会话失效 401 清 Token 并返回登录页 |
| 课程交互（2026-09-29） | Playwright mock API：分页、全部筛选参数、错误后正确页码重试、空结果、404、401、320px 布局、深浅主题和咨询预填；另经隔离真实 Java/MySQL/Redis 验证列表、去空白搜索、字符串 ID 与元/天单位 |
| 首页和认证视觉（2026-09-26） | Playwright 检查桌面 1440×900、手机 390×844、窄屏 320×700，以及深色主题；首页进入 Agent 工作台、登录/注册切换、密码显示切换、确认密码不一致提示均正常；320px 无横向溢出，控制台无错误 |
| 网站真实入口（2026-09-26） | 当时 Compose 的 8088 Nginx 入口已加载知课行登录和首页；经真实登录进入 Agent 工作台，前端容器健康，浏览器控制台无错误或警告 |
| 完整 Compose 更新（2026-09-29） | 三个应用镜像重建，`app`、`observability` 健康启动；8088 真实 API 验证课程列表/搜索/详情、401/404、第 4 个会话淘汰最早 Token、退出后 401、密码失败冷却；直接抢课与 Agent fixture 审批落单成功，库存与订单账一致 |
| 课程浏览器实测（2026-09-29） | 真实 8088 注册→退出→重新登录→3 门课程→Python 搜索 1 项→4999 元详情→`/agent` 预填课程名和字符串 ID；咨询预填期间无 API 写请求，未创建会话或任务；页面错误、控制台错误与警告均为 0 |
| 试听 API 契约 | 前端方法、路径、请求体和状态字段已与当前 Java Controller/Service 对照；所有业务 ID 使用字符串 |
| 试听浏览器主流程 | Playwright mock API 中操作 OWNER 查看活动→直接抢课→查询确认订单→创建草稿→发布→暂停→只读对账；切 MEMBER 重载后创建入口隐藏，页面与控制台无错误 |
| 完整 Compose 业务链路 | 2026-09-25 Docker 中完整 `app`、`observability` Compose 启动；经 8088 Nginx 同源入口四次独立 fixture 烟测通过，真实 Redis Lua 预占、RocketMQ 事务消息、异步零元订单及 Agent 审批落单均成功 |
| 真实 API 浏览器操作 | Playwright 连接真实 Nginx/Java：注册合成账号，OWNER 创建并发布 2 名额活动、直接抢课获得订单；查看数据库/Redis 对账、刷新恢复本人记录及订单、暂停活动；控制台错误和警告均为 0 |
| 工作台其他交互 | SSE 分块/重连、Pinia 运行隔离、幂等提交、审批、文档预览、评测和移动端布局具备独立测试与交互路径；当前改动后未逐项复验，不计入本页已通过的试听烟测范围 |

课程 mock 复现脚本为 `output/playwright/course-catalog-setup.js`、`course-catalog-smoke.js`、`course-agent-smoke.js`；隔离真实服务脚本为 `course-live-smoke.js`，依赖已停止的临时服务及测试账号。完整 Compose 使用 `compose-course-smoke.js`，对应截图为 `compose-course-catalog.png`、`compose-course-agent.png`。

mock API 烟测证明页面交互和角色按钮展示；真实 API 的 OWNER 点击路径与完整 Compose 链路也已分别执行。后端隔离真实中间件测试 18/18 通过，其中 40 人竞争 8 个名额产生 8 笔订单、32 条拒绝；具体环境、命令及结果见 Java 仓库的[Docker 部署验证记录](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/deployment/Docker部署验证记录.md)和[试听模块验证记录](https://gitee.com/chy66666/zhikexing-backend/blob/master/docs/modules/免费试听秒杀验证记录.md)。本次 Agent 使用 fixture 模型；真实百炼模型效果、真实 API 下的 MEMBER 浏览器权限交互、浏览器内 Agent 审批、跨设备恢复和网络失败场景尚未计入已通过结果。

## 后续补充验收

1. 在真实 Compose 中分别以 MEMBER 和 OWNER 登录浏览器，检查服务端权限与按钮展示一致；MEMBER 直接抢课并查询本人结果，跨账号查询应被服务端拒绝。
2. 在另一浏览器或设备用同一账户登录，从“我的参与记录”恢复已确认订单，模拟断网和超时后沿原 `clientRequestId` 查询或重试。
3. 在浏览器中生成 `claim_trial` 草稿、人工批准，并核对审批回执、申请编号、本人记录和最终订单指向同一业务结果。
4. 配置真实百炼模型，评估课程选取、工具参数、知识引用和审批草稿质量；该验证需独立记录模型输入输出与判定标准。
