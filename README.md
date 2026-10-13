# 管卡 — 信用卡管理工具（Docker 版）

仿「管卡 v2.4.5」制作的同款软件，运行在 Docker 容器中。维护「卡种数据库」（常见卡的重要信息），
记录「我的持卡」（年费、消费、权益使用），自动判断年费是否达标、即将到期提醒。
数据保存在 Docker 卷中，重启、升级不丢失；不依赖公网，可完全离线运行。

## 快速开始

```bash
# 在本目录执行（需要 Docker 20+，自带 compose 插件）
docker compose up -d

# 浏览器打开
http://localhost:3000
```

常用命令：

```bash
docker compose logs -f          # 看日志
docker compose restart          # 重启
docker compose down             # 停止（数据保留在卷里）
docker compose down -v          # 停止并删除数据卷（慎用！）
docker compose up -d --build    # 改代码后重新构建
```

不用 compose 也可以：

```bash
docker build -t credit-card-manager:1.0.0 .
docker run -d --name credit-card-manager -p 3000:3000 -v guanka-data:/app/data --restart unless-stopped credit-card-manager:1.0.0
```

首次启动自动写入内置卡种库（83 张常见卡 / 15 家银行，示例数据），无需任何配置。

## 直接使用 Docker Hub 镜像（免构建）

镜像由 GitHub Actions 自动构建并推送（amd64 + arm64 双架构，群晖等 ARM 机型可直接拉取）：

```bash
# 拉取并运行（把 <你的DockerHub用户名> 换成实际账号，如 folkson）
docker run -d --name credit-card-manager \
  -p 3000:3000 \
  -v guanka-data:/app/data \
  --restart unless-stopped \
  <你的DockerHub用户名>/credit-card-manager:latest

# 浏览器打开
http://localhost:3000
```

群晖 NAS（Container Manager）等场景同样适用——arm64 与 amd64 架构会自动选择对应层。

### 发布新版本镜像

```bash
git tag v1.0.1 && git push origin v1.0.1
```

打 tag 推送后 CI 自动构建并推送 `1.0.1` / `1.0` / `1` / `latest` 四个标签；
也可在 GitHub Actions 页面对 `Build & Push Docker Hub` 手动 Run workflow（构建 `latest`）。

> 仓库 Secrets 需配置 `DOCKERHUB_USERNAME`（Docker Hub 用户名）与 `DOCKERHUB_TOKEN`
> （Docker Hub → Account Settings → Personal access tokens 生成的 Access Token，建议只给 Read/Write 权限）。

## 功能一览（与原版对照）

| 模块 | 功能 |
|------|------|
| 我的持卡 | 4 个统计卡：持卡总数、各银行最高授信合计、本月/年度总消费、年费即将到期（30 天内需缴费，可点开查看） |
| 添加持卡 | 从卡种库按银行分组选卡（支持搜索），填别名、授信额度、账单/还款日、年费收取月日、月消费目标、权益（可设重置周期） |
| 持卡列表 | 按银行分组、可折叠；↑/↓ 调整银行顺序；卡片按名称排序；折叠与顺序自动记忆 |
| 年费倒计时 | 「年费还有 N 天」徽章：不足 60 天黄色、不足 30 天红色（仅需缴费的卡变色） |
| 免年费进度 | 消费刷免/笔数刷免显示进度条与剩余额度/笔数；积分抵扣、资产存免为左右滑块开关；刚性/免年费显示徽章 |
| 消费记录 | 记一笔（日期、金额、12 种支付渠道、分类、备注）；补录消费笔数（只计笔数不记金额） |
| 消费明细 | 本月/本年/累计三个时段查看，本年按月折叠、累计按年+月两级折叠 |
| 权益使用 | 每权益显示重置周期徽章（蓝=自然月/紫=自然年/橙=年费日）与已用/总数进度；可逐笔记录、按次数补录、查各周期历史；次数用完自动拦截 |
| 卡种数据库 | 列表/新增/编辑/删除；批量导入 CSV；按银行分组收起展开（默认收起） |
| 导出持卡 | 导出当前持卡对应的卡种信息 CSV（仅 12 项基础信息，不含个人隐私数据） |
| 主题 | 白色/深色一键切换，选择自动记忆 |
| 其他 | 卡种库升级自动合并新卡（按 银行+名称+卡组织+等级 去重）；数据原子写入防损坏 |

## 数据与备份

- 所有数据在 Docker 命名卷 `guanka-data`（容器内 `/app/data`）中，为 JSON 文件：
  `cards.json`（卡种库）、`mycards.json`（持卡）、`consumptions.json`（消费记录）、
  `benefits.json`（权益记录）、`settings.json`（主题/排序/折叠状态）。
- 备份：`docker run --rm -v guanka-data:/data -v %cd%:/backup alpine tar czf /backup/guanka-backup.tar.gz -C /data .`
  （PowerShell 中 `%cd%` 换成 `$(pwd)` 或绝对路径）
- 恢复：把备份解压到卷对应目录即可；或直接把宿主机目录挂载为卷：
  `docker run -v /your/data/dir:/app/data ...`（容器内以 node 用户运行，注意宿主机目录的读写权限）

## 提醒功能（3 个通道）

顶栏点击 🔔 打开「提醒设置」，可配置 **WxPusher / Server酱³ / Bark** 三个通道（可同时启用），
容器常驻进程定时检查并推送，**不需要 cron**。

**提醒类型**

| 类型 | 触发条件 | 默认 |
|------|---------|------|
| 年费到期 | 需缴费（未达标/未抵扣/刚性）且剩余天数跨过 30/7/1 天阈值 | 每个阈值只推一次 |
| 还款日 | 距下次还款日 ≤ N 天（自动跨月） | N=3 |
| 月刷卡任务 | 月末最后 N 天仍未达标 | N=3 |

**通道参数**

| 通道 | 参数 | 获取方式 |
|------|------|---------|
| WxPusher | appToken、UID（多个逗号分隔）、主题ID（可选）、消息前缀 | wxpusher.zjiecode.com 后台 |
| Server酱³ | SendKey（SCT/SCU 开头） | sct.ftqq.com |
| Bark | deviceKey、服务器地址（自建填自己的）、级别、分组 | iOS Bark App 复制 key |

**安全建议**：token 写在 UI 里会明文存到 `data/notify.json`。更安全的做法是不填 UI、
改用环境变量（配置为空时自动回退）：

```yaml
services:
  guanka:
    # ...
    environment:
      - WXPUSHER_APP_TOKEN=AT_xxx
      - WXPUSHER_UIDS=UID_xxx
      - SERVERCHAN_SENDKEY=SCTxxx
      - BARK_DEVICE_KEY=xxxxx
```

- 去重：同一提醒（卡 + 周期 + 阈值）只推一次，避免刷屏
- 单通道失败不影响其余通道，失败原因记在「最近推送记录」里
- 手动验证：设置页可「发送测试」与「立即检查」；也可 `curl -X POST http://localhost:3000/api/notify/check`

## 还款与账单（宽限期 / 账单流水）

还款日期体系对齐金山文档「信用卡掌柜」的口径：

- **还款方式二选一**：`每月固定日`（固定日不晚于账单日时自动落到次月）或 `账单日后 N 天`
- **宽限期**：`最后可还款日 = 银行到期日 + 宽限期`；且宽限期**参与选期判断**——过了到期日但仍在宽限期内仍算本期，不会误跳下期
- **主表还款日永远指向未来**（过即跳下期），判断是否漏还看「账单流水」的**是否已还**
- **预警分级**：还款（已逾期/今日到期/3天内/本周内/正常）、年费（无年费/本年豁免/已过日/7天内/本月内/正常）
- **账单流水**：按月记录（出账月份/金额/到期日/是否已还/还款日期），支持一键生成本期账单；标记已还自动填日期，改回未还自动清空
- **年费达标三路**：无年费 / 手工声明年份 / 自动判定（金额或笔数，含「已刷核定期」跨年闸门）
- **权益增强**：类型标准化（17 种）、`总额度 -1 = 不限次`、有效期至、周期支持「一次性/无固定」
- **免息期**：自动推导最长免息期与「建议消费日」（账单日次日免息最长）
- 列表支持按「本月需还款 / 年费临近 / 已达标 / 有未还账单 / 有剩余权益」筛选，按名称/年费临近/还款临近/银行排序

> 老数据零改动：原有的 `repaymentDay` 会自动迁移为 `repayMode=fixed + repayValue=原值`，宽限期默认 3 天。

## 批量导入 CSV

表头（与原版模板一致）：

```
银行,卡片名称,卡等级,卡组织,年费,免年费类型,刷免条件,免年费政策,起批额度,主要权益,申请条件,备注
```

- 免年费类型：`消费刷免`（条件填金额如 `10万`）、`笔数刷免`（如 `10笔`）、`积分抵扣`（如 `10000`）、
  `资产存免`（如 `500000`）、`刚性`（填 0）、`免年费`（填 0）
- 金额支持纯数字或数字+单位（`50000`、`5万`）
- 多个权益用 `|` 分隔
- 已存在的卡种自动跳过，不会重复导入

## 与原版的差异

- 原版为 Windows/Mac 桌面程序（后台服务 + 托盘图标）；Docker 版为 Web 服务，任意设备浏览器访问
- 原版数据为加密存储；Docker 版为明文 JSON（方便备份和迁移，容器请放在可信环境使用）
- 内置卡种库为示例数据（83 张/15 家银行），与原版 82 张的清单不完全相同，可自行导入补充
- 未实现：托盘/菜单栏图标（容器内无桌面环境意义）、自动打开浏览器

## 技术栈

- 后端：Node.js 原生 `http` 模块，**零 npm 依赖**（路由、JSON 存储、CSV 解析均为内置实现）
- 前端：原生 JS SPA + CSS 变量主题，无构建步骤
- 存储：JSON 文件 + 临时文件原子写入
- 镜像：`node:20-alpine`，非 root 用户运行，带健康检查

## 本地开发（不起容器）

```bash
node server/index.js        # 默认 http://localhost:3000
PORT=8080 node server/index.js
DATA_DIR=./data node server/index.js
```

## 开发自检（可选）

`tools/ui-test.js` 是一套基于 jsdom 的前端逻辑自动化验证（39 项断言：页面渲染、抽屉、
记一笔、补录、权益超限拦截、编辑持卡、卡种库、主题切换、完整添加持卡流程等）：

```bash
npm i -g jsdom                       # 或装到任意目录
node server/index.js &               # 先起服务
NODE_PATH=<jsdom所在node_modules> node tools/ui-test.js
```

## API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/meta | 渠道/分类/免年费类型等枚举 |
| GET/PUT | /api/settings | 主题、银行顺序、折叠状态 |
| GET | /api/stats | 首页统计 |
| GET/POST | /api/cards | 卡种库查询/新增 |
| PUT/DELETE | /api/cards/:id | 卡种编辑/删除 |
| POST | /api/cards/import | CSV 批量导入 |
| GET | /api/cards/export | 导出持卡对应卡种 CSV |
| GET/POST | /api/mycards | 持卡查询（响应含 data + stats + banks 合并统计）/新增 |
| PUT/DELETE | /api/mycards/:id | 持卡编辑/删除 |
| POST | /api/mycards/:id/consumptions | 记一笔消费 |
| POST | /api/mycards/:id/consumptions/count | 补录消费笔数 |
| GET | /api/mycards/:id/consumptions?scope=month\|year\|all | 消费明细 |
| POST | /api/mycards/:id/benefits/:idx/usage | 权益记一笔 |
| POST | /api/mycards/:id/benefits/:idx/count | 权益补录次数 |
| GET | /api/mycards/:id/benefits/:idx/history | 权益周期历史 |
| POST | /api/mycards/:id/points | 积分抵扣开关 |
| POST | /api/mycards/:id/asset | 资产达标开关 |
| POST | /api/shutdown | 优雅退出（数据安全落盘） |
