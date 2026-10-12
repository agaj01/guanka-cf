# 管卡 Docker 版 — 代码复盘报告

> 范围：`credit-card-manager/` 全量代码（server 6 文件 + public 3 文件 + tools 6 脚本）
> 本文件包含两轮复盘：第一轮（首轮交付后）与第二轮（P0/P1/P2 对齐金山文档落地后）

---

# 第二轮复盘（2026-10-12，P0/P1/P2 落地后）

> 本轮动作：**发现 7 项问题，修复 7 项**（4 项正确性缺陷、2 项性能、1 项清理）
> 验证：dates-test 全过 ｜ notify-test 扩至 41 项全过 ｜ ui-test 扩至 **52/52** ｜ 基准 200 卡 6.1×

## 一、发现的问题与修复记录

### R2-1 年费达标判定恒误报「未达标」（正确性，P1 引入）— ✅ 已修复

**问题**：`feeStatusOf()` 读取 `mc.waiver` 做自动达标判定，但 `waiver` 是 `computeMyCard()` 的**计算输出**字段，原始持卡记录上根本没有——函数内恒为 `{}`，导致：

- `waiverType='免年费'` 的卡 → `autoMet=false` → 恒「未达标」
- 消费/笔数刷免已达标（`w.met`）的卡 → 恒「未达标」
- 前端「年费已达标」筛选、年费徽章绿色态全部失效

**修复**：`feeStatusOf(mc, now, ws)` 增加 `ws` 参数，由调用方（`computeMyCard` 内已算好的 `waiverState` 结果）传入。定点断言：免年费卡 → 「已达标(自动)」。

### R2-2 年费预警分级完全失效（正确性，P0 引入）— ✅ 已修复

**问题**：`computeMyCard()` 中 `feeDaysLeft = mc.feeDays`——原始记录无 `feeDays` 字段（它也是计算字段），恒为 `undefined` → `feeAlertOf(undefined, …)` 走到 `<=30` 前的 `!(…>0)` 判断返回「正常」。**所有卡的年费预警恒为「正常」**，「7天内/本月内/已过日」红色黄色预警从不出现。

**修复**：改用已算好的 `days = U.feeCountdown(...)` 作为剩余天数。豁免卡走 `feeAlertOfWaived()`（无年费 → 「无年费」，其余 → 「本年豁免」）；未达标卡按倒计时分级。定点断言：年费日 5 天后的刚性卡 → 「7天内」。

### R2-3 不限次权益无法补录次数（正确性，P1 引入）— ✅ 已修复

**问题**：权益 `total=-1` 表示不限次，但补录接口拦截条件 `st.used + count > st.total` 在 `total=-1` 时恒为真 → **不限次权益一次都补录不了**（「记一笔」走 usage 接口不受影响，因为只拦 `exhausted`，而不限次的 `exhausted=false`）。

**修复**：`total >= 0` 时才做上限拦截。断言：不限次权益补录 3 次成功、used 累计 3。

### R2-4 还款提醒未接入日期引擎（正确性，P0 引入）— ✅ 已修复

**问题**：P0 落地了「宽限期 + 两种还款方式」的日期引擎（`payment.payDaysLeft` 基于最后可还款日），但提醒引擎 ② 还款日仍按旧的 `repaymentDay + daysToRepay()` 固定日估算：

- `repayMode='afterBill'`（账单日后 N 天）的卡 → 按错误日期提醒
- 宽限期不参与 → 宽限期内实际还能还款时可能漏报/错报
- 提醒文案还是「每月 X 日」，与新 UI 的账单日/到期日/最后还款日口径脱节

**修复**：改用 `m.payment.payDaysLeft`（跳期语义天然正确：主表还款日永远指向未来）；提醒 key 从「年-月」改为「最后还款日」（`repay:卡id:YYYY-MM-DD`），同一天只推一次、跨期可再次提醒；文案输出本期账单日/银行到期日/最后还款日并标注宽限状态。`daysToRepay` 降级为兼容保留。断言：宽限期最后一天命中「今日还款」、afterBill 与 fixed 等价场景一致、`payDaysLeft` 永不为负。

### R2-5 筛选/排序下拉框交叉误标（UX，P2 引入）— ✅ 已修复

**问题**：`option()` 同时用 `state.filter === value || state.sort === value` 判断选中态，而 filter 与 sort 的取值有交集（`fee`/`repay` 同时出现在两个框里）→ 选了筛选「年费临近」后，排序框的「按年费临近」也被误标选中，反之亦然。

**修复**：`option(value, label, isFilter)` 拆开判断。UI 断言：筛选选中不污染排序框、排序选中不污染筛选框。

### R2-6 `/api/mycards` 统计重复全量计算（性能）— ✅ 已修复

**问题**：`computeStats()` 内部对每张卡再跑一遍完整 `computeMyCard`（含 waiverState、权益使用、日期引擎、排序取 recent），而 `/api/mycards` 已算过一次 → 单请求全量计算 **翻倍**。

**修复**：`computeStats(now, idx, computed)` 接受已算好的持卡列表，`/api/mycards` 传入复用。**基准 200 卡/2 万消费/3200 权益：43.8ms → 29.4ms，对比旧实现 6.1×**（第一轮为 4.35×）。

### R2-7 死代码与测试脚本问题（清理）— ✅ 已修复

- `collectReminders` 中 `monthKey` 未使用 → 删除
- `bench.js` 用 C 风格 `%.1f` 格式符（Node `console.log` 不支持，原样输出）；且未把已算列表传给 `computeStats`，基准虚高 → 修复后输出格式正确、数据真实

## 二、评估后「不改」的事项（附理由）

| 事项 | 结论 |
|------|------|
| 提醒引擎「账单流水逾期提醒」与「还款提醒」可能同卡同天各推一条 | 语义不同（账单是「这笔钱没还」，还款是「今天最后期限」），保留双通道；sentLog 按 key 去重不会重推 |
| `daysToRepay` 保留 | 提醒引擎已不用，但作为独立日期工具保留给外部脚本；已注明「旧口径」 |
| bills 表线性过滤（`/api/bills` GET） | 账单量 = 卡数 × 月数，个人规模 < 1 千条，线性足够；不为它建索引 |
| `handle()` 仍线性路由匹配 | 上轮已评估：35 条正则可忽略，保持零依赖 |

## 三、验证记录

| 验证项 | 结果 |
|--------|------|
| 语法检查（改动 6 文件） | ✅ 全过 |
| dates-test（日期引擎 37 项） | ✅ 全过 |
| notify-test（三通道 + 规则 + 账单提醒 + 不限次补录 + feeStatus 回归） | ✅ **41 项全过**（新增 12 项断言） |
| ui-test（jsdom UI 自动化） | ✅ **52/52**（新增 2 项下拉框交叉误标断言） |
| 性能基准 | ✅ 200 卡 6.1×（29.4ms vs 179.1ms）；50 卡 1.1×（个人规模两者均 <20ms） |
| 测试产物清理 | ✅ `.test-data`/`.bench-data`/`.notify-test-data*` 已删，`data/` 仅剩 `.gitkeep` |

## 四、遗留事项（建议后续迭代）

1. hash 路由深链接、单条消费记录编辑/删除（体验对齐原版）
2. 卡库补丁化（seed.js 拆 patch.js）
3. 本地提交尚未推送 GitHub（等用户提供新 token）

---

---

# 第一轮复盘（2026-10-12，首轮交付后）

> 本轮动作：**发现 6 项问题，修复 5 项，基准验证 1 项；另抓出 1 个回归 bug 并修复**

## P0-1 刷免进度/统计的全表重复扫描（性能）— ✅ 已修复

**问题**：`computeMyCard()` 每次调用都 `getConsumptions().filter(...)` 全表扫描；`computeStats()` 又对每张卡再跑一遍完整计算；`benefitUsed()` 按权益再扫一遍权益表。单次页面加载复杂度 **O(卡数 × 记录数)**。

**修复**：`buildIndexes()` 每请求一次建索引——消费按卡分桶（金额/笔数分离）、权益按 卡→序号 嵌套 Map 分桶；`computeMyCard/computeStats/benefitUsed` 全部改为查表。同时把 stats/banks 合并进 `/api/mycards` 响应。

## P0-2 年费日「2 月 31 日」静默滚月（正确性）— ✅ 已修复

**修复**：util.js 新增 `daysInMonth()/clampFeeDate()`——按当月实际天数钳制（2 月 31 → 2 月 28/29），POST/PUT 持卡均走此钳制。

## P0-3 新增持卡不填额度时继承失败（回归 bug）— ✅ 已修复

**问题**：`nonNeg(undefined, card.startCredit)` 中 `parseAmount(undefined)=0` 是有限非负数直接返回，默认值永不生效。UI 套件「编辑表单预填数据」断言抓到。

**修复**：`nonNeg()` 改为「空值/负值 → 回退默认；显式 0 → 保留 0；封顶 1 万亿」。

## P1-1 脏数据无边界（健壮性）— ✅ 已修复

金额 `<=0` 拒绝 + 上限 1 万亿；次数 `validCount()` 正整数封顶 100 万；额度/目标/年费负值回退默认。

## P1-2 无未捕获异常兜底（健壮性）— ✅ 已修复

`uncaughtException/unhandledRejection` 追加写入 `DATA_DIR/error.log` 后 `exit(1)`，由 Docker restart 拉起。

## P2-1/2 抽屉滚动位置丢失 + 前端重复拉数 — ✅ 已修复

`renderDrawer()` 重绘前捕获/恢复 `scrollTop`；stats/banks 合并进 `/api/mycards`。

## 第一轮「不改」事项

刷免窗口口径（两种窗口等价）、JSON 全文件重写（个人规模无感）、补录笔数可追溯优于原版、线性路由匹配、客户端排序。

## 第一轮遗留（已在后续迭代处理）

- ~~年费预警分级失效~~ → 第二轮 R2-2 修复
- ~~达标判定误报~~ → 第二轮 R2-1 修复
- hash 路由、单条记录编辑/删除、卡库补丁化 → 仍待迭代
