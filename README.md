# 管卡 CF · 信用卡年费与权益管家

一个跑在 **Cloudflare Workers** 上的信用卡管理工具：维护卡种库、记录持卡、判断年费是否刷免、跟踪权益使用与到期提醒。
没有服务器、没有数据库、没有运行时依赖 —— 一条 `wrangler deploy` 就能上线，免费额度足够个人长期使用。

> **本仓库的由来**
> 衍生自 [`folkson/credit-card-manager-docker`](https://github.com/folkson/credit-card-manager-docker) 里的 `cloudflare/` 版本。
> 上游同时维护 Docker 版与 Workers 版，本仓库**只保留 Workers 版**，并做了下面这些改造。
> 业务逻辑（卡种库、年费规则、权益/票券/储值、提醒、日历订阅）来自上游，版权与许可见 [LICENSE](LICENSE)。

---

## 相对上游的改动

| # | 主题 | 上游 | 本版 |
|---|---|---|---|
| 1 | **会话凭证** | Cookie 直接存放主令牌，泄露即等于交出整个库 | 登录签发 32 字节随机**不透明会话 id**，主令牌永不下发浏览器；会话表存 DO Storage，可单台吊销、可全部下线 |
| 2 | **日历订阅** | 订阅 URL 里带主令牌，一旦被日历服务/日志记录就等于泄露 | 改用 `HMAC-SHA256(AUTH_TOKEN, 固定标签)` 派生**只读令牌**，仅 `/api/calendar.ics` 接受；轮换主令牌即吊销 |
| 3 | **令牌强度** | preflight 只 grep `wrangler.toml` 里有没有 `AUTH_TOKEN` 字样（连注释都算命中），设成 `1210` 也照样打印「可以 deploy」 | preflight 做真实结构自检；`scripts/check-token.js` 独立体检；运行期日志告警 + 登录后界面提示条 |
| 4 | **登录限流** | 固定 5 次/60 秒，计数存在内存，Worker 重启即清零 | 指数退避（60s 起，每次翻倍，上限 1h）并**持久化到 DO Storage**，重启不清零 |
| 5 | **部署形态** | 仓库同时含 Docker 版与 Workers 版 | 仅 Workers 版，目录结构直接对齐 `wrangler.toml` |
| 6 | **消费记账** | 记录金额、账单日、账单流水、每月刷卡任务 | **只记消费笔数**，不涉及任何金额与账单；账单接口与账单页整体移除 |
| 7 | **持卡页排序** | 按名称/年费/还款/银行 | 新增「**年费未达标优先**」（默认）与「**按免息期长**」 |
| 8 | 请求体上限 | — | 超 20MB 在 Worker 层直接 413，不产生 DO 子请求 |

---

## 功能一览

- **卡种库**：内置常见银行的主力卡（年费、刷免规则、权益、下卡条件），可增删改、CSV 导入导出
- **我的持卡**：额度、账单日、还款日、年费日；自动算年费刷免进度与免息期天数
- **权益 / 票券 / 会员储值**：按周期（年/季/月）标记使用次数，剩余额度一眼看清
- **刷卡笔数**：只记录「某天刷了几笔」，用于判断消费笔数刷免是否达标
- **提醒**：年费临近、还款临近、权益到期、票券过期；Bark / 自定义 Webhook 推送，Cron 每 10 分钟心跳
- **日历订阅**：`webcal://` 订阅到系统日历，到期日自动出现在日程里
- **备份 / 恢复**：整库 JSON 备份，可导入导出、可云同步
- **知识库**：记卡组织规则、活动细则等长期笔记

---

## 为什么需要 Durable Object

| 方案 | 问题 |
|---|---|
| Workers + KV | 最终一致（可能读到 60 秒前的旧值），「连点开关写 settings」会丢更新 |
| Workers + D1 | 业务层是「整段数组读改写」模型，改 SQL 要重写全部写入点 |
| **Workers + DO（本方案）** | 强一致 + 单请求串行，语义等价于上游 Node 单线程；业务层几乎零改动 |

一个 DO 实例（`guanka-singleton`）持有全部业务状态**和会话表**，读-改-写之间没有并发让出点。

---

## 部署

### 前置

- Cloudflare 账号（免费版即可）
- Node.js 18+ 与 `wrangler`（`npm i -g wrangler`，或用 `npx wrangler`）
- 一个够强的令牌：`openssl rand -base64 32`

### 三步上线

```bash
wrangler login

# 1. 设置访问令牌（这是 secret，不要写进任何文件）
openssl rand -base64 32 | wrangler secret put AUTH_TOKEN

# 2. 部署（会先跑一遍自检 + 76 项冒烟测试）
npm run deploy
```

`npm run deploy` = `npm run preflight && wrangler deploy`。自检不通过会直接终止，不会把半成品推上线。

首次访问会要求输入令牌；登录后进入持卡页。

### 本地开发

```bash
# 本地密钥放 .dev.vars（已在 .gitignore 里）
echo 'AUTH_TOKEN=本地随便一个强随机串' > .dev.vars
npm run dev            # wrangler dev，默认 http://127.0.0.1:8787
```

本地 DO 数据落在 `.wrangler/state`，删掉即可重置。

### 绑定自有域名

在 `wrangler.toml` 里加：

```toml
routes = [{ pattern = "cards.example.com", custom_domain = true }]
```

域名必须在同一个 Cloudflare 账号下。绑定自定义域名后建议再开一层 **Cloudflare Access**（邮箱白名单 + One-time PIN），
这样即使令牌泄露，攻击者也进不来。

---

## 安全设计

```
浏览器 ──Cookie(gk_sid = 随机会话 id)──→ Worker ──→ DO ──→ 会话表校验
                        主令牌只出现在 POST /api/auth/login 的请求体里，一次即弃
```

| 机制 | 说明 |
|---|---|
| 会话与令牌分离 | Cookie 里只有随机 sid，`HttpOnly; Secure; SameSite=Lax`；不含任何可推导主令牌的信息 |
| 会话表 | 存 DO Storage，30 天绝对有效期 + 活跃滑动续期；界面里能看到「登录设备」并逐个踢下线 |
| 主令牌不认 URL | `?token=<主令牌>` 一律 401 —— 避免进浏览器历史、Referer、CDN 日志 |
| 日历派生令牌 | `HMAC-SHA256(AUTH_TOKEN, 'guanka-calendar-v1')` 取前 32 字符；只能读 `/api/calendar.ics`，写操作 401 |
| 恒时比较 | 双 SHA-256 后逐字节异或累积，长度与内容差异都不走时间侧信道 |
| 登录限流 | 第 5 次失败起锁定 60s，之后每次翻倍，封顶 1h；计数持久化，重启不清零 |
| CSRF | Cookie `SameSite=Lax` + 写请求 `Origin/Referer` 同源校验（无来源头的脚本请求放行，靠会话鉴权） |
| 令牌强度 | < 24 字符、纯数字、单字符重复、含 `password/admin/guanka` 等弱片段、字符种类过少 → 拒绝 |
| 最小信息面 | `/api/health` 只回 `{ok:true}`，不暴露版本号 |
| 内部端点 | `/__cron/checks` 仅在 DO 内部存在，且要求 `x-gk-cron: 1`；Worker 只转发 `/api/*`，公网无法命中 |
| 请求体上限 | 20MB，Worker 层先拦（避免为超大请求建立 DO 子请求） |

---

## 「只记笔数」的数据模型

很多银行的年费刷免条件是「**刷满 N 笔**」，与金额无关。本版按这个前提做了简化：

```js
// 唯一的消费记录形态
{ id, myCardId, type: 'count', date: '2026-10-26', count: 2, createdAt }
```

- 抽屉里只填「日期 + 笔数」，没有金额、没有商户、没有账单
- 年费窗口 = 自**上一个年费日**起算，窗口内累计 `count` 即 `cardYearCount`
- 达标判定 `waiver.achieved = cardYearCount >= waiverCondition`（笔数型刷免）
- 只记笔数无法判断「金额型刷免 / 积分抵扣」，这类卡在界面上提供 **人工确认开关**（`manualWaiver`），自己勾「已达标」

**旧备份兼容**：导入上游版本的备份时，`bills` 数据集与 `type !== 'count'` 的金额型消费会被静默丢弃，其余数据正常恢复。
后端已无任何账单接口（`/api/bills` 返回 404），数据集中也不再包含 `bills`。

---

## 持卡页排序

| 排序项 | 规则 |
|---|---|
| **年费未达标优先**（默认） | ① `waiver.needsPayment === true` 的卡在前 ② 同层内按**免息期天数降序** ③ 再按年费日临近 |
| **按免息期长** | 免息期天数降序 |
| 按名称 / 年费临近 / 还款临近 / 银行 | 与上游一致 |

免息期 = 账单日到对应到期日的天数（`computeMyCard().interestFreeDays`），列表行尾会显示 `· 免息 N 天`。

筛选器也从「有未还账单」换成了「**年费未达标**」——与只记笔数的模型一致。

---

## 目录结构

```
.
├── wrangler.toml          # Worker + DO + Assets + Cron
├── src/                   # 平台层（Cloudflare 相关）
│   ├── worker.js          # 入口：/api/* → DO，其余 → Assets；scheduled → 提醒
│   ├── do.js              # Durable Object：唯一身份判定点 + 请求分发
│   ├── session.js         # 会话表 + 指数退避限流（持久化）
│   ├── auth.js            # 恒时比较 / 会话 Cookie / 日历派生令牌
│   ├── token-rules.js     # 令牌强度规则（纯函数，自检与运行期共用）
│   ├── store.js           # 内存缓存 + DO Storage 持久化
│   └── time.js            # nowBJ（UTC+8 锚定，前端不依赖本地时区）
├── biz/                   # 业务层（源自上游，仅做平台适配补丁）
│   ├── routes.js  dates.js  util.js  assets.js  seed.js
│   ├── reminder.js  ics.js  notifier.js  auth.js
├── public/                # 前端 SPA（无框架、无构建）
├── scripts/               # preflight.js / check-token.js
└── test/                  # smoke.js（76 项）/ repro-store.js
```

**关于 `biz/`**：这是把上游 `server/*.js` 打补丁后固化的结果，补丁只有三类 ——
`new Date()` → `NOW()`、`process.env.X` → `(ENV && ENV.X)`、删掉账单模块。
好处是业务逻辑随时能和上游对比，坏处是**不要把上游的新功能直接 `git merge` 进来**，需要重新走一遍补丁。

---

## 脚本

```bash
npm test                 # 76 项冒烟测试（业务层 + 定制点防回归）
npm run preflight        # 部署前自检：配置结构 / 关键文件 / 冒烟 / 令牌提示
npm run check-token      # 令牌强度体检

node scripts/check-token.js '你的令牌'
echo -n '你的令牌' | node scripts/check-token.js
```

`check-token.js` 退出码 0 = 合格，1 = 不合格，可直接串进 CI。

---

## 常见问题

**忘了令牌怎么办？**
`wrangler secret put AUTH_TOKEN` 重设一个新值即可。重设会同时吊销所有现存会话与旧的日历订阅令牌 —— 需要重新登录、重新订阅日历。

**数据存在哪？**
Durable Object Storage，跟着 Worker 走。`wrangler deploy` 不会清数据，删除 Worker 才会。建议定期用界面右上角「备份」导出一份 JSON。

**能多设备同时用吗？**
可以。每台设备一条独立会话，互不影响，界面里可单独踢掉某台。

**免费的 Workers 额度够吗？**
个人用完全够。DO 只在有请求时被唤醒，Cron 每 10 分钟一次心跳，一天 144 次，远低于免费额度。

**为什么健康检查没有版本号？**
减少指纹暴露。版本号写在前端常量 `APP_VERSION` 里。

---

## 许可

MIT，见 [LICENSE](LICENSE)。上游版权归 `credit-card-manager` 贡献者所有。
