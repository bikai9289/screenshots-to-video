# 截图视频维护

## 配置检查

执行 `pnpm.cmd screenshots:check-config`，只输出各配置是否存在，不输出密钥。存在不等于账户权限、余额或网络已验证；真实购买与出片还需分别测试。

## 离线任务恢复

预览：`pnpm.cmd screenshots:maintain`。

执行：`pnpm.cmd screenshots:maintain --apply`。

每轮处理最久未更新的 20 个 reserved/processing 任务，沿用原任务、原供应商请求体和幂等键。网络和查询错误不认定为生成失败；不新建用户任务、不购买、不增加扣次。恢复不确定提交可能向 SeeAPI 重放原创建请求，由供应商幂等处理。

该入口适用于受信任的部署任务调度或手工维护，不作为公开免鉴权 HTTP 接口。建议部署调度器每 2–5 分钟运行一次，避免多次启动堆积；单任务预留租约提供提交保护。设置运行超时并保留任务状态，超时后再查原任务。

## 过期素材

同一维护命令每轮尝试删除最多 50 个超过应用有效期的输入：先删除私有桶对象，成功后删除数据库记录，失败保留以便下次重试。仍被待确认或处理中任务引用的输入跳过。

桶应关闭公开访问，`screenshots/` 配置生命周期删除作为兜底。生命周期执行时间由存储商决定，不能把应用 24 小时过期说成所有副本即时物理删除。供应商已取得的数据受其保存规则约束。

## 结果与审计

维护输出仅包含任务/素材 ID、状态和机器错误码，不含截图内容、提示词、签名链接或密钥。退出码 1 表示至少一次操作失败，不表示该生成已终态失败。无人值守调度须监控失败退出与长期 pending 记录。

当前使用查询恢复；供应商 webhook 不处于已实现状态。若加入 webhook，先按供应商文档验证签名与重放窗口，再复用终态保护和归属校验，不能直接信任请求体中的成功状态。

# Worker scheduled maintenance

The existing Cloudflare `cloudflare:scheduled` hook now runs the same screenshot maintenance routine as the CLI, as well as the legacy AI jobs. A trigger alone was not sufficient in older releases: deploy this code before treating the screenshot maintenance schedule as enabled.

For the existing `0 16 * * *` UTC trigger, the run is at 00:00 Asia/Shanghai. Each run handles up to 20 pending tasks and 50 expired inputs. Worker bindings and a fresh database scope are initialized even if no HTTP request has reached that isolate.

Look for `Screenshot maintenance completed` and check `failed`, `retained`, and `deleted`. A query failure never settles a task as failed; assets referenced by unresolved tasks or malformed references are retained. Storage deletion must succeed before the metadata is removed. No error message alone proves provider failure or physical deletion.

Local CLI still defaults to preview: `pnpm screenshots:maintain`; apply with `pnpm screenshots:maintain --apply`. Validate recovery and deletion using controlled test data before relying on production cleanup.
