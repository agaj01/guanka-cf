'use strict';

const crypto = require('crypto');
const U = require('./util');
const { SEED_CARDS, SEED_VERSION } = require('./seed');
const notifier = require('./notifier');
const reminder = require('./reminder');

const CARD_FIELDS = ['bank', 'name', 'level', 'org', 'annualFee', 'waiverType', 'waiverCondition', 'waiverPolicy', 'startCredit', 'benefits', 'applyCondition', 'note'];
const CSV_HEADER = ['银行', '卡片名称', '卡等级', '卡组织', '年费', '免年费类型', '刷免条件', '免年费政策', '起批额度', '主要权益', '申请条件', '备注'];
const WAIVER_TYPES = ['消费刷免', '笔数刷免', '积分抵扣', '资产存免', '刚性', '免年费'];
const RESET_CYCLES = ['自然月', '自然年', '年费日'];
const CHANNELS = ['微信支付', '支付宝支付', '云闪付线上', '云闪付线下', 'ApplePay', '其他手机Pay', '美团支付', '抖音支付', '京东支付', '程支付', '多多支付', 'POS机刷卡'];
const CATEGORIES = ['餐饮', '购物', '交通', '加油', '超市', '旅行', '娱乐', '医疗', '教育', '其他'];

let store;

function init(s) {
  store = s;
  const meta = store.read('meta', { seedVersion: 0 });
  let cards = store.read('cards', null);
  if (!Array.isArray(cards) || cards.length === 0) {
    cards = SEED_CARDS.map((c) => normalizeCard(c, null));
    store.write('cards', cards);
      store.write('meta', { seedVersion: SEED_VERSION });
  } else if (meta.seedVersion !== SEED_VERSION) {
    // 升级时合并新卡种：已存在的（银行+名称+组织+等级）不重复导入
    const keys = new Set(cards.map(cardKey));
    let added = 0;
    for (const c of SEED_CARDS) {
      const k = cardKey(c);
      if (!keys.has(k)) { cards.push(normalizeCard(c, null)); keys.add(k); added++; }
    }
    store.write('cards', cards);
    store.write('meta', { seedVersion: SEED_VERSION });
    if (added > 0) console.log(`[管卡] 卡种库已合并 ${added} 张新卡，当前共 ${cards.length} 张`);
  }
  store.read('mycards', []);
  store.read('consumptions', []);
  store.read('benefits', []);
  store.read('settings', { theme: 'light', bankOrder: [], banksCollapsed: {}, cardBanksCollapsed: {} });
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
function getConsumptions() { return store.read('consumptions', []); }
function getBenefits() { return store.read('benefits', []); }
function getMyCards() { return store.read('mycards', []); }
function getCards() { return store.read('cards', []); }

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
    if (!m.has(r.idx)) m.set(r.idx, []);
    m.get(r.idx).push(r);
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
    return { ...b, used: u.used, exhausted: u.exhausted };
  });
  const monthSpend = recs.amount.filter((r) => r.date >= monthStart).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const yearSpend = recs.amount.filter((r) => r.date >= yearStart).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return {
    ...mc,
    benefits,
    recent: recs.amount.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    monthSpend, yearSpend, totalSpend: recs.amount.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    monthCount: recs.amount.filter((r) => r.date >= monthStart).length,
    yearCount: recs.amount.filter((r) => r.date >= yearStart).length,
    totalCount: recs.amount.length,
    monthProgress: mc.monthlySpendTarget > 0 ? Math.min(100, Math.round((monthSpend / mc.monthlySpendTarget) * 100)) : 0,
    feeDays: days,
    feeDaysColor: feeDaysColor(days, ws.needsPayment),
    nextFeeDate: U.toDateStr(U.nextFeeDate(mc.feeMonth, mc.feeDay, now)),
    waiver: ws,
  };
}

function computeStats(now, idx) {
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
  const feeExpiring = myCards
    .map((m) => computeMyCard(m, now, idx))
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
function benefitRecords(idx, myCardId, benefitIdx) {
  const m = idx.benByCard.get(myCardId);
  return (m && m.get(benefitIdx)) || [];
}

function benefitUsage(myCardId, idx) {
  return getBenefits().filter((r) => r.myCardId === myCardId && r.idx === idx);
}

function benefitUsed(mc, idx, now, index) {
  now = now || new Date();
  const b = (mc.benefits || [])[idx];
  if (!b) return { used: 0, total: 0, exhausted: false, cycle: '自然月' };
  const start = U.cycleStart(b.resetCycle, mc.feeMonth, mc.feeDay, now);
  const startStr = U.toDateStr(start);
  const recs = (index ? benefitRecords(index, mc.id, idx) : benefitUsage(mc.id, idx)).filter((r) => r.date >= startStr);
  const used = recs.filter((r) => r.type === 'usage').length
    + recs.filter((r) => r.type === 'count').reduce((s, r) => s + (Number(r.count) || 0), 0);
  return { used, total: Number(b.total) || 0, exhausted: used >= (Number(b.total) || 0), cycle: b.resetCycle, cycleStart: startStr };
}

function benefitHistory(mc, idx) {
  const recs = benefitUsage(mc.id, idx);
  const b = (mc.benefits || [])[idx];
  if (!b) return [];
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
  if (pathname === '/api/meta') return json({ channels: CHANNELS, categories: CATEGORIES, waiverTypes: WAIVER_TYPES, resetCycles: RESET_CYCLES, csvHeader: CSV_HEADER });
  if (pathname === '/api/shutdown') return { shutdown: true };

  // ---- 设置 ----
  if (pathname === '/api/settings' && method === 'GET') return json(store.read('settings', {}));
  if (pathname === '/api/settings' && method === 'PUT') {
    const cur = store.read('settings', {});
    const patch = body || {};
    const allowed = ['theme', 'bankOrder', 'banksCollapsed', 'cardBanksCollapsed'];
    for (const k of allowed) if (k in patch) cur[k] = patch[k];
    store.write('settings', cur);
    return json(cur);
  }

  // ---- 统计 ----
  if (pathname === '/api/stats') return json(computeStats(now));

  // ---- 卡种库 ----
  if (pathname === '/api/cards' && method === 'GET') {
    return json(store.read('cards', []));
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
    // 与统计合并返回，避免前端二次全量计算（原 /api/stats 单独请求重复遍历）
    return json({ data, stats: computeStats(now, idx), banks: [...new Set(data.map((m) => m.bank))] });
  }
  if (pathname === '/api/mycards' && method === 'POST') {
    const b = body || {};
    if (!b.cardId) return err('缺少 cardId');
    const card = getCards().find((c) => c.id === b.cardId);
    if (!card) return err('卡种不存在', 404);
    const fee = U.clampFeeDate(b.feeMonth, b.feeDay);
    const mc = {
      id: U.uid(),
      cardId: card.id,
      bank: card.bank, name: card.name, org: card.org, level: card.level,
      annualFee: card.annualFee, waiverType: card.waiverType, waiverCondition: card.waiverCondition, waiverPolicy: card.waiverPolicy,
      alias: String(b.alias || '').trim(),
      creditLimit: nonNeg(b.creditLimit, card.startCredit),
      billingDay: clampDay(b.billingDay, 1),
      repaymentDay: clampDay(b.repaymentDay, 20),
      feeMonth: fee.m,
      feeDay: fee.d,
      last4: String(b.last4 || '').replace(/\D/g, '').slice(0, 4),
      monthlySpendTarget: nonNeg(b.monthlySpendTarget, 0),
      benefits: normalizeBenefits(b.benefits, card.benefits),
      pointsDeducted: false, pointsDeductDate: null,
      assetWaived: false, assetWaivedDate: null,
      createdAt: now.toISOString(),
    };
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
    const updated = {
      ...cur,
      alias: String(b.alias != null ? b.alias : cur.alias).trim(),
      creditLimit: b.creditLimit != null ? nonNeg(b.creditLimit, 0) : cur.creditLimit,
      billingDay: b.billingDay != null ? clampDay(b.billingDay, 1) : cur.billingDay,
      repaymentDay: b.repaymentDay != null ? clampDay(b.repaymentDay, 20) : cur.repaymentDay,
      feeMonth: fee.m,
      feeDay: fee.d,
      last4: b.last4 != null ? String(b.last4).replace(/\D/g, '').slice(0, 4) : cur.last4,
      monthlySpendTarget: b.monthlySpendTarget != null ? nonNeg(b.monthlySpendTarget, 0) : cur.monthlySpendTarget,
    };
    if (b.benefits !== undefined) updated.benefits = normalizeBenefits(b.benefits, []);
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

  // ---- 权益 ----
  const benHisMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/history$/);
  if (benHisMatch && method === 'GET') {
    const mc = getMyCards().find((m) => m.id === benHisMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    return json(benefitHistory(mc, +benHisMatch[2]));
  }
  const benUseMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/usage$/);
  if (benUseMatch && method === 'POST') {
    const mc = getMyCards().find((m) => m.id === benUseMatch[1]);
    if (!mc) return err('持卡不存在', 404);
    const idx = +benUseMatch[2];
    const st = benefitUsed(mc, idx, now);
    if (st.exhausted) return err('当前权益次数已用完');
    const b = body || {};
    const rec = {
      id: U.uid(), myCardId: mc.id, idx, type: 'usage',
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
    const idx = +benCntMatch[2];
    const st = benefitUsed(mc, idx, now);
    const b = body || {};
    const count = validCount(b.count);
    if (count === null) return err('补录次数必须为大于 0 的整数');
    if (st.used + count > st.total) return err('当前权益次数已用完（剩余 ' + Math.max(0, st.total - st.used) + ' 次）');
    const rec = {
      id: U.uid(), myCardId: mc.id, idx, type: 'count',
      date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
      count,
      createdAt: now.toISOString(),
    };
    const recs = getBenefits();
    recs.push(rec);
    store.write('benefits', recs);
    return json({ ok: true, used: st.used + count, total: st.total }, 201);
  }
  // ---- 提醒功能 ----
  if (pathname === '/api/notify/config' && method === 'GET') {
    return json(reminder.normalizeConfig(store.read('notify', null)));
  }
  if (pathname === '/api/notify/config' && method === 'PUT') {
    const cfg = reminder.normalizeConfig(Object.assign({}, store.read('notify', null), body || {}, {
      // sentLog/history 不能被前端覆盖，只允许通过 check 结果更新
      sentLog: (store.read('notify', null) || {}).sentLog || {},
      history: (store.read('notify', null) || {}).history || [],
    }));
    store.write('notify', cfg);
    return json(cfg);
  }
  if (pathname === '/api/notify/test' && method === 'POST') {
    const cfg = reminder.normalizeConfig(store.read('notify', null));
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
    const cfg = reminder.normalizeConfig(store.read('notify', null));
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
  if (Array.isArray(benefits) && benefits.length) {
    return benefits.map((b) => ({
      name: String(b.name || '').trim() || '权益',
      total: Math.max(0, Math.round(Number(b.total) || 0)),
      resetCycle: RESET_CYCLES.includes(b.resetCycle) ? b.resetCycle : '自然年',
    })).filter((b) => b.name);
  }
  // 未填写时按卡种权益默认：次数 1、自然年
  return (fallbackNames || []).map((name) => ({ name, total: 1, resetCycle: '自然年' }));
}

// 提醒检查：force=true 时忽略节流（手动触发）；否则按 intervalMinutes 节流
async function runNotifyChecks(force) {
  const cfg = reminder.normalizeConfig(store.read('notify', null));
  if (!cfg.enabled) return { skipped: true, reason: '提醒未启用' };
  if (!force && cfg.lastCheckAt) {
    const gap = (Date.now() - new Date(cfg.lastCheckAt).getTime()) / 60000;
    if (gap < cfg.intervalMinutes) return { skipped: true, reason: `距上次检查 ${Math.round(gap)} 分钟，未达 ${cfg.intervalMinutes} 分钟间隔` };
  }
  const idx = buildIndexes();
  const now = new Date();
  const cards = getMyCards().map((m) => computeMyCard(m, now, idx));
  const out = await reminder.runChecks(cards, cfg, notifier, now);
  cfg.lastCheckAt = now.toISOString();
  store.write('notify', cfg);
  return Object.assign({ skipped: false }, out);
}

// 卡种信息变更后同步所有持卡的快照字段
function syncMyCardSnapshots() {
  const myCards = getMyCards();
  let changed = false;
  for (const mc of myCards) {
    const c = getCards().find((x) => x.id === mc.cardId);
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
  _internals: { computeMyCard, computeStats, benefitUsed, benefitHistory, waiverState, normalizeCard, cardKey, buildIndexes },
};
