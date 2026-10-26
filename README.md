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
| 6 | **消费记账** | 记录金额、账单日、账单流水、每月刷卡任务 | **只记消费笔数**，不涉及任何金额与账单；账单接口与账单页整体移除；「月消费目标 ¥」改为「本月目标笔数」，月末提醒、日历事件同口径按笔数 |
| 7 | **持卡页排序** | 按名称/年费/还款/银行 | 新增「**年费未达标优先**」（默认）与「**按免息期长**」 |
| 8 | 请求体上限 | — | 超 20MB 在 Worker 层直接 413，不产生 DO 子请求 |
| 9 | **Access 集成** | 只建议「前置 Access」，但代码不认识它 —— Access 放行的请求和不放行的请求在应用看来一模一样 | 可选开启**信任模式**：自己验 `Cf-Access-Jwt-Assertion` 的 RS256 签名 + `aud` + `exp`，验过即登录，打开页面不再输令牌 |
| 10 | 会话与令牌绑定 | 换令牌踢不掉已登录设备 | 会话记录存令牌指纹，轮换 `AUTH_TOKEN` 后旧会话下一次请求即失效 |
| 11 | 公网入口 | 默认开着 `workers.dev` 与预览 URL（Access 覆盖不到） | 两者默认 `false`，preflight 检查 |

---

## 功能一览

- **卡种库**：内置常见银行的主力卡（年费、刷免规则、权益、下卡条件），可增删改、CSV 导入导出
- **我的持卡**：额度、账单日、还款日、年费日；自动算年费刷免进度与免息期天数
- **权益 / 票券 / 会员储值**：按周期（年/季/月）标记使用次数，剩余额度一眼看清
- **刷卡笔数**：只记录「某天刷了几笔」，用于判断消费笔数刷免是否达标
- **提醒**：年费临近、还款临近、权益到期、票券过期；Bark / 自定义 Webhook 推送，Cron **每天 09:00（北京时间）**跑一次
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

线上地址：<https://card.agaj.eu.org>

### 当前状态

| 项 | 值 |
|---|---|
| Worker | `guanka-cf`（账号 `f44f91bb44640d0565309ef3b8c0862e`） |
| 自定义域名 | `card.agaj.eu.org`，`custom_domain = true`，DNS 记录与证书由 wrangler 自动创建 |
| Git 自动部署 | 已连接 `agaj01/guanka-cf`，生产分支 `main` |
| 构建命令 | `npm ci` |
| 部署命令 | `npm run deploy:ci`（= preflight + 124 项冒烟 + `wrangler deploy`） |
| 定时触发 | 每天 **09:00（北京时间）= 01:00 UTC** 一次（提醒调度，一轮推完当天所有待提醒项） |
| AUTH_TOKEN | 存在 Worker 上（Secret）。CI 部署不会覆盖 secret，只有手动改才会变 |
| **Cloudflare Access** | 已启用。应用「管卡」（`14cfcfa9-d2cd-4cf8-bf9f-d8775f266131`），domain `card.agaj.eu.org`，**session 168h**，邮箱白名单 `Jinglei1@msn.com`，One-time PIN 登录 |
| Access 例外 | `card.agaj.eu.org/api/calendar.ics` 走 bypass（日历客户端过不了登录），由派生只读令牌把关 |
| 推送凭证 | `BARK_DEVICE_KEY` + `NOTIFY_BARK_URL` 存 Worker secret（与「油价优选」同一台自建 Bark server 与设备） |

改代码后 `git push` 即自动构建部署，构建日志在 Worker → **部署** 标签里。

### 方式一：连 GitHub 自动部署（已配置）

Cloudflare 的 Workers Builds 在每次 push 到 `main` 时自动构建并部署。首次配置只能走
Dashboard —— Workers Builds 的 API **只接受 user 级 token**，CLI 的 OAuth token 与
account 级 API Token 调用 `/accounts/{id}/builds/*` 均返回 `Authentication error` / `12006`。

在 Worker 详情页 **设置 → 构建** 里填的就是上表那两行。之后要改命令或换分支，
同一位置点「管理」即可。

**顺序很重要**：先让 Worker 存在并设好 `AUTH_TOKEN`，再连 Git。反过来也能用，
但第一次构建出来的 Worker 没有令牌，全站 403，得再去补一次 secret 并重新部署。

### 方式二：本地 CLI 部署

```bash
wrangler login
openssl rand -base64 32 | wrangler secret put AUTH_TOKEN   # secret 不能写进文件
npm run deploy
```

`npm run deploy` = `npm run preflight && wrangler deploy`。自检不通过会直接终止，不会把半成品推上线。
CLI 与 Workers Builds 部署的是同一个 Worker，可以混用（secrets 是 Worker 级、不会互相覆盖）。

### 前置

- Cloudflare 账号（免费版即可）
- Node.js 18+ 与 `wrangler`（`npm i -g wrangler`，或用 `npx wrangler`）
- 一个够强的令牌：`openssl rand -base64 32`


### 登录一次管多久

`AUTH_TOKEN` 就是**打开页面时输入的那个字符串**（不是 Cloudflare 账号密码，也不是 Access 的验证码）。

```bash
openssl rand -base64 32        # 生成一个，例如 Xk9mQp2vLxT4nRb7YwHc5JdF8sGa1Ve=
wrangler secret put AUTH_TOKEN # 粘贴进去，这就是你以后登录用的「密码」
```

| 时刻 | 发生什么 |
|---|---|
| 第一次打开页面 | 弹「需要访问令牌」，粘贴上面那个值 |
| 输错 5 次 | 该 IP 锁 60 秒，再错翻倍，封顶 1 小时 |
| 登录成功 | 服务端签发 32 字节随机会话 id 写进 `HttpOnly` Cookie；主令牌**不再**留在浏览器里 |
| 之后 30 天内 | 直接进入，无需再输（Cookie 绝对有效期 30 天，不因访问而延长） |
| 满 30 天 | 重新输一次 |
| 换了 `AUTH_TOKEN` | 所有设备的下一次请求立刻 401，全部重新登录 |

脚本/自动化不必走登录：请求头带 `Authorization: Bearer <AUTH_TOKEN>` 即可，权限等价于网页登录。
日历订阅用的是另一套派生令牌（界面里「日历订阅」处取），只能读日历、不能写。

**配了 Access 信任模式的话，上面这张表整段可以跳过**：请求带着 Access 签发的 JWT，
验签通过直接进，不再弹令牌框（详见后文「Access 信任模式」）。

本实例现在的实际体验（Access 已启用，session 168h）：

| 时刻 | 发生什么 |
|---|---|
| 第一次打开 | 跳 `agaj.cloudflareaccess.com` → 输 `Jinglei1@msn.com` → 收邮件验证码 → 进入（**不再输 AUTH_TOKEN**） |
| 之后 7 天 | 直接进，Access 的 `CF_Authorization` Cookie 有效期内不重复验证 |
| 满 168h | 再收一次验证码 |
| 应用层会话 | Access 验签通过后 Worker 再签一张 30 天的应用会话（`gk_sid`），两者叠加：Access 过期只影响 Access，应用会话仍在 |
| 名单外邮箱 | Access 直接拒，连 Worker 都到不了 |
| 退出 | 「登录设备 / 访问身份」弹窗里的退出按钮跳 `/cdn-cgi/access/logout`，届时两个会话一起失效 |

### 本地开发

```bash
# 本地密钥放 .dev.vars（已在 .gitignore 里）
echo 'AUTH_TOKEN=本地随便一个强随机串' > .dev.vars
npm run dev            # wrangler dev，默认 http://127.0.0.1:8787
```

本地 DO 数据落在 `.wrangler/state`，删掉即可重置。

### 自定义域名

已配置为 `card.agaj.eu.org`：

```toml
workers_dev = false
preview_urls = false
routes = [{ pattern = "card.agaj.eu.org", custom_domain = true }]
```

`custom_domain = true` 时 wrangler 会自己建 DNS 记录并签发证书，不需要手工加 CNAME。
域名必须在同一个 Cloudflare 账号下的 zone 里（这里用的是 `agaj.eu.org`）。
要换成别的域名，改这一行即可；`preflight` 会校验域名格式，也会在「关了 workers.dev
却没配域名」时直接报错——那种情况部署后会打不开。

**为什么默认关掉 workers.dev**：`*.workers.dev` 和预览 URL 属于 Cloudflare 自己的 zone，
**Access 无法为它们建应用**（Access 只能保护你账号下已有 zone 里的主机名）。
留着它们，等于在 Access 之外还有一扇不锁的门，前面做得再严也白搭。
`npm run preflight` 会专门检查这一项。

绑定自定义域名后建议再开一层 **Cloudflare Access**（邮箱白名单 + One-time PIN），
这样即使主令牌泄露，攻击者也进不来。想连令牌框都不用见，再按后文
「Access 信任模式」填上 `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD` 即可。

---

## 安全设计

```
浏览器 ──Cookie(gk_sid = 随机会话 id)──→ Worker ──→ DO ──→ 会话表校验
                        主令牌只出现在 POST /api/auth/login 的请求体里，一次即弃
```

| 机制 | 说明 |
|---|---|
| 会话与令牌分离 | Cookie 里只有随机 sid，`HttpOnly; Secure; SameSite=Lax`；不含任何可推导主令牌的信息 |
| 会话表 | 存 DO Storage，30 天**绝对**有效期（`lastSeen` 只用于展示，不延长寿命）；界面里能看到「登录设备」并逐个踢下线 |
| 会话绑定令牌 | 每条会话记录存签发时主令牌的 SHA-256 指纹；`wrangler secret put AUTH_TOKEN` 换值后，所有旧会话在下一次请求时即被删除 —— 否则「令牌泄露→轮换令牌」等于没做 |
| Access 断言 | 配了 `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD` 时，每次请求验 `Cf-Access-Jwt-Assertion` 的 RS256 签名 + `aud` + `exp`；无状态，不缓存「已放行」 |
| 主令牌不认 URL | `?token=<主令牌>` 一律 401 —— 避免进浏览器历史、Referer、CDN 日志 |
| 日历派生令牌 | `HMAC-SHA256(AUTH_TOKEN, 'guanka-calendar-v1')` 取前 32 字符；只能读 `/api/calendar.ics`，写操作 401 |
| 恒时比较 | 双 SHA-256 后逐字节异或累积，长度与内容差异都不走时间侧信道 |
| 登录限流 | 第 5 次失败起锁定 60s，之后每次翻倍，封顶 1h；计数持久化，重启不清零 |
| CSRF | Cookie `SameSite=Lax` + 写请求 `Origin/Referer` 同源校验（无来源头的脚本请求放行，靠会话鉴权） |
| 令牌强度 | < 24 字符、纯数字、单字符重复、含 `password/admin/guanka` 等弱片段、字符种类过少 → 拒绝 |
| 最小信息面 | `/api/health` 只回 `{ok:true}`，不暴露版本号 |
| 内部端点 | `/__cron/checks` 仅在 DO 内部存在，且要求 `x-gk-cron: 1`；Worker 只转发 `/api/*`，公网无法命中 |
| 请求体上限 | 20MB，Worker 层先拦（避免为超大请求建立 DO 子请求） |

### Access 能替代 AUTH_TOKEN 吗

不能，两者防的东西不一样：

| | Cloudflare Access | AUTH_TOKEN（应用层） |
|---|---|---|
| 身份粒度 | 邮箱 / IdP 账号 | 这一个人的库 |
| 保护对象 | 网络边界：谁能**到达** Worker | 应用边界：谁能**读数据**、会话怎么吊销 |
| 生命周期 | 边缘会话（默认 24h） | 30 天绝对有效期，可逐台下线 / 全部下线；换令牌即刻全失效 |
| 拦住谁 | 没有白名单邮箱的人 | 所有人 —— 包括绕过 Access 的那几条路 |

Access 盖不住的四个口子：

1. **`*.workers.dev` 与预览 URL** —— 不属于你的 zone，Access 建不了应用。这是最常见的翻车点，所以 `workers_dev` 默认关掉
2. **日历订阅** —— Google/Outlook 的服务器来拉 `/api/calendar.ics`，不可能过 OTP。这条路径只能靠应用层派生令牌
3. **脚本 / API** —— 用 `Authorization: Bearer` 调接口的客户端没有浏览器，走不了 One-time PIN
4. **Access 自己配错** —— 策略写成 `Everyone`、域名写错、应用被删，Worker 立刻变全公开，而应用层没有任何第二道闸

所以默认姿势是**两层都留**：Access 挡人，AUTH_TOKEN 挡路径并管理身份。

真要「只留 Access 也能安全」，前提是在应用层自己验 `Cf-Access-Jwt-Assertion` 签名 ——
否则无法区分"真的经过 Access"和"自己塞了个头的请求"。这件事本版做完了，见下一节。

### Access 信任模式（打开页面不再输令牌）

同时配置下面两个值即启用，缺一个就整体禁用（不会退化成「只看请求头有没有值」）：

```bash
# 团队域名：Access → Settings 页面可见，不要带 https://
# AUD：Access → Access → 你的应用 → Overview 里的 Application Audience (AUD) Tag
wrangler secret put ACCESS_TEAM_DOMAIN   # 例：yourteam.cloudflareaccess.com
wrangler secret put ACCESS_AUD           # 64 位十六进制

# 也可以写进 wrangler.toml 的 [vars]（这两个值不是机密，AUD 本来就写在每个 JWT 里）
```

**一键建应用**（推荐，省得手点后台）：

```bash
export CLOUDFLARE_API_TOKEN=xxx          # Access: Apps and Policies (Edit) + Organizations (Read)
export CLOUDFLARE_ACCOUNT_ID=f44f91bb44640d0565309ef3b8c0862e
export APP_DOMAIN=card.agaj.eu.org
export ACCESS_EMAILS="Jinglei1@msn.com"
npm run access                            # 建应用（session 168h）+ 邮箱白名单 + 写回 [vars]
npm run deploy                            # 让 vars 上线
```

脚本会：读 Zero Trust 组织拿 team domain → 找/建同域名应用并把 **session_duration 设成 168h**
→ 策略只 allow 名单内邮箱（One-time PIN 登录，邮箱收码即可）→ 把 `ACCESS_TEAM_DOMAIN` /
`ACCESS_AUD` 幂等写进 `wrangler.toml` 的 `[vars]`。加 `ACCESS_NO_WRITE=1` 只打印不写文件。

启用后浏览器请求带 `Cf-Access-Jwt-Assertion`，验签通过即视为已认证，**不再弹令牌框**；
`AUTH_TOKEN` 退化成纯 API / 日历订阅用途。

设计要点：**无状态**。每个请求都重新验签，应用侧不保存任何「Access 已放行」的凭证 ——
把人移出白名单后，CF 那边签不出新 JWT，下一次请求立刻失效，不存在「Access 撤了但应用还认」的窗口。

校验项（全部 fail closed）：

| 检查 | 为什么必须查 |
|---|---|
| `alg === 'RS256'` | 显式拒绝 `none` 与 `HS256` —— 后者是「拿公开的 JWKS 公钥当 HMAC 密钥自己签一个」的经典绕过 |
| `aud` 精确匹配 | 否则同团队**其他** Access 应用的合法 JWT 可以拿来登这个应用 |
| `iss === https://<team>` | 防跨团队重放 |
| `exp` / `nbf` / `iat` | 留 30s 时钟偏移；过期断言即使签名正确也拒 |
| JWKS 按 `kid` 取 | 未知 kid 视为可能的密钥轮换，强制重取一次；重取有 60s 最小间隔，防止随机 kid 刷爆 certs 端点 |

**纯 Access 模式**（不配 `AUTH_TOKEN`）是允许的，代价是日历订阅失效
（日历客户端带不了 JWT，只能靠派生令牌），脚本调用也失去 `Authorization: Bearer` 入口。
界面里「登录设备」会变成「访问身份」，显示 Access 校验出的邮箱，退出按钮跳 `/cdn-cgi/access/logout`。

排错看日志：

```
[管卡] Access 信任模式已启用：team=xxx.cloudflareaccess.com，aud=12345678…
[管卡] Access 断言校验失败：aud 不匹配（检查 ACCESS_AUD 是否为该应用的 Audience Tag）
[管卡] Access 配置不完整：ACCESS_TEAM_DOMAIN 与 ACCESS_AUD 必须同时设置，当前已忽略
```

失败告警有 60s 节流，不会因为被刷而灌满日志。

---

## 推送通道：凭证放 Worker secret，不放页面

四个通道（WxPusher / Server酱³ / Bark / 企业微信）都可以用 secret 托管凭证，
页面上留空即可 —— 凭证**不会下发到浏览器**，也不会被写进 DO 存储
（`stripEnvCredentials()` 在保存前剥掉所有「值等于 env 值」的凭证字段）。

| 通道 | secret 名 | 说明 |
|---|---|---|
| Bark | `BARK_DEVICE_KEY` | 设备 key；**配了它通道自动启用**，不用先在页面上打开开关 |
| Bark | `NOTIFY_BARK_URL` | 自建 server 地址（含路径前缀也行，如 `https://bark.example.com/pfx`），配了它就不做 SSRF 校验 |
| WxPusher | `WXPUSHER_APP_TOKEN` / `WXPUSHER_UIDS` | |
| Server酱³ | `SERVERCHAN_SENDKEY` | |
| 企业微信 | `WECOM_WEBHOOK_KEY` | |

```bash
# 与「油价优选」共用同一台自建 Bark server 和设备
printf '%s' '<deviceKey>'      | wrangler secret put BARK_DEVICE_KEY
printf '%s' 'https://agaj.de5.net/xxxxxx' | wrangler secret put NOTIFY_BARK_URL
wrangler secret list           # 应能看到 AUTH_TOKEN / BARK_DEVICE_KEY / NOTIFY_BARK_URL
```

行为细节：

- 推送走 Bark 标准 `POST {NOTIFY_BARK_URL}/push`，body 里带 `device_key`、`group`（默认「管卡」）、`isArchive=1`
- 页面自己填了 `deviceKey` 时以页面为准，可以显式关掉开关，不被 secret 覆盖
- 想要「改了 secret 立刻生效」不需要重新部署：secret 更新即产生新版本，代码不变
- 提醒是否真的发出去，看「提醒设置 → 最近推送记录」，每条记录带各通道的 ✓/✗ 与失败原因

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
│   ├── auth.js            # 恒时比较 / 会话 Cookie / 日历派生令牌 / 令牌指纹
│   ├── access.js          # Cloudflare Access JWT 验签（RS256 + JWKS 缓存）
│   ├── token-rules.js     # 令牌强度规则（纯函数，自检与运行期共用）
│   ├── store.js           # 内存缓存 + DO Storage 持久化
│   └── time.js            # nowBJ（UTC+8 锚定，前端不依赖本地时区）
├── biz/                   # 业务层（源自上游，仅做平台适配补丁）
│   ├── routes.js  dates.js  util.js  assets.js  seed.js
│   ├── reminder.js  ics.js  notifier.js  auth.js
├── public/                # 前端 SPA（无框架、无构建）
├── scripts/               # preflight.js / check-token.js
└── test/                  # smoke.js（116 项）/ repro-store.js
```

**关于 `biz/`**：这是把上游 `server/*.js` 打补丁后固化的结果，补丁只有三类 ——
`new Date()` → `NOW()`、`process.env.X` → `(ENV && ENV.X)`、删掉账单模块。
好处是业务逻辑随时能和上游对比，坏处是**不要把上游的新功能直接 `git merge` 进来**，需要重新走一遍补丁。

---

## 脚本

```bash
npm test                 # 116 项冒烟测试（业务层 + 定制点防回归）
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
个人用完全够。DO 只在有请求时被唤醒，Cron 每天一次，一天 1 次，远低于免费额度。

**为什么健康检查没有版本号？**
减少指纹暴露。版本号写在前端常量 `APP_VERSION` 里。

---

## 许可

MIT，见 [LICENSE](LICENSE)。上游版权归 `credit-card-manager` 贡献者所有。
