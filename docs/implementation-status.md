# 实现状态与继续验收

日期：2026-11-03。目标仍是完成 `docs/` 中的完整开发与上线验证，不以首页完成代替整个项目完成。

## 已落地代码

- 第一版 UI 迁移为正式 React 首页，模块、配色和标题保留；双语消息、折叠 FAQ、播放进度、放大、键盘 Tabs 和手机菜单。
- SSR 核心内容与页面 metadata，移除模板零元 Offer、首页重复 canonical、禁止缩放及无效搜索入口。
- 按次商品和定价页：9.90/1、19.90/3、29.90/5 美元；来源为用户已确认方案。无免费生成，赠送通用积分不授权制作。
- `/studio` 制作页：截图校验、排序、画幅和时长、浏览器草稿、幂等请求恢复、任务查询与下载。
- SeeAPI 官方 `/v1/generations` 适配，参考图片模式、720p、5/10/15 秒；模型输出不作保真承诺。
- 私有截图上传和限时签名读取；任务归属、按订单预留次数、并发保护、失败释放、未知结果保留查询。
- 来源分类与账户事件，保留未知来源，不将 direct 自动视为 GPT；现有匿名分析系统仍需部署配置。
- 联系入口、新产品政策、sitemap 和 llms 内容清理，以及接口契约 `screenshots-api.md`。
- 新增 `pnpm screenshots:maintain` 维护入口，默认仅预览；`--apply` 恢复离线任务并清理可安全删除的过期输入。操作与调度要求见 `screenshots-operations.md`。
- Windows `db:push` / `db:generate` 命令入口已修复；生成 SQLite 初始完整迁移并在隔离数据库验证首次应用、外键及重复应用。现有数据库不能直接应用该建表基线，详见 `database-migration.md`。

## 已取得的验证证据

- 第一阶段首页浏览器测试：8 项通过；含 360、390、768、1440、1920px 布局、交互和双语初始 HTML。
- SSR 专项：禁用 JS 阅读、唯一 metadata、hydration 无错误，共 2 项通过。
- 单元测试最新完整批次：11 个文件、78 项通过，包含付费次数并发、使用后退款阻止及新商品的金额/币种与并发结算。
- 生产构建已成功；构建仍报告模板依赖中的 Zod 导出和 PayPal 重复分支警告，需结合真实登录支付验证。
- 最终生产构建后的浏览器串行复验：14 项全部通过，包含首页多尺寸、双语 SSR、唯一 metadata、无 hydration 错误、工作台草稿恢复、丢失响应后幂等重试、未登录鉴权与旧免费生成旁路关闭。
- 本轮维护预览执行成功，当前本地数据库没有待恢复任务或过期输入；因此未执行真实恢复或删除。供应商、上传及次数相关的 15 项测试重新运行通过。
- 补充本地 D1 实测：通用原子场景 11 项、截图产品订单/次数场景 6 项全部通过；`pnpm test:payments` 的 10 项支付与兼容回归通过。D1 使用隔离本地测试配置，不需要生产账户或部署。
- 支付兼容修改后的再次验证：全项目 TypeScript 检查通过，生产构建通过，串行单元测试 11 个文件/78 项通过。预览服务已用新构建启动在 3001；本轮配置检查仍全部为缺失。
- 追加真实本地认证验收：`pnpm test:auth:real` 使用新建隔离数据库和实际生产构建，注册、会话、未付费上传拒绝、工作台零余额、退出、合法登录全部通过。其失败测试复现了任意 Origin 被信任的问题，已收紧为同源或显式允许来源，并确认不可信来源返回 403。未调用 SeeAPI、Stripe 或外部存储。

以上为阶段记录，最终完成前必须重新跑全套检查，不能引用旧结果代替新验证。

## 配置方式（2026-11-03 更新）

Admin → Settings 面板已移除；SeeAPI / Stripe / R2 等密钥与启用开关**只通过环境变量或 `wrangler secret put` 配置**。`getAllConfigs()` 合并规则：非空 env 覆盖 DB，DB 不能覆盖已设置的 env。

## 生产配置快照（2026-11-04，Asia/Shanghai）

线上：`https://screenshotstovideo.com`（Worker `screenshots-to-video`，D1 + 双 R2 绑定）。

### DONE（核心截图→视频配置）

- Cloudflare OAuth 登录；自定义域名 apex + www 已绑 Worker。
- Secrets（仅列名）：`AUTH_SECRET`、`CONFIG_ENCRYPTION_KEY`、`SEEAPI_API_KEY`、`R2_ACCESS_KEY`、`R2_SECRET_KEY`、`R2_ACCOUNT_ID`、`R2_ENDPOINT`、`R2_BUCKET_NAME`、`R2_UPLOAD_PATH`、`SCREENSHOTS_STORAGE_BUCKET`、`STORAGE_*` 别名、`STRIPE_SECRET_KEY`、`STRIPE_PUBLISHABLE_KEY`、`STRIPE_SIGNING_SECRET`。
- Wrangler vars：`STRIPE_ENABLED=true`、`DATABASE_PROVIDER=d1`、`VITE_APP_URL=https://screenshotstovideo.com`、`AUTH_TRUSTED_ORIGINS`（www + workers.dev；apex 由 `VITE_APP_URL` 进入 trustedOrigins）。
- `/api/config/public`：`stripe_enabled=true`、`screenshots_purchase_available=true`（表示 SeeAPI + 私有 R2 就绪判定已通过，且 Stripe secret 存在）。
- Stripe **Test mode** webhook：`https://screenshotstovideo.com/api/payment/notify/stripe`（enabled）。
- 截图商品目录在代码内（`screenshot_video_single/three/five`，$9.90/$19.90/$29.90），无需 D1 seed。
- 超级管理员：`bikai9289@gmail.com` → `super_admin`。
- Admin Settings UI 已禁用（`/admin/settings` 只读说明页）。

### 说明（非阻塞）

- `active_ai_provider=kie` 仅为模板 AI 图/视频页默认值；**截图→视频走 SeeAPI**（`src/core/ai/seeapi.ts`），与 kie 无关。
- `R2_DOMAIN` / `STORAGE_PUBLIC_DOMAIN` 为空：私有截图用 S3 签名 URL，**核心出片不依赖公开域名**；公开桶仅服务模板通用媒体上传（头像等）。
- Cron 维护任务因 Workers Free 触发器上限关闭（`triggers.crons=[]`）；需 Paid 或腾出名额后再开 `screenshots:maintain` 调度。
- D1 `config` 表为空（全靠 env/secrets）；订单/截图任务计数目前为 0（尚未跑真实付费出片）。

### MISSING / 待人工验收（阻塞「验收完成」而非阻塞配置）

- 真实 Stripe **测试卡**购买 → 次数入账 → `/studio` 上传 → SeeAPI 出片 → 下载（端到端）。
- SeeAPI 账户侧：模型权限与余额（本机 egress 可能被 Cloudflare 1010，以 Worker 出片为准）。
- 维护脚本生产调度与真实恢复/删除验收。
- Resend / 邮箱验证 / 密码重置（可选）。
- 公开 R2 自定义域名（可选；绑域需 DNS，当前未设）。
- GPT 公网抓取与增长验证（见 `growth-validation-plan.md`）。

## 未完成，不可略过

- 真实供应商配置后重新进行端到端测试；浏览器接口模拟仅证明界面与请求行为，不证明供应商已出片。
- 已恢复旧结算接口 `settleCheckoutOrder`。`pnpm test:payments` 最新一轮 10 项全部通过，包含金额拒绝、正确结算、迟到失败、重复 checkout、已有订阅编号复用、重复续费及 Windows 测试清理；此前 EBUSY 已补齐连接关闭与测试端 GC。
- 新截图商品和旧保存订单结算使用原子写入；订阅续费也已改为 `atomic()` 与账期 guard。SQLite 原子测试 11 项、本地 D1 原子测试 11 项均通过；另补已有订阅编号复用的兼容回归。
- 维护脚本已经实现，尚需生产调度与真实恢复、删除验收；供应商 webhook 尚未实现，当前使用查询恢复。
- 真实支付与生成端到端验证；生产数据库迁移审阅与部署。
- 生产迁移仍需要目标数据库与既有 schema/journal 证据；当前生成物仅证明新 SQLite 数据库可初始化，不代表现有生产库可安全升级。
- 用户授权的公网 GPT 抓取、推荐诊断及多模型问题库/竞品测试。
- 零外链观察需上线后的七个完整自然日，尚未开始，不能提前宣布完成。

当前开发服务器：`http://127.0.0.1:3000/`，生产预览：`http://127.0.0.1:3001/`。以后继续时先确认现有进程和端口，不能仅凭本文认定服务器仍在运行。
