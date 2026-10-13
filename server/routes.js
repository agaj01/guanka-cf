'use strict';

const crypto = require('crypto');
const U = require('./util');
const { SEED_CARDS, SEED_VERSION } = require('./seed');
const notifier = require('./notifier');
const reminder = require('./reminder');
const D = require('./dates');

// 账单流水（月账单 + 是否已还）
function getBills() { return store.readArray('bills'); }

// ---------- 合并账单组 ----------
// 组本身只存 id + 名称，成员关系记在 mycards[].billGroupId —— 单一事实来源，
// 删卡/改组不会留下需要两头维护的孤儿成员表。
function getBillGroups() { return store.readArray('billGroups'); }

// 提醒原始配置：必须是对象。若文件被写成数组/标量，readObject 会回退默认值，
// 避免 normalizeConfig 拿到非对象后把 sentLog/history 一起丢掉。
function getNotifyRaw() { return store.readObject('notify', null); }

function groupNameOf(groupId) {
  if (!groupId) return '';
  const g = getBillGroups().find((x) => x.id === groupId);
  return g ? g.name : '';
}

/**
 * 组内「最后还款日」一致性校验（策略③：组内强制同还款日）
 * 只比当期是不够的——fixed(20) 与 afterBill(N) 可能在某个账单周期恰好落在同一天，
 * 换个月就错开。这里按未来 14 个月 × 每月 10 个采样日逐一推算「最后还款日」，
 * 只有全部一致才判定为同一还款节奏（覆盖月末钳制与跨年闰日的分支）。
 */
const REPAY_PROBE_DAYS = [1, 5, 10, 15, 20, 25, 28, 29, 30, 31];
function sameRepaySchedule(a, b, now) {
  if (a === b) return true;
  const base = now || new Date();
  for (let i = 0; i < 14; i++) {
    for (const d of REPAY_PROBE_DAYS) {
      const probe = new Date(base.getFullYear(), base.getMonth() + i, d);
      if (D.paymentInfo(a, probe).lastPayDate !== D.paymentInfo(b, probe).lastPayDate) return false;
    }
  }
  return true;
}

/** 校验把 target 放入 groupId 是否合法；返回错误文案，合法则返回 '' */
function groupAssignError(myCards, target, groupId, now) {
  if (!groupId) return '';
  if (!getBillGroups().some((g) => g.id === groupId)) return '合并账单组不存在';
  for (const other of myCards) {
    if (other.id === target.id || other.billGroupId !== groupId) continue;
    if (!sameRepaySchedule(other, target, now)) {
      return '与「' + (other.alias || other.name) + '」的最后还款日不一致，无法合并（组内卡必须同还款日）';
    }
  }
  return '';
}

// 迁移/自愈：清掉指向已不存在账单组的悬空引用；成员被删空后解散空组
function cleanBillGroups() {
  const groups = getBillGroups();          // readArray 保证是数组
  const myCards = getMyCards();            // 同上
  const ids = new Set(groups.map((g) => g && g.id).filter(Boolean));
  let changed = false;
  for (const m of myCards) {
    if (m.billGroupId && !ids.has(m.billGroupId)) { m.billGroupId = ''; changed = true; }
  }
  if (changed) store.write('mycards', myCards);
  const alive = new Set(myCards.map((m) => m.billGroupId).filter(Boolean));
  const kept = groups.filter((g) => g && alive.has(g.id));
  if (kept.length !== groups.length) store.write('billGroups', kept);
}

// 年费达标状态（金山口径：无年费 / 手工声明 / 自动判定）
// ws 必须由调用方传入 waiverState() 的结果——原始持卡记录上没有 waiver 字段（那是 computeMyCard 的计算输出），
// 之前直接读 mc.waiver 恒为 {}，导致免年费/刷免达标一律误报「未达标」
function feeStatusOf(mc, now, ws) {
  const year = now.getFullYear();
  if (!(Number(mc.annualFee) > 0)) return '无年费';
  if (Number(mc.waivedYear) >= year && Number(mc.waivedYear) > 0) return '已达标(手工)';
  const w = ws || {};
  // 已刷核定期：填了往年 → 跨年后已刷数据自动失效
  const periodOk = !Number(mc.countPeriodYear) || Number(mc.countPeriodYear) >= year;
  let autoMet = false;
  if (w.kind === '免年费') autoMet = true;
  else if (w.kind === '刚性') autoMet = false;
  else autoMet = !!w.met; // 消费/笔数刷免 按进度；积分抵扣/资产存免 按开关
  return (periodOk && autoMet) ? '已达标(自动)' : '未达标';
}

const CARD_FIELDS = ['bank', 'name', 'level', 'org', 'annualFee', 'waiverType', 'waiverCondition', 'waiverPolicy', 'startCredit', 'benefits', 'applyCondition', 'note'];
const CSV_HEADER = ['银行', '卡片名称', '卡等级', '卡组织', '年费', '免年费类型', '刷免条件', '免年费政策', '起批额度', '主要权益', '申请条件', '备注'];
const WAIVER_TYPES = ['消费刷免', '笔数刷免', '积分抵扣', '资产存免', '刚性', '免年费'];
const RESET_CYCLES = ['自然月', '自然年', '年费日', '一次性', '无固定'];
// 权益类型（对齐金山文档权益台账的标准化取值）
const BENEFIT_TYPES = ['境内接送机', '境外接送机', '境内机场贵宾楼', '机场龙腾悦途PP', '机场龙腾悦途PP（可餐食）', '代驾', '租车', '道路救援', '体检', '洗牙', '挂号', '挂号+导诊', '酒店优惠', '运动健身', '延误险', '积分兑换里程', '其他'];
const CHANNELS = ['微信支付', '支付宝支付', '云闪付线上', '云闪付线下', 'ApplePay', '其他手机Pay', '美团支付', '抖音支付', '京东支付', '程支付', '多多支付', 'POS机刷卡'];
const CATEGORIES = ['餐饮', '购物', '交通', '加油', '超市', '旅行', '娱乐', '医疗', '教育', '其他'];

let store;

function init(s) {
  store = s;
  const meta = store.readObject('meta', { seedVersion: 0 });
  // 卡种库必须是数组：类型不符时 readArray 已隔离原文件并回退空数组，这里再按需播种
  let cards = store.readArray('cards');
  if (cards.length === 0) {
    cards = SEED_CARDS.map((c) => normalizeCard(c, null));
    store.write('cards', cards);
    store.write('meta', Object.assign({}, meta, { seedVersion: SEED_VERSION }));
  } else if (meta.seedVersion !== SEED_VERSION) {
    // 升级时合并新卡种：已存在的（银行+名称+组织+等级）不重复导入
    const keys = new Set(cards.map(cardKey));
    let added = 0;
    for (const c of SEED_CARDS) {
      const k = cardKey(c);
      if (!keys.has(k)) { cards.push(normalizeCard(c, null)); keys.add(k); added++; }
    }
    store.write('cards', cards);
    store.write('meta', Object.assign({}, meta, { seedVersion: SEED_VERSION }));
    if (added > 0) console.log(`[管卡] 卡种库已合并 ${added} 张新卡，当前共 ${cards.length} 张`);
  }
  // 预热并做类型归一：这些数据集必须都是数组，否则后续 .map/.push/.filter 会抛 TypeError
  store.readArray('mycards');
  store.readArray('consumptions');
  store.readArray('benefits');
  store.readArray('bills');
  store.readArray('billGroups');
  store.readObject('settings', { theme: 'light', bankOrder: [], banksCollapsed: {}, cardBanksCollapsed: {} });
  // 历史数据自愈：持卡上可能残留指向已删组的引用
  cleanBillGroups();
  migrateBenefitIds();
}

// 一次性迁移：历史权益与权益记录此前只按索引归属，编辑时增删/重排会导致记录错配（B 继承 A 的历史）。
// 这里按「当前索引 → 权益」的对应关系补稳定 id（迁移瞬间该映射仍成立），此后记录一律按 id 归属。
function migrateBenefitIds() {
  const mcs = getMyCards();
  let bChanged = 0;
  for (const mc of mcs) {
    for (const b of mc.benefits || []) {
      if (!b.id) { b.id = U.uid(); bChanged++; }
    }
  }
  if (bChanged) store.write('mycards', mcs);
  const mcById = new Map(mcs.map((m) => [m.id, m]));
  const recs = getBenefits();
  let rChanged = 0;
  for (const r of recs) {
    if (r.bid) continue;
    const mc = mcById.get(r.myCardId);
    const b = mc && (mc.benefits || [])[r.idx];
    if (b && b.id) { r.bid = b.id; rChanged++; }
  }
  if (rChanged) store.write('benefits', recs);
  if (bChanged || rChanged) console.log(`[管卡] 权益稳定 id 迁移完成：权益 ${bChanged} 项、历史记录 ${rChanged} 条`);
}

function cardKey(c) {
  return [c.bank, c.name, c.org, c.level].map((x) => String(x || '').trim()).join('|');
}

function normalizeCard(c, id) {
  return {
    id: id || U.uid(),
    bank: String(c.bank || '').trim(),
    name: String(c.name || '').trim(),
    level: String(c.level || '').trim(),
    org: String(c.org || '').trim(),
    annualFee: U.parseAmount(c.annualFee),
    waiverType: WAIVER_TYPES.includes(c.waiverType) ? c.waiverType : '免年费',
    waiverCondition: String(c.waiverCondition == null ? '0' : c.waiverCondition).trim(),
    waiverPolicy: String(c.waiverPolicy || '').trim(),
    startCredit: U.parseAmount(c.startCredit),
    benefits: Array.isArray(c.benefits) ? c.benefits.map((b) => String(b).trim()).filter(Boolean) : String(c.benefits || '').split('|').map((b) => b.trim()).filter(Boolean),
    applyCondition: String(c.applyCondition || '').trim(),
    note: String(c.note || '').trim(),
  };
}

// ---------- 持卡计算 ----------
function getConsumptions() { return store.readArray('consumptions'); }
function getBenefits() { return store.readArray('benefits'); }
function getMyCards() { return store.readArray('mycards'); }
function getCards() { return store.readArray('cards'); }

// 每请求构建一次索引：消费按卡分桶（金额/笔数分开）、权益记录按 卡→序号 嵌套分桶。
// 避免 computeMyCard/benefitUsed 对全表反复 filter（原实现 O(卡数 × 记录数)）。
function buildIndexes() {
  const consByCard = new Map();
  for (const r of getConsumptions()) {
    let e = consByCard.get(r.myCardId);
    if (!e) { e = { amount: [], count: [] }; consByCard.set(r.myCardId, e); }
    if (r.type === 'amount') e.amount.push(r); else if (r.type === 'count') e.count.push(r);
  }
  const benByCard = new Map();
  for (const r of getBenefits()) {
    let m = benByCard.get(r.myCardId);
    if (!m) { m = new Map(); benByCard.set(r.myCardId, m); }
    // 优先按稳定 id 分桶（权益增删/重排后索引会前移，按 idx 分桶会张冠李戴）；
    // 无 bid 的历史记录退回 idx 桶，由查询侧兼容
    const key = r.bid ? 'bid:' + r.bid : 'idx:' + r.idx;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(r);
  }
  return { consByCard, benByCard };
}

function cardRecords(idx, myCardId) {
  return idx.consByCard.get(myCardId) || { amount: [], count: [] };
}

function amountRecordsOf(myCardId) {
  return getConsumptions().filter((r) => r.myCardId === myCardId && r.type === 'amount');
}

// 当前卡年内的消费记录（刷免进度区间：自上个年费日起）
function cardYearRecordsOf(records, mc, now) {
  const start = U.cardYearStart(mc.feeMonth, mc.feeDay, now);
  const startStr = U.toDateStr(start);
  return records.amount.filter((r) => r.date >= startStr);
}

function waiverState(mc, now, recs) {
  const st = { needsPayment: true, kind: mc.waiverType, met: false, progress: 0, target: 0, remaining: 0, unit: '' };
  switch (mc.waiverType) {
    case '免年费':
      st.needsPayment = false; st.met = true; break;
    case '刚性':
      st.needsPayment = true; st.met = false; break;
    case '积分抵扣':
      st.needsPayment = !mc.pointsDeducted; st.met = !!mc.pointsDeducted;
      st.target = U.parseAmount(mc.waiverCondition); st.unit = '积分'; break;
    case '资产存免':
      st.needsPayment = !mc.assetWaived; st.met = !!mc.assetWaived;
      st.target = U.parseAmount(mc.waiverCondition); st.unit = '元'; break;
    case '消费刷免': {
      const target = U.parseAmount(mc.waiverCondition);
      const progress = cardYearRecordsOf(recs, mc, now).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      st.target = target; st.progress = progress; st.unit = '元';
      st.met = progress >= target; st.needsPayment = !st.met;
      st.remaining = Math.max(0, target - progress);
      break;
    }
    case '笔数刷免': {
      const target = Math.round(U.parseAmount(mc.waiverCondition));
      const yearRecs = cardYearRecordsOf(recs, mc, now);
      const startStr = U.toDateStr(U.cardYearStart(mc.feeMonth, mc.feeDay, now));
      const countExtra = recs.count.filter((r) => r.date >= startStr).reduce((s, r) => s + (Number(r.count) || 0), 0);
      const progress = yearRecs.length + countExtra;
      st.target = target; st.progress = progress; st.unit = '笔';
      st.met = progress >= target; st.needsPayment = !st.met;
      st.remaining = Math.max(0, target - progress);
      break;
    }
    default: break;
  }
  return st;
}

function feeDaysColor(days, needsPayment) {
  if (!needsPayment) return 'default';
  if (days < 30) return 'red';
  if (days < 60) return 'yellow';
  return 'default';
}

// 已豁免卡的年费预警：无年费卡片显示「无年费」，其余显示达标来源
function feeAlertOfWaived(mc) {
  if (!(Number(mc.annualFee) > 0)) return '无年费';
  return '本年豁免';
}

function computeMyCard(mc, now, idx) {
  now = now || new Date();
  idx = idx || buildIndexes();
  const recs = idx.consByCard.get(mc.id) || { amount: [], count: [] };
  const monthStart = U.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = U.toDateStr(new Date(now.getFullYear(), 0, 1));
  const days = U.feeCountdown(mc.feeMonth, mc.feeDay, now);
  const ws = waiverState(mc, now, recs);
  const benefits = (mc.benefits || []).map((b, i) => {
    const u = benefitUsed(mc, i, now, idx);
    // 展开全部使用态：used / remaining / unlimited / expired / exhausted
    return { ...b, ...u };
  });  const monthSpend = recs.amount.filter((r) => r.date >= monthStart).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const yearSpend = recs.amount.filter((r) => r.date >= yearStart).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  // 还款信息（宽限期 + 两种还款方式）与预警分级
  const payment = D.paymentInfo(mc, now);
  const feeStatus = feeStatusOf(mc, now, ws);
  const feeWaived = feeStatus !== '未达标';
  // 注意：nextFeeDate 是计算字段，必须先算出来再用于「距年费月数」
  const nextFeeDateStr = U.toDateStr(U.nextFeeDate(mc.feeMonth, mc.feeDay, now));
  const nextFee = new Date(nextFeeDateStr + 'T00:00:00');
  const feeMonthsLeft = isNaN(nextFee.getTime())
    ? null
    : (nextFee.getFullYear() - now.getFullYear()) * 12 + (nextFee.getMonth() - now.getMonth());
  // 年费预警分级基于「距下次年费日天数」（原始记录无 feeDays 字段，之前读 mc.feeDays 恒为 undefined → 预警恒「正常」）
  const feeDaysLeft = days;
  const feeAlert = feeWaived ? feeAlertOfWaived(mc) : D.feeAlertOf(mc, feeDaysLeft, false);
  return {
    ...mc,
    benefits,
    payment,
    feeStatus,
    feeAlert,
    feeMonthsLeft,
    // 合并账单：组名 + 组内是否为首位成员（负责汇总提醒），无组时为空
    billGroupId: mc.billGroupId || '',
    billGroupName: groupNameOf(mc.billGroupId),
    recent: recs.amount.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    monthSpend, yearSpend, totalSpend: recs.amount.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    monthCount: recs.amount.filter((r) => r.date >= monthStart).length,
    yearCount: recs.amount.filter((r) => r.date >= yearStart).length,
    totalCount: recs.amount.length,
    monthProgress: mc.monthlySpendTarget > 0 ? Math.min(100, Math.round((monthSpend / mc.monthlySpendTarget) * 100)) : 0,
    feeDays: days,
    feeDaysColor: feeDaysColor(days, ws.needsPayment),
    nextFeeDate: nextFeeDateStr,
    waiver: ws,
  };
}

// computed 可传入已由 computeMyCard 算好的持卡列表（/api/mycards 场景），避免每张卡重复全量计算
function computeStats(now, idx, computed) {
  now = now || new Date();
  idx = idx || buildIndexes();
  const myCards = getMyCards();
  const banks = [...new Set(myCards.map((m) => m.bank))];
  const bankMax = {};
  for (const m of myCards) {
    const lim = Number(m.creditLimit) || 0;
    if (!(m.bank in bankMax) || lim > bankMax[m.bank]) bankMax[m.bank] = lim;
  }
  const monthStart = U.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = U.toDateStr(new Date(now.getFullYear(), 0, 1));
  let monthSpend = 0;
  let yearSpend = 0;
  for (const r of getConsumptions()) {
    if (r.type !== 'amount') continue;
    const a = Number(r.amount) || 0;
    if (r.date >= monthStart) monthSpend += a;
    if (r.date >= yearStart) yearSpend += a;
  }
  const feeExpiring = (computed || myCards.map((m) => computeMyCard(m, now, idx)))
    .filter((m) => m.waiver.needsPayment && m.feeDays < 30)
    .sort((a, b) => a.feeDays - b.feeDays)
    .map((m) => ({ id: m.id, name: m.alias || m.name, bank: m.bank, feeDays: m.feeDays, annualFee: m.annualFee }));
  return {
    totalCards: myCards.length,
    totalBanks: banks.length,
    maxCreditSum: Object.values(bankMax).reduce((s, v) => s + v, 0),
    monthSpend, yearSpend,
    feeExpiring,
  };
}

// ---------- 权益使用 ----------
// 记录归属判定：优先按稳定 id（bid）；无 bid 的历史记录按索引匹配（迁移后应已补齐）
function benefitRecords(idx, myCardId, benefitIdx, bid) {
  const m = idx.benByCard.get(myCardId);
  if (!m) return [];
  const out = [];
  if (bid) out.push(...(m.get('bid:' + bid) || []));
  // 兼容尚未迁移的历史记录（无 bid，只能按 idx 归属）
  for (const r of m.get('idx:' + benefitIdx) || []) if (!r.bid) out.push(r);
  return out;
}

function benefitUsage(myCardId, idx, bid) {
  const all = getBenefits().filter((r) => r.myCardId === myCardId);
  if (bid) return all.filter((r) => (r.bid ? r.bid === bid : r.idx === idx));
  return all.filter((r) => r.idx === idx);
}

function benefitUsed(mc, idx, now, index, bid) {
  now = now || new Date();
  const b = (mc.benefits || [])[idx];
  if (!b) return { used: 0, total: 0, exhausted: false, cycle: '自然月', missing: true };
  const start = U.cycleStart(b.resetCycle, mc.feeMonth, mc.feeDay, now);
  const startStr = U.toDateStr(start);
  const useBid = bid !== undefined ? bid : b.id;
  const recs = (index ? benefitRecords(index, mc.id, idx, useBid) : benefitUsage(mc.id, idx, useBid)).filter((r) => r.date >= startStr);
  const used = recs.filter((r) => r.type === 'usage').length
    + recs.filter((r) => r.type === 'count').reduce((s, r) => s + (Number(r.count) || 0), 0);
  const total = Number(b.total) || 0;
  const unlimited = total < 0;
  const expired = !!(b.validUntil && b.validUntil < U.todayStr());
  return {
    used,
    total,
    unlimited,
    expired,
    remaining: unlimited ? null : Math.max(0, total - used),
    exhausted: !unlimited && !expired && used >= total,
    cycle: b.resetCycle,
    cycleStart: startStr,
  };
}

function benefitHistory(mc, idx, bid) {
  const b = (mc.benefits || [])[idx];
  if (!b) return [];
  const recs = benefitUsage(mc.id, idx, bid !== undefined ? bid : b.id);
  const groups = new Map();
  for (const r of recs) {
    const key = U.cycleKeyOf(b.resetCycle, mc.feeMonth, mc.feeDay, r.date);
    if (!groups.has(key)) groups.set(key, { key, used: 0, records: [] });
    const g = groups.get(key);
    if (r.type === 'usage') { g.used += 1; g.records.push({ date: r.date, note: r.note || '', count: 1 }); }
    else { g.used += Number(r.count) || 0; g.records.push({ date: r.date, note: (r.note || '') + (r.note ? '，' : '') + '补录 ' + (Number(r.count) || 0) + ' 次', count: Number(r.count) || 0 }); }
  }
  return [...groups.values()].sort((a, b2) => (a.key < b2.key ? 1 : -1));
}

// ---------- HTTP 辅助 ----------
function json(obj, status) {
  return { status: status || 200, body: obj };
}

function err(msg, status) { return json({ error: msg }, status || 400); }

function matchRoute(method, pathname) {
  const routes = [
    ['GET', /^\/api\/health$/],
    ['GET', /^\/api\/meta$/],
    ['GET', /^\/api\/settings$/],
    ['PUT', /^\/api\/settings$/],
    ['GET', /^\/api\/stats$/],
    ['GET', /^\/api\/cards$/],
    ['POST', /^\/api\/cards$/],
    ['POST', /^\/api\/cards\/import$/],
    ['GET', /^\/api\/cards\/export$/],
    ['PUT', /^\/api\/cards\/([^/]+)$/],
    ['DELETE', /^\/api\/cards\/([^/]+)$/],
    ['GET', /^\/api\/mycards$/],
    ['POST', /^\/api\/mycards$/],
    ['PUT', /^\/api\/mycards\/([^/]+)$/],
    ['DELETE', /^\/api\/mycards\/([^/]+)$/],
    ['GET', /^\/api\/mycards\/([^/]+)\/consumptions$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/consumptions$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/consumptions\/count$/],
    ['DELETE', /^\/api\/mycards\/([^/]+)\/consumptions\/([^/]+)$/],
    ['GET', /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/history$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/usage$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/count$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/points$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/asset$/],
    ['GET', /^\/api\/notify\/config$/],
    ['PUT', /^\/api\/notify\/config$/],
    ['POST', /^\/api\/notify\/test$/],
    ['POST', /^\/api\/notify\/check$/],
    ['GET', /^\/api\/notify\/history$/],
    ['GET', /^\/api\/bills$/],
    ['POST', /^\/api\/bills$/],
    ['PUT', /^\/api\/bills\/([^/]+)$/],
    ['DELETE', /^\/api\/bills\/([^/]+)$/],
    ['GET', /^\/api\/billgroups$/],
    ['POST', /^\/api\/billgroups$/],
    ['PUT', /^\/api\/billgroups\/([^/]+)$/],
    ['DELETE', /^\/api\/billgroups\/([^/]+)$/],
    ['POST', /^\/api\/mycards\/([^/]+)\/bills\/generate$/],
    ['POST', /^\/api\/shutdown$/],
  ];
  for (const [m, re] of routes) {
    if (m !== method) continue;
    const match = pathname.match(re);
    if (match) return match;
  }
  return null;
}

async function handle(method, pathname, url, body) {
  const match = matchRoute(method, pathname);
  if (!match) return undefined;
  const now = new Date();

  // ---- 基础 ----
  if (pathname === '/api/health') return json({ ok: true, version: '1.0.0', time: now.toISOString() });
  if (pathname === '/api/meta') return json({ channels: CHANNELS, categories: CATEGORIES, waiverTypes: WAIVER_TYPES, resetCycles: RESET_CYCLES, benefitTypes: BENEFIT_TYPES, csvHeader: CSV_HEADER });
  if (pathname === '/api/shutdown') return { shutdown: true };

  // ---- 设置 ----
  if (pathname === '/api/settings' && method === 'GET') return json(store.readObject('settings', {}));
  if (pathname === '/api/settings' && method === 'PUT') {
    const cur = store.readObject('settings', {});
    const patch = body || {};
    const allowed = ['theme', 'bankOrder', 'banksCollapsed', 'cardBanksCollapsed'];
    for (const k of allowed) if (k in patch) cur[k] = patch[k];
    store.write('settings', cur);
    return json(cur);
  }

  // ---- 统计 ----
  if (pathname === '/api/stats') return json(computeStats(now, null, null));

  // ---- 卡种库 ----
  if (pathname === '/api/cards' && method === 'GET') {
    return json(getCards());
  }
  if (pathname === '/api/cards' && method === 'POST') {
    const c = normalizeCard(body || {}, null);
    if (!c.bank || !c.name) return err('银行和卡片名称必填');
    const cards = getCards();
    if (cards.some((x) => cardKey(x) === cardKey(c))) return err('已存在相同「银行 + 卡片名称 + 卡组织 + 卡等级」的卡种，请修改卡片名称');
    cards.push(c);
    store.write('cards', cards);
    return json(c, 201);
  }
  if (pathname === '/api/cards/import' && method === 'POST') {
    const text = typeof body === 'string' ? body : (body && body.csv) || '';
    if (!text.trim()) return err('CSV 内容为空');
    const rows = U.parseCSV(text);
    if (rows.length < 2) return err('CSV 只有表头或无数据行');
    const cards = getCards();
    const keys = new Set(cards.map(cardKey));
    const fileKeys = new Set();
    let added = 0;
    const skipped = [];
    const errors = [];
    rows.slice(1).forEach((row, i) => {
      const lineNo = i + 2;
      const raw = {};
      CSV_HEADER.forEach((h, ci) => { raw[CARD_FIELDS[ci]] = (row[ci] == null ? '' : String(row[ci])).trim(); });
      if (!raw.bank || !raw.name) { errors.push({ line: lineNo, msg: '银行或卡片名称为空' }); return; }
      const c = normalizeCard(raw, null);
      const k = cardKey(c);
      if (keys.has(k) || fileKeys.has(k)) { skipped.push({ line: lineNo, name: raw.name, msg: '已存在，自动跳过' }); return; }
      fileKeys.add(k);
      keys.add(k);
      cards.push(c);
      added++;
    });
    store.write('cards', cards);
    return json({ added, skipped, errors, total: cards.length });
  }
  if (pathname === '/api/cards/export' && method === 'GET') {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
    const myCards = getMyCards();
    const selected = ids.length ? myCards.filter((m) => ids.includes(m.id)) : myCards;
    const seen = new Set();
    const rows = [CSV_HEADER];
    for (const m of selected) {
      if (seen.has(m.cardId)) continue;
      seen.add(m.cardId);
      const c = getCards().find((x) => x.id === m.cardId) || {};
      rows.push([c.bank || m.bank, c.name || m.name, c.level || '', c.org || '', c.annualFee || 0, c.waiverType || '', c.waiverCondition || '', c.waiverPolicy || '', c.startCredit || 0, (c.benefits || []).join('|'), c.applyCondition || '', c.note || '']);
    }
    return { csv: U.toCSV(rows) };
  }
  const cardMatch = pathname.match(/^\/api\/cards\/([^/]+)$/);
  if (cardMatch && method === 'PUT') {
    const cards = getCards();
    const idx = cards.findIndex((c) => c.id === cardMatch[1]);
    if (idx < 0) return err('卡种不存在', 404);
    const merged = { ...cards[idx], ...(body || {}) };
    const c = normalizeCard(merged, cards[idx].id);
    if (cards.some((x, i) => i !== idx && cardKey(x) === cardKey(c))) return err('已存在相同「银行 + 卡片名称 + 卡组织 + 卡等级」的卡种');
    cards[idx] = c;
    store.write('cards', cards);
    // 同步持卡快照
    syncMyCardSnapshots();
    return json(c);
  }
  if (cardMatch && method === 'DELETE') {
    let cards = getCards();
    if (!cards.some((c) => c.id === cardMatch[1])) return err('卡种不存在', 404);
    cards = cards.filter((c) => c.id !== cardMatch[1]);
    store.write('cards', cards);
    return json({ ok: true });
  }

  // ---- 我的持卡 ----
  if (pathname === '/api/mycards' && method === 'GET') {
    const idx = buildIndexes();
    const data = getMyCards().map((m) => computeMyCard(m, now, idx));
    // 与统计合并返回，复用已计算的持卡列表（此前 computeStats 内部对每张卡再跑一遍完整计算，全量开销翻倍）
    return json({
      data,
      stats: computeStats(now, idx, data),
      banks: [...new Set(data.map((m) => m.bank))],
      billGroups: getBillGroups(),
    });
  }
  if (pathname === '/api/mycards' && method === 'POST') {
    const b = body || {};
    if (!b.cardId) return err('缺少 cardId');
    const card = getCards().find((c) => c.id === b.cardId);
    if (!card) return err('卡种不存在', 404);
    const fee = U.clampFeeDate(b.feeMonth, b.feeDay);
    // 还款方式：fixed=每月固定日 / afterBill=账单日后 N 天（老数据 repaymentDay 自动迁移为 fixed）
    const repayMode = b.repayMode === 'afterBill' ? 'afterBill' : 'fixed';
    const repayValue = b.repayValue != null
      ? Math.max(0, Math.min(365, Math.round(Number(b.repayValue) || 0)))
      : clampDay(b.repaymentDay, 20);
    const mc = {
      id: U.uid(),
      cardId: card.id,
      bank: card.bank, name: card.name, org: card.org, level: card.level,
      annualFee: card.annualFee, waiverType: card.waiverType, waiverCondition: card.waiverCondition, waiverPolicy: card.waiverPolicy,
      alias: String(b.alias || '').trim(),
      creditLimit: nonNeg(b.creditLimit, card.startCredit),
      billingDay: clampDay(b.billingDay, 1),
      repaymentDay: repayMode === 'fixed' ? Math.min(31, Math.max(1, repayValue || 20)) : clampDay(b.repaymentDay, 20),
      repayMode,
      repayValue,
      graceDays: b.graceDays != null ? Math.max(0, Math.min(30, Math.round(Number(b.graceDays) || 0))) : 3,
      waivedYear: Math.max(0, Math.round(Number(b.waivedYear) || 0)),
      countPeriodYear: Math.max(0, Math.round(Number(b.countPeriodYear) || 0)),
      maxInterestDays: Math.max(0, Math.min(120, Math.round(Number(b.maxInterestDays) || 0))),
      feeMonth: fee.m,
      feeDay: fee.d,
      last4: String(b.last4 || '').replace(/\D/g, '').slice(0, 4),
      monthlySpendTarget: nonNeg(b.monthlySpendTarget, 0),
      benefits: normalizeBenefits(b.benefits, card.benefits),
      pointsDeducted: false, pointsDeductDate: null,
      assetWaived: false, assetWaivedDate: null,
      billGroupId: String(b.billGroupId || ''),
      createdAt: now.toISOString(),
    };
    // 合并账单：组内必须同一还款节奏（策略③），任何一张卡改还款方式都不得破坏组
    const gErr = groupAssignError(getMyCards(), mc, mc.billGroupId, now);
    if (gErr) return err(gErr);
    const myCards = getMyCards();
    myCards.push(mc);
    store.write('mycards', myCards);
    return json(computeMyCard(mc, now), 201);
  }
  const mcMatch = pathname.match(/^\/api\/mycards\/([^/]+)$/);
  if (mcMatch && method === 'PUT') {
    const myCards = getMyCards();
    const i = myCards.findIndex((m) => m.id === mcMatch[1]);
    if (i < 0) return err('持卡不存在', 404);
    const b = body || {};
    const cur = myCards[i];
    const fee = (b.feeMonth != null || b.feeDay != null)
      ? U.clampFeeDate(b.feeMonth != null ? b.feeMonth : cur.feeMonth, b.feeDay != null ? b.feeDay : cur.feeDay)
      : { m: cur.feeMonth, d: cur.feeDay };
    const repayMode = b.repayMode === 'afterBill' ? 'afterBill' : (b.repayMode === 'fixed' ? 'fixed' : (cur.repayMode || 'fixed'));
    const repayValue = b.repayValue != null
      ? Math.max(0, Math.min(365, Math.round(Number(b.repayValue) || 0)))
      : (b.repaymentDay != null ? clampDay(b.repaymentDay, 20) : (cur.repayValue != null ? cur.repayValue : cur.repaymentDay || 20));
    const updated = {
      ...cur,
      alias: String(b.alias != null ? b.alias : cur.alias).trim(),
      creditLimit: b.creditLimit != null ? nonNeg(b.creditLimit, 0) : cur.creditLimit,
      billingDay: b.billingDay != null ? clampDay(b.billingDay, 1) : cur.billingDay,
      repayMode,
      repayValue,
      repaymentDay: repayMode === 'fixed' ? Math.min(31, Math.max(1, repayValue || 20)) : cur.repaymentDay,
      graceDays: b.graceDays != null ? Math.max(0, Math.min(30, Math.round(Number(b.graceDays) || 0))) : (cur.graceDays || 0),
      waivedYear: b.waivedYear != null ? Math.max(0, Math.round(Number(b.waivedYear) || 0)) : (cur.waivedYear || 0),
      countPeriodYear: b.countPeriodYear != null ? Math.max(0, Math.round(Number(b.countPeriodYear) || 0)) : (cur.countPeriodYear || 0),
      maxInterestDays: b.maxInterestDays != null ? Math.max(0, Math.min(120, Math.round(Number(b.maxInterestDays) || 0))) : (cur.maxInterestDays || 0),
      feeMonth: fee.m,
      feeDay: fee.d,
      last4: b.last4 != null ? String(b.last4).replace(/\D/g, '').slice(0, 4) : cur.last4,
      monthlySpendTarget: b.monthlySpendTarget != null ? nonNeg(b.monthlySpendTarget, 0) : cur.monthlySpendTarget,
      billGroupId: b.billGroupId != null ? String(b.billGroupId) : (cur.billGroupId || ''),
    };
    // 合并账单一致性（策略③）：无论是改本卡还款日、还是把卡挪进/挪出某个组，
    // 都要以「改完之后」的状态重新校验，避免组内出现两个还款节奏
    const gErr = groupAssignError(myCards.filter((x) => x.id !== cur.id).concat([updated]), updated, updated.billGroupId, now);
    if (gErr) return err(gErr);
    if (b.benefits !== undefined) {
      updated.benefits = normalizeBenefits(b.benefits, []);
      // 权益被移除后，其使用记录按 id 归属已无人可展示（历史与次数都查不到），
      // 留着只会随每次编辑无限累积，这里随权益列表一起清理
      const kept = new Set(updated.benefits.map((x) => x.id));
      const recs = getBenefits();
      const remain = recs.filter((r) => !(r.myCardId === cur.id && r.bid && !kept.has(r.bid)));
      if (remain.length !== recs.length) store.write('benefits', remain);
    }
    myCards[i] = updated;
    store.write('mycards', myCards);
    return json(computeMyCard(updated, now));
  }
  if (mcMatch && method === 'DELETE') {
    const myCards = getMyCards();
    if (!myCards.some((m) => m.id === mcMatch[1])) return err('持卡不存在', 404);
    store.write('mycards', myCards.filter((m) => m.id !== mcMatch[1]));
    store.write('consumptions', getConsumptions().filter((r) => r.myCardId !== mcMatch[1]));
    store.write('benefits', getBenefits().filter((r) => r.myCardId !== mcMatch[1]));
    // 删掉的是组内最后一张卡时，组本身已无意义（成员关系记在卡上，空组不会自动消失）
    cleanBillGroups();
    return json({ ok: true });
  }

  // ---- 消费记录 ----
  const consMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions$/);
  if (consMatch && method === 'GET') {
    const mc = getMyCards().find((m) => m.id === consMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const scope = url.searchParams.get('scope') || 'all';
    let recs = amountRecordsOf(mc.id);
    const now2 = new Date();
    if (scope === 'month') recs = recs.filter((r) => r.date >= U.toDateStr(new Date(now2.getFullYear(), now2.getMonth(), 1)));
    else if (scope === 'year') recs = recs.filter((r) => r.date >= U.toDateStr(new Date(now2.getFullYear(), 0, 1)));
    recs = recs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1)));
    const total = recs.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return json({ records: recs, total, count: recs.length });
  }
  if (consMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === consMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const b = body || {};
    const date = U.parseDateStr(b.date) ? String(b.date) : U.todayStr();
    const amount = Number(b.amount);
    if (!isFinite(amount) || amount <= 0) return err('金额必须大于 0');
    if (amount > MAX_MONEY) return err('金额超出允许范围');
    const rec = {
      id: U.uid(), myCardId: mc.id, date, type: 'amount',
      amount: Math.round(amount * 100) / 100,
      channel: CHANNELS.includes(b.channel) ? b.channel : CHANNELS[0],
      category: CATEGORIES.includes(b.category) ? b.category : '其他',
      note: String(b.note || '').trim(),
      createdAt: now.toISOString(),
    };
    const recs = getConsumptions();
    recs.push(rec);
    store.write('consumptions', recs);
    return json(rec, 201);
  }
  const cntMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions\/count$/);
  if (cntMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === cntMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const b = body || {};
    const count = validCount(b.count);
    if (count === null) return err('补录笔数必须为大于 0 的整数');
    const rec = {
      id: U.uid(), myCardId: mc.id, type: 'count',
      date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
      count,
      createdAt: now.toISOString(),
    };
    const recs = getConsumptions();
    recs.push(rec);
    store.write('consumptions', recs);
    return json(rec, 201);
  }

  // 删除单条消费记录（金额类）；笔数补录不支持删除（进度按笔累计、无撤销语义）
  const consDelMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions\/([^/]+)$/);
  if (consDelMatch && method === 'DELETE') {
    const mc = getMyCards().find((m) => m.id === consDelMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const recs = getConsumptions();
    const rec = recs.find((r) => r.id === consDelMatch[2] && r.myCardId === mc.id);
    if (!rec) return err('消费记录不存在', 404);
    if (rec.type !== 'amount') return err('笔数补录记录不支持删除');
    store.write('consumptions', recs.filter((r) => r.id !== rec.id));
    return json({ ok: true });
  }

  // ---- 权益 ----
  const benHisMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/history$/);
  if (benHisMatch && method === 'GET') {
    const mc = getMyCards().find((m) => m.id === benHisMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const ref = resolveBenefit(mc, +benHisMatch[2], url.searchParams.get('bid'));
    if (!ref) return err('权益不存在', 404);
    return json(benefitHistory(mc, ref.idx, ref.bid));
  }
  const benUseMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/usage$/);
  if (benUseMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === benUseMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const ref = resolveBenefit(mc, +benUseMatch[2], (body || {}).bid);
    // 越界索引必须拒绝：computeMyCard 的 benefitUsed 对不存在权益返回 exhausted=false，
    // 若这里放行就会写入 idx 找不到权益的垃圾记录（永远无人展示、也无法清理）
    if (!ref) return err('权益不存在', 404);
    const idx = ref.idx;
    const st = benefitUsed(mc, idx, now);
    // 有效期已过：computeMyCard 已把 exhausted 置 false（避免显示成「次数用完」误导），
    // 因此这里必须单独拦 expired，否则过期权益仍能写入记录
    if (st.expired) return err('当前权益已过有效期');
    if (st.exhausted) return err('当前权益次数已用完');
    const b = body || {};
    const rec = {
      id: U.uid(), myCardId: mc.id, idx, bid: ref.bid, type: 'usage',
      date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
      note: String(b.note || '').trim(),
      createdAt: now.toISOString(),
    };
    const recs = getBenefits();
    recs.push(rec);
    store.write('benefits', recs);
    return json({ ok: true, used: st.used + 1, total: st.total }, 201);
  }
  const benCntMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/count$/);
  if (benCntMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === benCntMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const ref = resolveBenefit(mc, +benCntMatch[2], (body || {}).bid);
    if (!ref) return err('权益不存在', 404);
    const idx = ref.idx;
    const st = benefitUsed(mc, idx, now);
    const b = body || {};
    const count = validCount(b.count);
    if (count === null) return err('补录次数必须为大于 0 的整数');
    if (st.expired) return err('当前权益已过有效期');
    // -1 = 不限次，不做上限拦截（之前 st.used + count > -1 恒为真，不限次权益无法补录）
    if (st.total >= 0 && st.used + count > st.total) return err('当前权益次数已用完（剩余 ' + Math.max(0, st.total - st.used) + ' 次）');
    const rec = {
      id: U.uid(), myCardId: mc.id, idx, bid: ref.bid, type: 'count',
      date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
      count,
      createdAt: now.toISOString(),
    };
    const recs = getBenefits();
    recs.push(rec);
    store.write('benefits', recs);
    return json({ ok: true, used: st.used + count, total: st.total }, 201);
  }
  // ---- 合并账单组（CRUD）----
  if (pathname === '/api/billgroups' && method === 'GET') {
    const myCards = getMyCards();
    const groups = getBillGroups().map((g) => {
      const members = myCards.filter((m) => m.billGroupId === g.id);
      return {
        ...g,
        memberIds: members.map((m) => m.id),
        memberCount: members.length,
        // 组内统一还款节奏（成员必然一致，否则组无法建立）；空组回退显示为空
        lastPayDate: members.length ? D.paymentInfo(members[0], now).lastPayDate : '',
      };
    });
    return json(groups);
  }
  if (pathname === '/api/billgroups' && method === 'POST') {
    const b = body || {};
    const name = String(b.name || '').trim();
    if (!name) return err('请填写账单组名称');
    const groups = getBillGroups();
    if (groups.some((g) => g.name === name)) return err('已存在同名账单组');
    const ids = Array.isArray(b.memberIds) ? b.memberIds.map(String) : [];
    const myCards = getMyCards();
    const picked = [];
    for (const id of ids) {
      const m = myCards.find((x) => x.id === id);
      if (!m) return err('持卡不存在: ' + id, 404);
      if (picked.some((x) => x.id === id)) continue;
      picked.push(m);
    }
    if (picked.length < 2) return err('账单组至少需要 2 张卡');
    // 组内两两校验还款节奏一致（策略③）
    for (let i = 1; i < picked.length; i++) {
      if (!sameRepaySchedule(picked[0], picked[i], now)) {
        return err('「' + (picked[i].alias || picked[i].name) + '」与「' + (picked[0].alias || picked[0].name) + '」的最后还款日不一致，无法合并（组内卡必须同还款日）');
      }
    }
    const g = { id: U.uid(), name, createdAt: now.toISOString() };
    groups.push(g);
    store.write('billGroups', groups);
    for (const m of picked) m.billGroupId = g.id;
    store.write('mycards', myCards);
    return json(g, 201);
  }
  const bgMatch = pathname.match(/^\/api\/billgroups\/([^/]+)$/);
  if (bgMatch && method === 'PUT') {
    const groups = getBillGroups();
    const i = groups.findIndex((g) => g.id === bgMatch[1]);
    if (i < 0) return err('账单组不存在', 404);
    const b = body || {};
    const name = String(b.name != null ? b.name : groups[i].name).trim();
    if (!name) return err('请填写账单组名称');
    if (groups.some((g, k) => k !== i && g.name === name)) return err('已存在同名账单组');
    const myCards = getMyCards();
    if (Array.isArray(b.memberIds)) {
      const ids = b.memberIds.map(String);
      const picked = [];
      for (const id of ids) {
        const m = myCards.find((x) => x.id === id);
        if (!m) return err('持卡不存在: ' + id, 404);
        if (!picked.some((x) => x.id === id)) picked.push(m);
      }
      if (picked.length && picked.length < 2) return err('账单组至少需要 2 张卡');
      for (let k = 1; k < picked.length; k++) {
        if (!sameRepaySchedule(picked[0], picked[k], now)) {
          return err('「' + (picked[k].alias || picked[k].name) + '」与「' + (picked[0].alias || picked[0].name) + '」的最后还款日不一致，无法合并（组内卡必须同还款日）');
        }
      }
      const set = new Set(picked.map((m) => m.id));
      for (const m of myCards) {
        if (m.billGroupId === groups[i].id && !set.has(m.id)) m.billGroupId = '';
        else if (set.has(m.id)) m.billGroupId = groups[i].id;
      }
      store.write('mycards', myCards);
    }
    groups[i] = { ...groups[i], name };
    store.write('billGroups', groups);
    // 成员被清空（memberIds 提交 []）时组随之解散，避免留下无成员的僵尸组
    cleanBillGroups();
    return json(groups[i]);
  }
  if (bgMatch && method === 'DELETE') {
    const groups = getBillGroups();
    if (!groups.some((g) => g.id === bgMatch[1])) return err('账单组不存在', 404);
    const myCards = getMyCards();
    let changed = false;
    for (const m of myCards) {
      if (m.billGroupId === bgMatch[1]) { m.billGroupId = ''; changed = true; }
    }
    if (changed) store.write('mycards', myCards);
    store.write('billGroups', groups.filter((g) => g.id !== bgMatch[1]));
    return json({ ok: true });
  }

  // ---- 账单流水（月账单 + 是否已还）----
  if (pathname === '/api/bills' && method === 'GET') {
    const q = url.searchParams;
    let list = getBills();
    const cardId = q.get('myCardId');
    const month = q.get('month');
    const paid = q.get('paid');
    if (cardId) list = list.filter((b) => b.myCardId === cardId);
    if (month) list = list.filter((b) => b.month === month);
    if (paid) list = list.filter((b) => b.paid === paid);
    return json(list.sort((a, b) => (a.month < b.month ? 1 : -1)));
  }
  if (pathname === '/api/bills' && method === 'POST') {
    const b = body || {};
    if (!b.myCardId) return err('缺少 myCardId');
    if (!getMyCards().some((m) => m.id === b.myCardId)) return err('持卡不存在', 404);
    if (!/^\d{4}-\d{2}$/.test(String(b.month || ''))) return err('出账月份格式应为 YYYY-MM');
    const amount = Number(b.amount);
    if (!isFinite(amount) || amount < 0) return err('账单金额必须不小于 0');
    const bills = getBills();
    if (bills.some((x) => x.myCardId === b.myCardId && x.month === b.month)) {
      return err('该卡该月份账单已存在');
    }
    const rec = {
      id: U.uid(),
      myCardId: b.myCardId,
      month: String(b.month),
      amount: Math.round(amount * 100) / 100,
      // 日期一律经真实校验（拒绝 2026-02-30 / 2026-13-01 这类不存在的日期）
      dueDate: U.parseDateStr(b.dueDate) ? String(b.dueDate) : '',
      paid: b.paid === '已还' ? '已还' : '未还',
      paidDate: U.parseDateStr(b.paidDate) ? String(b.paidDate) : '',
      note: String(b.note || '').trim(),
      createdAt: now.toISOString(),
    };
    bills.push(rec);
    store.write('bills', bills);
    return json(rec, 201);
  }
  const billMatch = pathname.match(/^\/api\/bills\/([^/]+)$/);
  if (billMatch && method === 'PUT') {
    const bills = getBills();
    const i = bills.findIndex((b) => b.id === billMatch[1]);
    if (i < 0) return err('账单不存在', 404);
    const b = body || {};
    const cur = bills[i];
    const amount = b.amount != null ? Number(b.amount) : cur.amount;
    if (!isFinite(amount) || amount < 0) return err('账单金额必须不小于 0');
    const paid = b.paid == null ? cur.paid : (b.paid === '已还' ? '已还' : '未还');
    // 日期一律经真实校验；未显式传入时沿用旧值（旧值若非法则清空/回填今天）
    const dueDate = b.dueDate != null
      ? (U.parseDateStr(b.dueDate) ? String(b.dueDate) : '')
      : (U.parseDateStr(cur.dueDate) ? cur.dueDate : '');
    const paidDate = b.paidDate != null
      ? (U.parseDateStr(b.paidDate) ? String(b.paidDate) : '')
      : (paid === '已还' ? (U.parseDateStr(cur.paidDate) ? cur.paidDate : U.todayStr()) : '');
    bills[i] = {
      ...cur,
      amount: Math.round(amount * 100) / 100,
      dueDate,
      paid,
      // 标记已还且未填还款日期时自动填今天；改回未还则清空
      paidDate,
      note: b.note != null ? String(b.note).trim() : cur.note,
    };
    store.write('bills', bills);
    return json(bills[i]);
  }
  if (billMatch && method === 'DELETE') {
    const bills = getBills();
    if (!bills.some((b) => b.id === billMatch[1])) return err('账单不存在', 404);
    store.write('bills', bills.filter((b) => b.id !== billMatch[1]));
    return json({ ok: true });
  }
  const billGenMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/bills\/generate$/);
  if (billGenMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === billGenMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const info = D.paymentInfo(mc, now);
    const month = (body && /^\d{4}-\d{2}$/.test(String(body.month || ''))) ? String(body.month) : info.billMonth;
    const bills = getBills();
    const exist = bills.find((b) => b.myCardId === mc.id && b.month === month);
    if (exist) return json(exist);
    const rec = {
      id: U.uid(),
      myCardId: mc.id,
      month,
      amount: 0,
      dueDate: info.dueDate,
      paid: '未还',
      paidDate: '',
      note: '',
      createdAt: now.toISOString(),
    };
    bills.push(rec);
    store.write('bills', bills);
    return json(rec, 201);
  }

  // ---- 提醒功能 ----
  if (pathname === '/api/notify/config' && method === 'GET') {
    return json(reminder.normalizeConfig(getNotifyRaw()));
  }
  if (pathname === '/api/notify/config' && method === 'PUT') {
    const cfg = reminder.normalizeConfig(Object.assign({}, getNotifyRaw(), body || {}, {
      // sentLog/history 不能被前端覆盖，只允许通过 check 结果更新
      sentLog: (getNotifyRaw() || {}).sentLog || {},
      history: (getNotifyRaw() || {}).history || [],
    }));
    store.write('notify', cfg);
    return json(cfg);
  }
  if (pathname === '/api/notify/test' && method === 'POST') {
    const cfg = reminder.normalizeConfig(getNotifyRaw());
    const enabled = notifier.enabledChannels(cfg);
    if (!enabled.length) return err('请先启用至少一个提醒通道');
    const results = await notifier.notifyAll(cfg, '管卡提醒测试', '这是一条来自管卡的**测试提醒**。\n\n- 通道：' + enabled.join('、') + '\n- 时间：' + new Date().toLocaleString('zh-CN'));
    const okCount = results.filter((r) => r.ok).length;
    return json({ ok: okCount > 0, results });
  }
  if (pathname === '/api/notify/check' && method === 'POST') {
    return json(await runNotifyChecks(true)); // 手动触发：忽略节流
  }
  if (pathname === '/api/notify/history' && method === 'GET') {
    const cfg = reminder.normalizeConfig(getNotifyRaw());
    return json({ history: cfg.history || [], enabled: cfg.enabled, intervalMinutes: cfg.intervalMinutes });
  }

  const ptsMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/points$/);
  if (ptsMatch && method === 'POST') {
    const myCards = getMyCards();
    const mc = myCards.find((m) => m.id === ptsMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    mc.pointsDeducted = !!(body || {}).value;
    mc.pointsDeductDate = mc.pointsDeducted ? U.todayStr() : null;
    store.write('mycards', myCards);
    return json({ ok: true, pointsDeducted: mc.pointsDeducted, pointsDeductDate: mc.pointsDeductDate });
  }
  const assetMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/asset$/);
  if (assetMatch && method === 'POST') {
    const myCards = getMyCards();
    const mc = myCards.find((m) => m.id === assetMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    mc.assetWaived = !!(body || {}).value;
    mc.assetWaivedDate = mc.assetWaived ? U.todayStr() : null;
    store.write('mycards', myCards);
    return json({ ok: true, assetWaived: mc.assetWaived, assetWaivedDate: mc.assetWaivedDate });
  }

  return undefined;
}

function clampDay(v, dflt) {
  const n = Math.round(Number(v));
  if (!isFinite(n) || n < 1) return dflt;
  return Math.min(31, n);
}

// 非负金额（额度/目标/年费）：空值/负值回退默认，封顶 1 万亿防脏数据
const MAX_MONEY = 1e12;
const MAX_COUNT = 1e6;
function nonNeg(v, dflt) {
  if (v == null || String(v).trim() === '') return dflt || 0;
  const n = U.parseAmount(v);
  if (!isFinite(n) || n < 0) return dflt || 0;
  return Math.min(MAX_MONEY, n);
}

// 次数类输入（补录笔数/权益次数）：正整数且封顶
function validCount(v) {
  const n = Math.round(Number(v));
  if (!isFinite(n) || n <= 0) return null;
  return Math.min(MAX_COUNT, n);
}

function normalizeBenefits(benefits, fallbackNames) {
  // 只看「是不是数组」而不是「有没有元素」：编辑时把权益全部删掉会提交 []，
  // 若把空数组也当成「未提供」，卡种默认权益就会复活，用户永远删不干净
  if (Array.isArray(benefits)) {
    return benefits.map((b) => {
      const rawTotal = Math.round(Number(b.total));
      const total = isFinite(rawTotal) ? (rawTotal < 0 ? -1 : rawTotal) : 1; // -1 = 不限次
      const type = String(b.type || b.benefitType || '').trim();
      const validUntil = U.parseDateStr(b.validUntil) ? String(b.validUntil) : '';
      return {
        // 稳定 id：权益可增删/重排，若使用记录只认索引会整体错位（B 继承 A 的历史）
        id: (typeof b.id === 'string' && b.id) ? b.id : U.uid(),
        name: String(b.name || '').trim() || '权益',
        type: BENEFIT_TYPES.includes(type) ? type : (type || ''),
        total,
        resetCycle: RESET_CYCLES.includes(b.resetCycle) ? b.resetCycle : '自然年',
        validUntil,
      };
    }).filter((b) => b.name);
  }
  // 未填写时按卡种权益默认：次数 1、自然年
  return (fallbackNames || []).map((name) => ({ id: U.uid(), name, total: 1, resetCycle: '自然年' }));
}

// 定位权益：优先按稳定 id（增删/重排后索引会前移，仅按索引会错配记录）；无 id 时回退索引
function resolveBenefit(mc, idx, bid) {
  const bens = mc.benefits || [];
  if (bid) {
    const i = bens.findIndex((b) => b && b.id === bid);
    if (i < 0) return null;
    return { idx: i, bid: bens[i].id };
  }
  if (!Number.isInteger(idx) || idx < 0 || idx >= bens.length) return null;
  return { idx, bid: bens[idx].id || '' };
}

// 提醒检查：force=true 时忽略节流（手动触发）；否则按 intervalMinutes 节流
// 检查包含网络推送（可能数秒），用互斥标志防止定时 tick 与手动 check 并发执行 → 重复推送
let notifyChecking = false;
async function runNotifyChecks(force) {
  if (notifyChecking) return { skipped: true, reason: '上一次提醒检查仍在进行中' };
  notifyChecking = true;
  try {
    return await runNotifyChecksInner(force);
  } finally {
    notifyChecking = false;
  }
}

async function runNotifyChecksInner(force) {
  const cfg = reminder.normalizeConfig(getNotifyRaw());
  if (!cfg.enabled) return { skipped: true, reason: '提醒未启用' };
  if (!force && cfg.lastCheckAt) {
    const gap = (Date.now() - new Date(cfg.lastCheckAt).getTime()) / 60000;
    if (gap < cfg.intervalMinutes) return { skipped: true, reason: `距上次检查 ${Math.round(gap)} 分钟，未达 ${cfg.intervalMinutes} 分钟间隔` };
  }
  const idx = buildIndexes();
  const now = new Date();
  const cards = getMyCards().map((m) => computeMyCard(m, now, idx));
  const out = await reminder.runChecks(cards, cfg, notifier, now, getBills());
  cfg.lastCheckAt = now.toISOString();
  // 回写时只覆盖「检查自身产生」的字段（lastCheckAt/sentLog/history），其余字段以最新配置为准。
  // 推送是网络操作（可能数秒），期间用户可能改了通道或规则；若直接回写整份 cfg 会把用户的改动抹掉。
  const latest = reminder.normalizeConfig(getNotifyRaw());
  latest.lastCheckAt = cfg.lastCheckAt;
  latest.sentLog = cfg.sentLog;
  latest.history = cfg.history;
  store.write('notify', latest);
  return Object.assign({ skipped: false }, out);
}

// 卡种信息变更后同步所有持卡的快照字段
function syncMyCardSnapshots() {
  const myCards = getMyCards();
  // 先建一次索引：此前在循环内每次 getCards().find(...)，复杂度 O(持卡数 × 卡种数)
  const byId = new Map(getCards().map((c) => [c.id, c]));
  let changed = false;
  for (const mc of myCards) {
    const c = byId.get(mc.cardId);
    if (!c) continue;
    const before = JSON.stringify(mc);
    mc.bank = c.bank; mc.name = c.name; mc.org = c.org; mc.level = c.level;
    mc.annualFee = c.annualFee; mc.waiverType = c.waiverType; mc.waiverCondition = c.waiverCondition; mc.waiverPolicy = c.waiverPolicy;
    if (JSON.stringify(mc) !== before) changed = true;
  }
  if (changed) store.write('mycards', myCards);
}

module.exports = {
  init, handle, runNotifyChecks,
  _internals: { computeMyCard, computeStats, benefitUsed, benefitHistory, waiverState, normalizeCard, normalizeBenefits, cardKey, buildIndexes, resolveBenefit, sameRepaySchedule, groupAssignError },
};
