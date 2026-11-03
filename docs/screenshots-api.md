# 截图视频接口契约

日期：2026-11-03。本契约面向本站 `/api/screenshots/*`，不改动旧接口的通用 code=-1 语义。

## 已批准规则

- 用户已确认 SeeAPI 官方平台 `api.seeapi.com`，不是 cgcm 接口。
- 商品：USD 9.90/1 次、19.90/3 次、29.90/5 次，一次性购买；未使用次数不过期，失败任务不占次数。
- 视频权利来自本站指定商品的已支付订单；注册赠送积分和旧模板商品不能授权生成。
- 默认模型为 `seedance-2-fast` 的 `reference-to-video`，720p、无音频、5/10/15 秒、16:9/9:16/1:1。模型可用性及实际成片须用配置后的真实账户验证。
- 生成模型可能改变截图文字与细节，不作逐像素保真承诺。查看结果后再用于正式发布。

供应商契约依据：[创建参考视频](https://www.seeapi.com/docs/seedance-2-fast/reference-to-video/)、[任务查询](https://www.seeapi.com/docs/get-task-detail/)，2026-11-03 查阅。供应商不可读取 localhost，真实生成需要公网可读的限时签名素材链接。

## 通用规则

所有业务接口验证会话及归属，先按 IP、再按用户限流。响应不缓存。成功 `{code:0,message:"ok",data:...}`；失败 `{code:<专属数字>,message:<简短提示>,data:{errorKey:<稳定机器码>}}`，HTTP 状态与错误表一致。前端将 errorKey 映射为双语消息，不展示供应商原始响应。

## 接口

### GET /api/screenshots/account

无请求参数。返回 `remainingRenders:number`、`serviceAvailable:boolean`、`limits`、`tasks:PublicScreenshotTask[]`。任务仅为当前用户最近记录，不返回别人的素材或供应商密钥。

### POST /api/screenshots/assets

Multipart 表单，必选 `files`，1–4 张；单张不超过 5 MiB，合计不超过 20 MiB。不接受额外文件类型、空文件或声明为图片的非图片数据。

服务端检查真实 PNG/JPEG/WebP 格式与尺寸：宽高都在 301–5999 像素，宽高比严格大于 0.4 且小于 2.5。禁止 SVG。校验全部通过后才开始存储。

上传前检查已支付且有可用次数。返回 `assets:[{id:string,width:number,height:number,mimeType:string,byteSize:number,expiresAt:string}]`。不返回永久公开截图 URL。私有素材签名读取链接仅发送给生成供应商。

### POST /api/screenshots/tasks

JSON 字段：

| 字段 | 类型 | 必选/默认 | 约束 |
| --- | --- | --- | --- |
| idempotencyKey | string | 必选 | 8–128 位字母、数字、下划线或连字符，同一逻辑请求保持不变 |
| assetIds | string[] | 必选 | 1–4 个，非重复，必须属于当前用户且未过期，顺序即展示顺序 |
| prompt | string | 可选，空串 | trim 后最多 2000 字符；不是任意代码 |
| duration | number | 必选 | 5、10、15，拒绝字符串和其他数字 |
| aspectRatio | string | 必选 | 16:9、9:16、1:1 |

禁止客户端传入价格、次数、供应商、模型、外部图片 URL 等未知字段。返回当前 `PublicScreenshotTask`。

同一用户同 key 同输入返回原任务；同 key 不同输入返回 409。同 key 不因网络超时而改成新 key。真正失败后再次制作是新任务，使用新 key。

### GET /api/screenshots/tasks/{id}

`id` 为本站任务 ID，必选，不是供应商任务 ID。返回当前用户的任务；不存在及他人任务都返回 404。

未确定提交结果时使用原 key 和已持久化的相同供应商参数恢复提交；不能重新签名后改变请求体。处理中的查询失败不等于生成失败，不能据此返还次数。达到前端等待上限后仍保留任务，用户可稍后查看。

### GET /api/screenshots/tasks/{id}/download

仅成功任务且归属正确时可用。跳转到供应商返回的 HTTPS 视频地址供下载；未完成任务返回 409，不能通过此接口代理任意外部 URL。生成链接受供应商保存政策影响，不承诺永久托管；用户应下载保存。

### PublicScreenshotTask

`id:string`、`status:reserved|processing|success|failed`、`duration:number`、`aspectRatio:string`、`createdAt:ISO string`、`errorCode:稳定机器码|null`、`videoUrl:HTTPS string|null`。视频地址只对已登录的所属用户返回。所有字段始终存在。

## 状态、占用与错误

`reserved → processing → success/failed`；供应商创建直接返回终态时可从 reserved 直接进入终态。reserved、processing、success 占一个购买次数，failed 不占；预留、核对订单状态和创建任务必须在同一次 `atomic()` 中完成。每次失败条件更新最多执行一次，不能把成功任务回退为失败。

HTTP 查询失败、网络超时、成功但缺失视频等不明确结果保持待核实，不自动释放购买次数。页面提示查看原任务，不引导重复购买。

| errorKey | code | HTTP | 场景 |
| --- | --- | --- | --- |
| UNAUTHORIZED | 4101 | 401 | 无有效会话 |
| INVALID_REQUEST | 4102 | 400 | JSON、字段、类型、枚举、空输入、重复图片不合法 |
| PAID_ACCESS_REQUIRED | 4103 | 402 | 无对应已付订单、剩余次数不足、退款订单 |
| NOT_FOUND | 4104 | 404 | 不存在或越权访问 |
| ASSET_EXPIRED | 4105 | 410 | 素材已过期 |
| IDEMPOTENCY_CONFLICT | 4106 | 409 | 同 key 不同输入，或未完成任务请求下载 |
| UPLOAD_LIMIT | 4107 | 413 | 文件数、单文件或总字节超限 |
| INVALID_IMAGE | 4108 | 415 | 类型、真实内容不合法 |
| IMAGE_DIMENSIONS | 4109 | 422 | 图片尺寸或比例超限 |
| RATE_LIMIT | 4110 | 429 | 请求过快；返回 Retry-After |
| SERVICE_UNAVAILABLE | 4111 | 503 | SeeAPI、私有存储或支付未准备好 |
| GENERATION_FAILED | 4112 | 422 | 明确的供应商终态失败；查询成功响应可在 data.errorCode 表示 |
| PROVIDER_RETRY | 4113 | 503 | 状态未知需重查；查询成功响应可在 data.errorCode 表示 |
| INTERNAL_ERROR | 4114 | 500 | 未分类内部故障，不泄露原始异常 |

## 验收

覆盖订单状态、赠送积分绕过、并发最后一次额度、同 key 重放与冲突、越权、全部上传边界、失败释放、终态不可回退、供应商创建超时恢复、查询失败不返还、下载鉴权、支付金额核对。SeeAPI 与支付真实验收需对应账户及测试配置，单元测试不能替代。
