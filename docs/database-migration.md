# 数据库迁移交付

## 本次生成物

`drizzle/sqlite/0000_screenshot_video_initial.sql` 是新项目 SQLite/D1 的初始完整建表迁移，包含原模板表及 `screenshot_asset`、`screenshot_task`。当前仓库之前没有迁移历史，因此不能把它当作“只增加两个表”的升级补丁。

`pnpm.cmd test:migrations` 在独立临时 SQLite 数据库上运行迁移，检查必需表与外键，再重复运行以验证 journal 幂等；不会连接生产数据库。

## 开发环境

使用 `pnpm.cmd db:setup`、`pnpm.cmd db:push` 同步本地结构。本机 `db:push` 包装命令已经修复 Windows 命令入口问题，无需用 shell 拼接执行 Node 包。

## 新生产数据库

确认目标方言及 schema 后运行 `pnpm.cmd db:generate`，审阅该方言目录中的 SQL；按 AGENTS.md，应用生产迁移前须由用户审阅确认。当前仅生成并验证 SQLite 初始迁移，未对生产执行 `db:migrate`。

## 已存在的数据库

先核对该环境真实 schema、历史迁移及 journal。若曾使用 `db:push` 而没有迁移 journal，不得直接执行本次完整建表迁移，也不能盲目伪造 journal 跳过验证。

需要基于该数据库的已核实基线制定升级 SQL，仅添加尚不存在的表、索引和约束；测试备份恢复与升级后，再审阅确认并应用。目标环境尚未提供，因此这一项仍待生产验收。

## 多数据库目录

`drizzle.config.ts` 按方言输出 `drizzle/sqlite`、`drizzle/postgresql`、`drizzle/mysql` 或 `drizzle/turso`。Postgres/MySQL 的 schema 模板已经包含新表，但各自的迁移仍需在确认目标方言后生成，不能复用 SQLite SQL。

已有项目若原先在 `drizzle/` 根目录维护迁移，应先把完整且匹配的 SQL 与 `meta/` 历史迁移到目标方言目录并核对 journal，再生成后续迁移，不能混合不同数据库历史。
