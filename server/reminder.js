'use strict';

/* 提醒引擎：生成提醒项 → 去重 → 推送 → 记录
 * 依赖注入：调用方传入「已计算的持卡列表」（含 feeDays/waiver/monthSpend 等），
 * 避免与 routes 形成循环依赖。
 */

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); } // m: 1-12

function todayStr(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

const DEFAULT_CONFIG = {
  enabled: true,
  intervalMinutes: 60,
  lastCheckAt: '',
  channels: {
    wxpusher: { enabled: false, appToken: '', uids: '', topicIds: '', summaryPrefix: '管卡提醒' },
    serverchan: { enabled: false, sendkey: '' },
    bark: { enabled: false, deviceKey: '', server: 'https://api.day.app', level: 'active', group: '管卡' },
  },
  rules: { feeDays: [30, 7, 1], repayBeforeDays: 3, taskRemainDays: 3, billBeforeDays: 3, billOverdueRemind: 1 },
  sentLog: {},
  history: [],
};

function normalizeConfig(raw) {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const r = raw || {};
  cfg.enabled = r.enabled === undefined ? true : !!r.enabled;
  cfg.intervalMinutes = Math.max(5, Math.min(1440, Number(r.intervalMinutes) || 60));
  if (r.channels) {
    for (const k of Object.keys(cfg.channels)) {
      const src = r.channels[k] || {};
      cfg.channels[k].enabled = !!src.enabled;
      for (const f of Object.keys(src)) {
        if (f === 'enabled') continue;
        cfg.channels[k][f] = String(src[f] === undefined ? (cfg.channels[k][f] || '') : src[f]);
      }
    }
  }
  if (r.rules) {
    const days = Array.isArray(r.rules.feeDays) ? r.rules.feeDays.map(Number).filter((n) => Number.isFinite(n) && n >= 0) : null;
    cfg.rules.feeDays = days && days.length ? days.slice().sort((a, b) => b - a) : DEFAULT_CONFIG.rules.feeDays.slice();
    cfg.rules.repayBeforeDays = Number(r.rules.repayBeforeDays) || 0;
    cfg.rules.taskRemainDays = Number(r.rules.taskRemainDays) || 0;
    cfg.rules.billBeforeDays = r.rules.billBeforeDays == null ? DEFAULT_CONFIG.rules.billBeforeDays : (Number(r.rules.billBeforeDays) || 0);
    cfg.rules.billOverdueRemind = r.rules.billOverdueRemind == null ? 1 : (r.rules.billOverdueRemind ? 1 : 0);
  }
  cfg.sentLog = (r.sentLog && typeof r.sentLog === 'object') ? r.sentLog : {};
  cfg.history = Array.isArray(r.history) ? r.history.slice(0, 30) : [];
  cfg.lastCheckAt = r.lastCheckAt || '';

  // 敏感项支持环境变量注入（配置为空时兜底）
  const wp = cfg.channels.wxpusher;
  if (!wp.appToken && process.env.WXPUSHER_APP_TOKEN) wp.appToken = process.env.WXPUSHER_APP_TOKEN;
  if (!wp.uids && process.env.WXPUSHER_UIDS) wp.uids = process.env.WXPUSHER_UIDS;
  const sc = cfg.channels.serverchan;
  if (!sc.sendkey && process.env.SERVERCHAN_SENDKEY) sc.sendkey = process.env.SERVERCHAN_SENDKEY;
  const bk = cfg.channels.bark;
  if (!bk.deviceKey && process.env.BARK_DEVICE_KEY) bk.deviceKey = process.env.BARK_DEVICE_KEY;
  if (!bk.server) bk.server = DEFAULT_CONFIG.channels.bark.server;
  return cfg;
}

/** 还款日距今（旧口径，仅固定还款日估算；提醒引擎已改用日期引擎 payment.payDaysLeft，此函数保留给外部脚本复用） */
function daysToRepay(repayDay, now) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  const d = Math.min(Math.max(1, Number(repayDay) || 1), daysInMonth(y, m));
  const target = new Date(y, m - 1, d);
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let diff = Math.round((target - t0) / 86400000);
  if (diff < 0) {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    const nd = Math.min(Math.max(1, Number(repayDay) || 1), daysInMonth(ny, nm));
    const nt = new Date(ny, nm - 1, nd);
    diff = Math.round((nt - t0) / 86400000);
  }
  return diff;
}

function feeItem(m, days, feeDayThreshold) {
  const w = m.waiver || {};
  const name = m.alias || m.name || '未命名卡片';
  let remain = '';
  if (w.kind === '消费刷免') remain = `已完成 ¥${money(w.progress)} / ¥${money(w.target)}，还差 ¥${money(w.remaining)}`;
  else if (w.kind === '笔数刷免') remain = `已完成 ${w.progress} / ${w.target} 笔，还差 ${w.remaining} 笔`;
  else if (w.kind === '积分抵扣') remain = '需积分抵扣，当前未抵扣';
  else if (w.kind === '资产存免') remain = '需资产达标，当前未达标';
  else if (w.kind === '刚性') remain = '刚性年费，必须缴费';
  const title = days === 0 ? `年费今日收取：${name}` : `年费提醒：${name} 还有 ${days} 天`;
  const body = [
    `- 银行：${m.bank || '—'}`,
    `- 卡片：${m.name || '—'}${m.alias ? `（${m.alias}）` : ''}`,
    `- 年费：¥${money(m.annualFee)}`,
    `- 收取日：${m.nextFeeDate || '—'}（还有 ${days} 天）`,
    `- 状态：${w.statusText || (w.needsPayment ? '需缴费' : '已免')}${remain ? `｜${remain}` : ''}`,
  ].join('\n');
  return {
    type: 'fee',
    // key 必须区分「倒数第 N 天」与「年费当天」：否则 feeDays 从 1 跨到 0 时 key 相同，
    // 当天那条「年费今日收取」会被去重逻辑吞掉、永远发不出去
    key: `fee:${m.id}:${m.nextFeeDate}:${days === 0 ? 'today' : feeDayThreshold}`,
    title, body,
  };
}

function repayItem(m, days) {
  const name = m.alias || m.name || '未命名卡片';
  const p = m.payment || {};
  const title = days === 0 ? `今日还款：${name}` : `还款提醒：${name} ${days} 天后到期`;
  const body = [
    `- 银行：${m.bank || '—'}`,
    `- 卡片：${m.name || '—'}${m.alias ? `（${m.alias}）` : ''}`,
    `- 本期账单日：${p.billDate || '—'}`,
    `- 银行到期日：${p.dueDate || '—'}${p.isInGrace ? '（宽限期内，仍可还款）' : ''}`,
    `- 最后还款日：${p.lastPayDate || '—'}（${days === 0 ? '就是今天' : `还有 ${days} 天`}）`,
    `- 额度：¥${money(m.creditLimit)}`,
  ].join('\n');
  // key 按最后还款日去重：同一天同一张卡只推一次，跨期（日期变化）可再次提醒
  return { type: 'repay', key: `repay:${m.id}:${p.lastPayDate || todayStr().slice(0, 7)}`, title, body };
}

function taskItem(m, remainDays, gap) {
  const name = m.alias || m.name || '未命名卡片';
  const title = `刷卡任务：${name} 还差 ¥${money(gap)}`;
  const body = [
    `- 银行：${m.bank || '—'}`,
    `- 卡片：${m.name || '—'}${m.alias ? `（${m.alias}）` : ''}`,
    `- 本月消费：¥${money(m.monthSpend)} / 目标 ¥${money(m.monthlySpendTarget)}`,
    `- 还差：¥${money(gap)}（本月剩 ${remainDays} 天）`,
  ].join('\n');
  return { type: 'task', key: `task:${m.id}:${todayStr().slice(0, 7)}`, title, body };
}

function billItem(b, m, daysLeft) {
  const name = (m && (m.alias || m.name)) || '未命名卡片';
  const title = daysLeft < 0 ? `账单逾期未还：${name}（${b.month}）` : `账单提醒：${name} ${daysLeft === 0 ? '今日到期' : `还有 ${daysLeft} 天`}`;
  const body = [
    `- 银行：${(m && m.bank) || '—'}`,
    `- 卡片：${(m && m.name) || '—'}${(m && m.alias) ? `（${m.alias}）` : ''}`,
    `- 出账月份：${b.month}`,
    `- 账单金额：¥${money(b.amount)}`,
    `- 到期还款日：${b.dueDate}${daysLeft < 0 ? `（已逾期 ${Math.abs(daysLeft)} 天）` : ''}`,
    daysLeft < 0 ? '- 状态：**仍未标记为已还**，请尽快处理' : '- 状态：未还',
  ].join('\n');
  return { type: 'bill', key: `bill:${b.myCardId}:${b.month}:${daysLeft < 0 ? 'overdue' : 'due'}`, title, body };
}

/** 收集所有待提醒项（不含去重判断）。bills 为账单流水（月账单 + 是否已还） */
function collectReminders(cards, cfg, now, bills) {
  now = now || new Date();
  const items = [];
  const remainDaysInMonth = daysInMonth(now.getFullYear(), now.getMonth() + 1) - now.getDate();

  for (const m of cards || []) {
    // ① 年费到期：取「已跨越且最接近」的阈值，每个阈值只提醒一次
    if (m.waiver && m.waiver.needsPayment && Number.isFinite(m.feeDays) && m.feeDays >= 0) {
      const applicable = cfg.rules.feeDays.filter((d) => m.feeDays <= d).sort((a, b) => a - b);
      if (applicable.length) items.push(feeItem(m, m.feeDays, applicable[0]));
    }
    // ② 还款日：基于日期引擎的「最后可还款日」（含宽限期与 afterBill 模式）。
    //    旧实现按固定 repaymentDay + daysToRepay 估算，对「账单日后 N 天」还款的卡会按错误日期提醒，且宽限期不参与。
    if (cfg.rules.repayBeforeDays > 0 && m.payment && Number.isFinite(m.payment.payDaysLeft)) {
      const d = m.payment.payDaysLeft;
      // 跳期后 payDaysLeft 指向下期最后还款日（最长约 2 个月），仅在提醒窗口内触发；
      // 真正「已逾期」的账单由账单流水（billOverdueRemind）负责提醒
      if (d >= 0 && d <= cfg.rules.repayBeforeDays) items.push(repayItem(m, d));
    }
    // ③ 月刷卡任务未达标（月末临近）
    if (cfg.rules.taskRemainDays > 0 && m.monthlySpendTarget > 0) {
      const gap = Math.max(0, Number(m.monthlySpendTarget) - Number(m.monthSpend || 0));
      if (gap > 0 && remainDaysInMonth <= cfg.rules.taskRemainDays) items.push(taskItem(m, remainDaysInMonth, gap));
    }
  }
  // ④ 账单流水：未还账单到期前提醒 + 已过到期日仍未还的逾期提醒
  const byId = new Map((cards || []).map((m) => [m.id, m]));
  for (const b of bills || []) {
    if (b.paid === '已还' || !b.dueDate) continue;
    const target = new Date(b.dueDate + 'T00:00:00');
    if (isNaN(target.getTime())) continue;
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysLeft = Math.round((target - t0) / 86400000);
    if (daysLeft < 0) {
      if (cfg.rules.billOverdueRemind) items.push(billItem(b, byId.get(b.myCardId), daysLeft));
    } else if (daysLeft <= cfg.rules.billBeforeDays) {
      items.push(billItem(b, byId.get(b.myCardId), daysLeft));
    }
  }
  return items;
}

/** 执行检查并推送：去重（同一 key 只推一次）→ 发送 → 记录历史 */
async function runChecks(cards, cfg, notifier, now, bills) {
  now = now || new Date();
  const date = todayStr(now);
  const items = collectReminders(cards, cfg, now, bills);
  const pending = items.filter((it) => !cfg.sentLog[it.key]);
  const results = [];
  for (const it of pending) {
    const sent = await notifier.notifyAll(cfg, it.title, it.body);
    const okList = sent.filter((s) => s.ok).map((s) => s.label);
    const errList = sent.filter((s) => !s.ok).map((s) => `${s.label}: ${s.error}`);
    if (sent.length === 0) {
      results.push({ type: it.type, key: it.key, title: it.title, ok: false, error: '没有已启用的提醒通道' });
    } else {
      cfg.sentLog[it.key] = date;
      results.push({ type: it.type, key: it.key, title: it.title, ok: okList.length > 0, sent: okList, error: errList.join('；') });
    }
    pushHistory(cfg, {
      time: now.toISOString(),
      type: it.type,
      title: it.title,
      channels: sent,
      ok: okList.length > 0,
    });
  }
  return { checked: items.length, sent: pending.length, results };
}

function pushHistory(cfg, entry) {
  cfg.history = cfg.history || [];
  cfg.history.unshift(entry);
  if (cfg.history.length > 30) cfg.history = cfg.history.slice(0, 30);
}

module.exports = {
  DEFAULT_CONFIG, normalizeConfig, collectReminders, runChecks, daysToRepay, todayStr,
};
