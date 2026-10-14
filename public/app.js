/* ============================================================
 * 管卡 — 信用卡管理工具（Docker 版）前端 SPA
 * 数据全部来自 /api，无构建步骤，原生 ES2018+
 * ============================================================ */
'use strict';

// ---------- 工具 ----------
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n) { return (Number(n) || 0).toLocaleString('zh-CN'); }
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function api(path, opts) {
  opts = opts || {};
  const headers = opts.headers || {};
  let body = opts.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(path, { method: opts.method || 'GET', headers, body });
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) return res.text();
  const data = await res.json();
  // 未授权：统一弹登录框（服务端已把「需登录」标在 401/403 上）
  if (!res.ok) {
    if (data.needAuth || data.needToken) { showLogin(data.error); }
    throw new Error(data.error || ('请求失败 ' + res.status));
  }
  return data;
}

// ---------- 访问控制 ----------
let loginShown = false;

function showLogin(message) {
  const root = $('#modal-root');
  // 已展示则只更新提示，避免重复叠加登录层
  if (loginShown && $('#login-token')) {
    const tip = $('#login-tip');
    if (tip && message) { tip.textContent = message; tip.style.display = ''; }
    return;
  }
  loginShown = true;
  root.innerHTML =
    '<div class="modal-wrap" id="modal-wrap">' +
    '<div class="modal" id="modal" style="width:min(420px,100%)">' +
    '<div class="modal-header"><div class="modal-title">需要访问令牌</div></div>' +
    '<div class="modal-body">' +
    '<div style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:12px">' +
    '本服务已启用访问控制。请输入启动容器时设置的 <code>AUTH_TOKEN</code> 环境变量的值。' +
    '令牌只保存在服务端，浏览器仅持有一个 HttpOnly 会话 Cookie。' +
    '</div>' +
    '<input id="login-token" type="password" placeholder="AUTH_TOKEN" autocomplete="current-password" style="width:100%">' +
    '<div id="login-tip" style="font-size:12px;color:var(--red);margin-top:8px;display:' + (message ? '' : 'none') + '">' + esc(message || '') + '</div>' +
    '</div>' +
    '<div class="modal-footer"><button class="btn primary" id="login-submit">登录</button></div>' +
    '</div></div>';
  const wrap = $('#modal-wrap');
  requestAnimationFrame(() => { if (wrap.isConnected) wrap.classList.add('show'); });
  const input = $('#login-token');
  const submit = async () => {
    const token = input.value.trim();
    if (!token) { $('#login-tip').textContent = '请输入令牌'; $('#login-tip').style.display = ''; return; }
    try {
      await api('/api/auth/login', { method: 'POST', body: { token } });
      loginShown = false;
      $('#modal-root').innerHTML = '';
      toast('已登录');
      await loadAll();
    } catch (e) {
      $('#login-tip').textContent = e.message;
      $('#login-tip').style.display = '';
    }
  };
  $('#login-submit').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.focus();
}

async function checkAuth() {
  try {
    const st = await api('/api/auth/status');
    const btn = $('#btn-logout');
    // 仅在「服务端启用了鉴权」时显示登出按钮；回环免登录模式下隐藏
    if (btn) btn.style.display = st.authRequired ? '' : 'none';
    return st;
  } catch (e) { return { authRequired: false, authorized: true }; }
}

function toast(msg, type) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
}

function confirmDialog(msg) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML =
      '<div class="modal show" style="width:min(400px,100%)">' +
      '<div class="modal-header"><div class="modal-title">请确认</div></div>' +
      '<div class="modal-body" style="font-size:14px">' + esc(msg) + '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn" data-act="no">取消</button>' +
      '<button class="btn primary" data-act="yes">确定</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = (v) => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 200); resolve(v); };
    wrap.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act) return close(act.dataset.act === 'yes');
      if (e.target === wrap) close(false);
    });
  });
}

// ---------- 全局状态 ----------
const state = {
  page: 'mycards',
  meta: { channels: [], categories: [], waiverTypes: [], resetCycles: [] },
  settings: { theme: 'light', bankOrder: [], banksCollapsed: {}, cardBanksCollapsed: {} },
  myCards: [],
  cards: [],
  bills: [],
  billGroups: [],
  stats: null,
  drawerId: null,
  filter: 'all',
  sort: 'name',
};

const CYCLE_BADGE = { '自然月': 'badge-blue', '自然年': 'badge-purple', '年费日': 'badge-orange' };
const FEE_BADGE = { default: 'badge-default', yellow: 'badge-yellow', red: 'badge-red' };

// ---------- 启动 ----------
async function boot() {
  applyTheme(state.settings.theme);
  bindNav();
  await checkAuth();
  await loadAll();
}

async function loadAll() {
  // mycards 响应已合并 stats/banks（服务端一次索引计算），省去一次全量统计请求
  let settings, meta, mycardsResp, cards, bills;
  try {
    [settings, meta, mycardsResp, cards, bills] = await Promise.all([
      api('/api/settings'), api('/api/meta'), api('/api/mycards'), api('/api/cards'), api('/api/bills'),
    ]);
  } catch (e) {
    // 未授权：showLogin 已由 api() 弹出，这里静默退出避免覆盖登录层
    if (/未授权|非本地访问|令牌/.test(e.message)) return;
    throw e;
  }
  state.settings = settings;
  state.meta = meta;
  state.myCards = mycardsResp.data || mycardsResp;
  state.stats = mycardsResp.stats || (await api('/api/stats'));
  state.billGroups = mycardsResp.billGroups || [];
  state.cards = cards;
  state.bills = bills || [];
  applyTheme(settings.theme || 'light');
  render();
}

function bindNav() {
  $$('.nav-item').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      state.page = a.dataset.page;
      $$('.nav-item').forEach((x) => x.classList.toggle('active', x === a));
      render();
    });
  });
  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#btn-notify').addEventListener('click', openNotifyModal);
  const logout = $('#btn-logout');
  if (logout) logout.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch (e) { /* 忽略 */ }
    location.reload();
  });
}

// ---------- 主题 ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}
async function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  state.settings.theme = next;
  try { await api('/api/settings', { method: 'PUT', body: { theme: next } }); } catch (e) { /* 忽略 */ }
}

// ---------- 渲染入口 ----------
function render() {
  const app = $('#app');
  if (state.page === 'mycards') app.innerHTML = renderMyCards();
  else app.innerHTML = renderCardsDB();
  bindPageEvents();
  if (state.page === 'mycards') renderDrawer();
}

function orderedBanks(banks) {
  const order = state.settings.bankOrder || [];
  const known = order.filter((b) => banks.includes(b));
  const rest = banks.filter((b) => !known.includes(b)).sort((a, b) => a.localeCompare(b, 'zh'));
  return known.concat(rest);
}

// ---------- 页面一：我的持卡 ----------
function renderMyCards() {
  const s = state.stats;
  const feeNames = s.feeExpiring.map((f) => esc(f.name)).join('、');
  let html =
    '<div class="stats">' +
    statCard('持卡总数', fmtInt(s.totalCards) + ' 张', '共 ' + fmtInt(s.totalBanks) + ' 家银行', false) +
    statCard('各银行最高授信合计', fmtMoney(s.maxCreditSum), '每家银行取最高额度相加', false) +
    statCard('本月总消费', fmtMoney(s.monthSpend), '年度总消费 ' + fmtMoney(s.yearSpend), false) +
    statCard('年费即将到期', fmtInt(s.feeExpiring.length) + ' 张', s.feeExpiring.length ? '30 天内需缴费：' + feeNames : '暂无需要缴费的卡', s.feeExpiring.length > 0, 'stat-fee-expiring') +
    '</div>' +
    '<div class="toolbar">' +
    '<button class="btn primary" id="btn-add-card">＋ 添加持卡</button>' +
    '<button class="btn" id="btn-billgroups">合并账单</button>' +
    '<button class="btn" id="btn-export">导出持卡</button>' +
    '<button class="btn" id="btn-backup-export">备份</button>' +
    '<button class="btn" id="btn-backup-import">恢复</button>' +
    '<select id="filter-select" class="filter-select">' +
    option('all', '全部卡片', true) + option('repay', '本月需还款', true) + option('fee', '年费临近(30天)', true) +
    option('met', '年费已达标', true) + option('unpaid', '有未还账单', true) + option('benefit', '有剩余权益', true) +
    '</select>' +
    '<select id="sort-select" class="filter-select">' +
    option('name', '按名称') + option('fee', '按年费临近') + option('repay', '按还款临近') + option('bank', '按银行') +
    '</select>' +
    '<div class="spacer"></div>' +
    '<span style="font-size:12px;color:var(--text-3)">数据保存在 Docker 卷中，重启不丢失</span>' +
    '</div>';

  if (!state.myCards.length) {
    return html + '<div class="empty-tip">还没有持卡，点右上角「添加持卡」开始管理吧</div>';
  }

  const filtered = applyFilterSort(state.myCards);
  if (!filtered.length) {
    return html + '<div class="empty-tip">当前筛选条件下没有卡片，换个筛选试试</div>';
  }

  // 非名称/银行排序时以平铺列表展示（排序优先级高于分组）
  if (state.sort !== 'name' && state.sort !== 'bank') {
    return html + '<div class="bank-group"><div class="bank-body">' + filtered.map(cardRowHtml).join('') + '</div></div>';
  }

  const byBank = {};
  for (const m of filtered) {
    if (!byBank[m.bank]) byBank[m.bank] = [];
    byBank[m.bank].push(m);
  }
  const collapsed = state.settings.banksCollapsed || {};
  for (const bank of orderedBanks(Object.keys(byBank))) {
    const list = byBank[bank].slice().sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name, 'zh'));
    const isCollapsed = !!collapsed[bank];
    html +=
      '<div class="bank-group' + (isCollapsed ? ' collapsed' : '') + '" data-bank="' + esc(bank) + '">' +
      '<div class="bank-header" data-act="toggle-bank">' +
      '<span class="collapse-arrow">▾</span>' +
      '<span class="bank-name">' + esc(bank) + '</span>' +
      '<span class="bank-count">' + list.length + ' 张</span>' +
      '<span class="bank-actions">' +
      '<button class="btn icon" data-act="bank-up" title="上移银行">↑</button>' +
      '<button class="btn icon" data-act="bank-down" title="下移银行">↓</button>' +
      '</span></div>' +
      '<div class="bank-body">';
    for (const m of list) html += cardRowHtml(m);
    html += '</div></div>';
  }
  return html;
}

// isFilter：filter 与 sort 下拉框取值有交集（fee/repay），选中态必须各比各的，否则交叉误标
function option(value, label, isFilter) {
  const sel = isFilter ? state.filter === value : state.sort === value;
  return '<option value="' + value + '"' + (sel ? ' selected' : '') + '>' + label + '</option>';
}

function applyFilterSort(list) {
  let out = list.slice();
  const f = state.filter;
  if (f === 'repay') out = out.filter((m) => (m.payment && m.payment.payDaysLeft <= 7));
  else if (f === 'fee') out = out.filter((m) => m.waiver.needsPayment && m.feeDays <= 30);
  else if (f === 'met') out = out.filter((m) => m.feeStatus && m.feeStatus !== '未达标');
  else if (f === 'unpaid') out = out.filter((m) => unpaidCount(m) > 0);
  else if (f === 'benefit') out = out.filter((m) => (m.benefits || []).some((b) => b.total < 0 || (b.remaining != null && b.remaining > 0)));
  const s = state.sort;
  if (s === 'fee') out.sort((a, b) => a.feeDays - b.feeDays);
  else if (s === 'repay') out.sort((a, b) => (a.payment ? a.payment.payDaysLeft : 999) - (b.payment ? b.payment.payDaysLeft : 999));
  else if (s === 'bank') out.sort((a, b) => String(a.bank).localeCompare(String(b.bank), 'zh'));
  return out;
}

function statCard(label, value, sub, warn, id) {
  return '<div class="stat-card' + (id ? ' clickable' : '') + '"' + (id ? ' id="' + id + '"' : '') + '>' +
    '<div class="stat-label">' + label + '</div>' +
    '<div class="stat-value' + (warn ? ' warn' : '') + '">' + value + '</div>' +
    '<div class="stat-sub">' + sub + '</div></div>';
}

function cardRowHtml(m) {
  const p = m.payment || {};
  const groupBadge = m.billGroupId
    ? '<span class="badge badge-purple" title="已合并账单：还款提醒只推 1 条">合并账单 · ' + esc(m.billGroupName || '未命名组') + '</span>'
    : '';
  return '<div class="card-row" data-id="' + m.id + '">' +
    '<div><div class="card-name">' + esc(m.name) + (m.alias ? '<span class="alias">“' + esc(m.alias) + '”</span>' : '') + (groupBadge ? ' ' + groupBadge : '') + '</div>' +
    '<div class="card-sub">' + esc(m.bank) + ' · ' + esc(m.org) + ' · ' + esc(m.level) + ' · 额度 ' + fmtMoney(m.creditLimit) + (m.last4 ? ' · 尾号 ' + esc(m.last4) : '') + '</div>' +
    '<div class="card-sub">还款 ' + esc(p.dueDate || '—') + (p.lastPayDate && p.lastPayDate !== p.dueDate ? '（最晚 ' + esc(p.lastPayDate) + '）' : '') + ' · 账单日 ' + (m.billingDay || '—') + '</div></div>' +
    '<div class="waiver-cell">' + waiverCellHtml(m) + '</div>' +
    '<div class="fee-cell">' + repayBadgeHtml(m) + ' ' + feeBadgeHtml(m) + '</div>' +
    '<div><button class="btn small" data-act="detail">详情</button></div>' +
    '</div>';
}

const REPAY_BADGE = { '已逾期': 'badge-red', '今日到期': 'badge-red', '3天内': 'badge-yellow', '本周内': 'badge-yellow', '正常': 'badge-default' };
const FEE_ALERT_BADGE = { '无年费': 'badge-green', '本年豁免': 'badge-green', '已过日': 'badge-red', '7天内': 'badge-red', '本月内': 'badge-yellow', '正常': 'badge-default' };

function repayBadgeHtml(m) {
  const p = m.payment || {};
  const txt = p.repayAlert || '正常';
  if (txt === '正常') return '';
  return '<span class="badge ' + (REPAY_BADGE[txt] || 'badge-default') + '">还款' + esc(txt) + '</span>';
}

function feeBadgeHtml(m) {
  const alert = m.feeAlert;
  // 豁免态直接显示状态；其余保留「还有 N 天」主信息，再叠加预警标签
  if (alert === '无年费' || alert === '本年豁免') return '<span class="badge badge-green">' + esc(alert) + '</span>';
  const cls = FEE_ALERT_BADGE[alert] || (FEE_BADGE[m.feeDaysColor] || 'badge-default');
  const main = m.waiver.needsPayment ? '年费还有 ' + m.feeDays + ' 天' : '年费已免';
  let s = '<span class="badge ' + cls + '">' + main + '</span>';
  if (alert && alert !== '正常') s += ' <span class="badge ' + cls + '">' + esc(alert) + '</span>';
  return s;
}

function waiverCellHtml(m) {
  const w = m.waiver;
  switch (w.kind) {
    case '免年费':
      return '<span class="badge badge-green">免年费</span>';
    case '刚性':
      return '<span class="badge badge-red">刚性年费</span>';
    case '积分抵扣': {
      const on = m.pointsDeducted;
      return '<button class="slider-toggle' + (on ? ' on' : '') + '" data-act="toggle-points" data-id="' + m.id + '" title="点击切换抵扣状态">' +
        '<span class="slider-track"><span class="slider-knob"></span></span>' +
        '<span><span class="slider-label">' + (on ? '已抵扣' : '未抵扣') + '</span>' +
        (on && m.pointsDeductDate ? '<div class="slider-date">' + esc(m.pointsDeductDate) + '</div>' : '') +
        '</span></button>';
    }
    case '资产存免': {
      const on = m.assetWaived;
      return '<button class="slider-toggle' + (on ? ' on' : '') + '" data-act="toggle-asset" data-id="' + m.id + '" title="需要存款 ' + esc(m.waiverCondition || '0') + '，达标后点击标记">' +
        '<span class="slider-track"><span class="slider-knob"></span></span>' +
        '<span><span class="slider-label">' + (on ? '已达标' : '未达标') + '</span>' +
        (on && m.assetWaivedDate ? '<div class="slider-date">' + esc(m.assetWaivedDate) + '</div>' : '') +
        '</span></button>';
    }
    case '消费刷免':
    case '笔数刷免': {
      const pct = w.target > 0 ? Math.min(100, Math.round((w.progress / w.target) * 100)) : 0;
      const unit = w.unit === '元' ? fmtMoney(w.progress) + ' / ' + fmtMoney(w.target) : fmtInt(w.progress) + ' / ' + fmtInt(w.target) + ' 笔';
      const done = w.met;
      return '<div class="progress">' +
        '<div class="progress-track"><div class="progress-fill' + (done ? ' done' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-text"><span>' + unit + '</span>' +
        (done ? '<span style="color:var(--green);font-weight:600">已达标</span>'
          : '<span class="remaining">剩余 ' + (w.unit === '元' ? fmtMoney(w.remaining) : fmtInt(w.remaining) + ' 笔') + '</span>') +
        '</div></div>';
    }
    default:
      return '';
  }
}

// ---------- 页面二：卡种数据库 ----------
function renderCardsDB() {
  let html =
    '<div class="page-title">卡种数据库</div>' +
    '<div class="page-desc">市面上常见卡的重要信息（内置 ' + state.cards.length + ' 张 / ' + new Set(state.cards.map((c) => c.bank)).size + ' 家银行），添加持卡时从这里选卡</div>' +
    '<div class="toolbar">' +
    '<button class="btn primary" id="btn-new-card-type">＋ 新增卡种</button>' +
    '<button class="btn" id="btn-import">批量导入 CSV</button>' +
    '<div class="spacer"></div></div>';

  if (!state.cards.length) return html + '<div class="empty-tip">卡种库为空，点「新增卡种」或「批量导入」添加</div>';

  const byBank = {};
  for (const c of state.cards) {
    if (!byBank[c.bank]) byBank[c.bank] = [];
    byBank[c.bank].push(c);
  }
  const collapsed = state.settings.cardBanksCollapsed || {};
  for (const bank of orderedBanks(Object.keys(byBank))) {
    const list = byBank[bank].slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    const isCollapsed = collapsed[bank] !== false; // 首次默认收起
    html +=
      '<div class="bank-group' + (isCollapsed ? ' collapsed' : '') + '" data-bank="' + esc(bank) + '">' +
      '<div class="bank-header" data-act="toggle-cardbank">' +
      '<span class="collapse-arrow">▾</span><span class="bank-name">' + esc(bank) + '</span>' +
      '<span class="bank-count">' + list.length + ' 张</span>' +
      '</div><div class="bank-body"><table class="db-table"><thead><tr>' +
      '<th>卡片名称</th><th>卡组织</th><th>卡等级</th><th>起批额度</th><th>年费</th><th>免年费类型</th><th>免年费政策</th><th>主要权益</th><th>操作</th>' +
      '</tr></thead><tbody>';
    for (const c of list) {
      html += '<tr data-id="' + c.id + '">' +
        '<td><b>' + esc(c.name) + '</b></td>' +
        '<td>' + esc(c.org) + '</td>' +
        '<td>' + esc(c.level) + '</td>' +
        '<td>' + (c.startCredit ? fmtMoney(c.startCredit) : '—') + '</td>' +
        '<td>' + (c.annualFee ? fmtMoney(c.annualFee) : '免') + '</td>' +
        '<td>' + esc(c.waiverType) + (c.waiverCondition && c.waiverCondition !== '0' ? '（' + esc(c.waiverCondition) + '）' : '') + '</td>' +
        '<td style="max-width:180px">' + esc(c.waiverPolicy) + '</td>' +
        '<td class="db-benefits">' + esc((c.benefits || []).join(' | ')) + '</td>' +
        '<td class="db-actions">' +
        '<button class="btn small" data-act="edit-card-type">编辑</button>' +
        '<button class="btn small danger" data-act="del-card-type">删除</button>' +
        '</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }
  return html;
}

// ---------- 页面事件 ----------
function bindPageEvents() {
  const app = $('#app');

  // 统计卡：年费到期点击
  const feeCard = $('#stat-fee-expiring', app);
  if (feeCard) feeCard.addEventListener('click', showFeeExpiring);

  // 添加持卡 / 导出
  const addBtn = $('#btn-add-card', app);
  if (addBtn) addBtn.addEventListener('click', openAddCardModal);
  const expBtn = $('#btn-export', app);
  if (expBtn) expBtn.addEventListener('click', exportCards);
  const backupExpBtn = $('#btn-backup-export', app);
  if (backupExpBtn) backupExpBtn.addEventListener('click', exportBackup);
  const backupImpBtn = $('#btn-backup-import', app);
  if (backupImpBtn) backupImpBtn.addEventListener('click', openBackupImportModal);
  const bgBtn = $('#btn-billgroups', app);
  if (bgBtn) bgBtn.addEventListener('click', openBillGroupsModal);

  const filterSel = $('#filter-select', app);
  if (filterSel) filterSel.addEventListener('change', (e) => { state.filter = e.target.value; render(); });
  const sortSel = $('#sort-select', app);
  if (sortSel) sortSel.addEventListener('change', (e) => { state.sort = e.target.value; render(); });

  // 卡种库按钮
  const newType = $('#btn-new-card-type', app);
  if (newType) newType.addEventListener('click', () => openCardTypeModal(null));
  const impBtn = $('#btn-import', app);
  if (impBtn) impBtn.addEventListener('click', openImportModal);

  // 银行分组
  $$('.bank-header', app).forEach((h) => {
    h.addEventListener('click', (e) => {
      const actEl = e.target.closest('[data-act]');
      const group = h.closest('.bank-group');
      const bank = group.dataset.bank;
      if (actEl && actEl.dataset.act === 'bank-up') { e.stopPropagation(); moveBank(bank, -1); return; }
      if (actEl && actEl.dataset.act === 'bank-down') { e.stopPropagation(); moveBank(bank, 1); return; }
      if (actEl && actEl.dataset.act === 'toggle-bank') toggleCollapse('banksCollapsed', bank);
      if (actEl && actEl.dataset.act === 'toggle-cardbank') toggleCollapse('cardBanksCollapsed', bank);
    });
  });

  // 持卡行
  $$('.card-row', app).forEach((row) => {
    $('[data-act="detail"]', row).addEventListener('click', () => openDrawer(row.dataset.id));
    const pts = $('[data-act="toggle-points"]', row);
    if (pts) pts.addEventListener('click', (e) => { e.stopPropagation(); togglePoints(row.dataset.id); });
    const asset = $('[data-act="toggle-asset"]', row);
    if (asset) asset.addEventListener('click', (e) => { e.stopPropagation(); toggleAsset(row.dataset.id); });
  });

  // 卡种库行
  $$('.db-table tbody tr', app).forEach((tr) => {
    const id = tr.dataset.id;
    $('[data-act="edit-card-type"]', tr).addEventListener('click', () => openCardTypeModal(id));
    $('[data-act="del-card-type"]', tr).addEventListener('click', () => deleteCardType(id));
  });
}

async function toggleCollapse(key, bank) {
  state.settings[key] = state.settings[key] || {};
  state.settings[key][bank] = !state.settings[key][bank];
  render();
  try { await api('/api/settings', { method: 'PUT', body: { [key]: state.settings[key] } }); } catch (e) { /* 忽略 */ }
}

async function moveBank(bank, dir) {
  const banks = orderedBanks([...new Set(state.myCards.map((m) => m.bank))]);
  const i = banks.indexOf(bank);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= banks.length) return;
  banks.splice(j, 0, banks.splice(i, 1)[0]);
  state.settings.bankOrder = banks;
  render();
  try { await api('/api/settings', { method: 'PUT', body: { bankOrder: banks } }); } catch (e) { /* 忽略 */ }
}

async function togglePoints(id) {
  const m = state.myCards.find((x) => x.id === id);
  if (!m) return;
  try {
    await api('/api/mycards/' + id + '/points', { method: 'POST', body: { value: !m.pointsDeducted } });
    toast(m.pointsDeducted ? '已取消抵扣标记' : '已标记积分抵扣');
    await loadAll();
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleAsset(id) {
  const m = state.myCards.find((x) => x.id === id);
  if (!m) return;
  try {
    await api('/api/mycards/' + id + '/asset', { method: 'POST', body: { value: !m.assetWaived } });
    toast(m.assetWaived ? '已取消达标标记' : '已标记资产达标');
    await loadAll();
  } catch (e) { toast(e.message, 'error'); }
}

async function exportCards() {
  if (!state.myCards.length) return toast('还没有持卡可导出', 'error');
  // 下载是浏览器直接发起的新导航，不经过 api()，因此需要手动带上会话凭据：
  // 优先用 fetch + Blob（Cookie 自动携带），失败再退化为带 token 的 location 跳转。
  try {
    const res = await fetch('/api/cards/export');
    if (!res.ok) {
      const ct = res.headers.get('content-type') || '';
      const msg = ct.includes('json') ? (await res.json()).error : ('导出失败 ' + res.status);
      if (res.status === 401 || res.status === 403) showLogin(msg);
      return toast(msg, 'error');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast('导出失败：' + e.message, 'error');
  }
}

// ---------- 持卡备份：导出（全量 JSON，含权益/消费/账单） ----------
async function exportBackup() {
  if (!state.myCards.length) return toast('还没有持卡可备份', 'error');
  try {
    const res = await fetch('/api/mycards/export');
    if (!res.ok) {
      const ct = res.headers.get('content-type') || '';
      const msg = ct.includes('json') ? (await res.json()).error : ('备份导出失败 ' + res.status);
      if (res.status === 401 || res.status === 403) showLogin(msg);
      return toast(msg, 'error');
    }
    const blob = await res.blob();
    // 文件名优先取服务端 Content-Disposition（带日期），取不到就用固定名
    const cd = res.headers.get('content-disposition') || '';
    const m = cd.match(/filename="([^"]+)"/);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (m && m[1]) || 'guanka-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('备份已下载（含持卡、权益、消费、账单）');
  } catch (e) {
    toast('备份导出失败：' + e.message, 'error');
  }
}

// ---------- 持卡备份：恢复（JSON 导入，merge / replace 两种模式） ----------
function openBackupImportModal() {
  openModal('<div class="modal-title">从备份恢复持卡</div>',
    '<div style="font-size:12px;color:var(--text-2);margin-bottom:10px">支持本应用导出的备份 JSON 文件（guanka-backup-*.json）。' +
    '<br>恢复时会自动匹配卡种库（银行+名称+卡组织+卡等级），匹配不上的卡种会自动创建。</div>' +
    '<div class="field" style="margin-bottom:10px"><label>选择备份文件</label><input type="file" id="backup-file" accept=".json,application/json"></div>' +
    '<div class="field" style="margin-bottom:10px"><label>恢复方式</label>' +
    '<select id="backup-mode" style="width:100%">' +
    '<option value="merge">合并（推荐）— 保留现有数据，追加备份中的卡与记录</option>' +
    '<option value="replace">覆盖 — 清空现有持卡数据，完全以备份为准</option>' +
    '</select></div>' +
    '<div id="backup-warn" style="display:none;font-size:12px;color:#c0392b;margin-bottom:8px">⚠️ 覆盖模式会先清空现有持卡、消费、权益与账单数据，且不可撤销，请确认已有备份文件。</div>' +
    '<div id="backup-result" style="margin-top:10px"></div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-do-backup-import">开始恢复</button>');
  $('#backup-mode').addEventListener('change', (e) => {
    $('#backup-warn').style.display = e.target.value === 'replace' ? 'block' : 'none';
  });
  $('#btn-do-backup-import').addEventListener('click', async () => {
    const btn = $('#btn-do-backup-import');
    if (btn.disabled) return;
    const file = $('#backup-file').files[0];
    if (!file) return toast('请选择备份 JSON 文件', 'error');
    const mode = $('#backup-mode').value;
    if (mode === 'replace' && !confirm('确定覆盖？现有持卡数据将被清空，以备份文件为准。')) return;
    btn.disabled = true;
    try {
      const data = JSON.parse(await file.text());
      const r = await api('/api/mycards/import', { method: 'POST', body: { data, mode } });
      const badges =
        '<div class="badge badge-green">恢复 ' + r.importedCards + ' 张持卡</div> ' +
        (r.skippedCards > 0 ? '<div class="badge badge-yellow" style="margin-left:6px">跳过 ' + r.skippedCards + ' 张（卡种匹配失败）</div>' : '') +
        (r.cardTypesAdded > 0 ? '<div class="badge badge-green" style="margin-left:6px">新建卡种 ' + r.cardTypesAdded + ' 个</div>' : '') +
        '<div class="badge" style="margin-left:6px">消费 ' + r.consumptions + ' 条 · 权益 ' + r.benefitRecords + ' 条 · 账单 ' + r.bills + ' 条</div>';
      $('#backup-result').innerHTML = badges +
        (r.groupWarnings && r.groupWarnings.length
          ? '<div style="font-size:12px;color:#b8860b;margin-top:6px">' + r.groupWarnings.map(esc).join('<br>') + '</div>' : '');
      toast('恢复完成');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
    btn.disabled = false;
  });
}

function showFeeExpiring() {
  const list = state.stats.feeExpiring;
  if (!list.length) return toast('30 天内没有需要缴费的卡');
  openModal(
    '<div class="modal-title">年费即将到期（30 天内需缴费）</div>',
    '<table class="record-table"><thead><tr><th>卡片</th><th>银行</th><th>年费</th><th>剩余天数</th></tr></thead><tbody>' +
    list.map((f) => '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.bank) + '</td><td>' + fmtMoney(f.annualFee) + '</td><td style="color:var(--red);font-weight:700">' + f.feeDays + ' 天</td></tr>').join('') +
    '</tbody></table>',
    '<button class="btn primary" data-close>关闭</button>'
  );
}

// ---------- 提醒设置 ----------
function notifyModalHtml(cfg) {
  const c = cfg.channels || {};
  const ch = (key, label, desc, fields) =>
    '<div class="notify-channel">' +
    '<div class="nc-head"><label class="switch"><input type="checkbox" id="nc-' + key + '-enabled"' + (c[key] && c[key].enabled ? ' checked' : '') + '><b>' + label + '</b></label>' +
    '<span class="nc-desc">' + desc + '</span></div>' +
    '<div class="form-grid nc-body">' + fields.map((f) => field(f[1], '<input id="nc-' + key + '-' + f[0] + '"' + (f[2] === 'password' ? ' type="password"' : (f[2] === 'number' ? ' type="number"' : '')) + ' placeholder="' + esc(f[3] || '') + '" value="' + esc((c[key] && c[key][f[0]]) != null ? String(c[key][f[0]]) : '') + '">')).join('') + '</div></div>';

  return (
    '<label class="switch-row"><input type="checkbox" id="n-enabled"' + (cfg.enabled ? ' checked' : '') + '> <b>启用提醒</b>（容器常驻进程定时检查，无需 cron）</label>' +
    ch('wxpusher', 'WxPusher', '微信推送：wxpusher 后台获取 appToken，UID 为接收用户',
      [['appToken', 'appToken', 'password', 'AT_xxx'], ['uids', 'UID（多个用逗号分隔）', 'text', 'UID_xxx'], ['topicIds', '主题ID（可选）', 'text', ''], ['summaryPrefix', '消息前缀', 'text', '管卡提醒']]) +
    ch('serverchan', 'Server酱³', '微信/多端推送：sct.ftqq.com 获取 SendKey（SCT/SCU 开头）',
      [['sendkey', 'SendKey', 'password', 'SCTxxxxx']]) +
    ch('bark', 'Bark', 'iOS 推送：Bark App 中复制 deviceKey（自建服务可改服务器地址）',
      [['deviceKey', 'deviceKey', 'password', ''], ['server', '服务器地址', 'text', 'https://api.day.app'], ['level', '推送级别', 'text', 'active'], ['group', '分组', 'text', '管卡']]) +
    '<div class="notify-rules"><h4>提醒规则</h4><div class="form-grid">' +
    field('年费提前提醒天数（逗号分隔）', '<input id="n-feeDays" value="' + esc((cfg.rules.feeDays || []).join(',')) + '" placeholder="30,7,1">') +
    field('还款日提前天数（0=关闭）', '<input id="n-repayDays" type="number" min="0" value="' + esc(cfg.rules.repayBeforeDays) + '">') +
    field('月任务月末提醒天数（0=关闭）', '<input id="n-taskDays" type="number" min="0" value="' + esc(cfg.rules.taskRemainDays) + '">') +
    field('账单到期提前天数', '<input id="n-billDays" type="number" min="0" value="' + esc(cfg.rules.billBeforeDays) + '">') +
    field('检查间隔（分钟，最小 5）', '<input id="n-interval" type="number" min="5" value="' + esc(cfg.intervalMinutes) + '">') +
    '<div class="field full"><label>账单已过到期日仍未还时提醒</label><select id="n-billOverdue"><option value="1"' + (cfg.rules.billOverdueRemind ? ' selected' : '') + '>开启</option><option value="0"' + (!cfg.rules.billOverdueRemind ? ' selected' : '') + '>关闭</option></select></div>' +
    '</div></div>' +
    '<div id="n-result" class="notify-result"></div>' +
    (cfg.history && cfg.history.length ? '<div class="notify-rules"><h4>最近推送记录</h4>' +
      cfg.history.slice(0, 8).map((h) => '<div class="nh-item"><span class="badge ' + (h.ok ? 'badge-green' : 'badge-red') + '">' + (h.ok ? '已推送' : '失败') + '</span>' +
        '<span class="nh-title">' + esc(h.title) + '</span><span class="nh-time">' + esc(String(h.time).slice(0, 16).replace('T', ' ')) + '</span>' +
        (h.channels || []).map((s2) => '<span class="nh-ch">' + esc(s2.label) + (s2.ok ? ' ✓' : ' ✗') + (s2.ok ? '' : ' ' + esc(s2.error)) + '</span>').join('') +
        '</div>').join('') + '</div>' : '')
  );
}

async function openNotifyModal() {
  let cfg;
  try {
    cfg = await api('/api/notify/config');
  } catch (e) { return toast(e.message, 'error'); }
  openModal('<div class="modal-title">提醒设置</div>', notifyModalHtml(cfg),
    '<button class="btn" data-close>关闭</button>' +
    '<button class="btn" id="n-check">立即检查</button>' +
    '<button class="btn" id="n-test">发送测试</button>' +
    '<button class="btn primary" id="n-save">保存</button>');

  const $n = (id) => document.getElementById(id);
  const collect = () => ({
    enabled: !!($n('n-enabled') && $n('n-enabled').checked),
    intervalMinutes: Number($n('n-interval').value) || 60,
    channels: {
      wxpusher: { enabled: $n('nc-wxpusher-enabled').checked, appToken: $n('nc-wxpusher-appToken').value.trim(), uids: $n('nc-wxpusher-uids').value.trim(), topicIds: $n('nc-wxpusher-topicIds').value.trim(), summaryPrefix: $n('nc-wxpusher-summaryPrefix').value.trim() },
      serverchan: { enabled: $n('nc-serverchan-enabled').checked, sendkey: $n('nc-serverchan-sendkey').value.trim() },
      bark: { enabled: $n('nc-bark-enabled').checked, deviceKey: $n('nc-bark-deviceKey').value.trim(), server: $n('nc-bark-server').value.trim(), level: $n('nc-bark-level').value.trim(), group: $n('nc-bark-group').value.trim() },
    },
    rules: {
      feeDays: String($n('n-feeDays').value).split(/[,，\s]+/).map(Number).filter((x) => isFinite(x) && x >= 0),
      repayBeforeDays: Number($n('n-repayDays').value) || 0,
      taskRemainDays: Number($n('n-taskDays').value) || 0,
      billBeforeDays: Number($n('n-billDays').value) || 0,
      billOverdueRemind: ($n('n-billOverdue') && $n('n-billOverdue').value === '1') ? 1 : 0,
    },
  });

  const showResult = (html) => { const r = $n('n-result'); if (r) r.innerHTML = html; };

  $n('n-save').addEventListener('click', async () => {
    try {
      await api('/api/notify/config', { method: 'PUT', body: collect() });
      toast('提醒设置已保存');
      showResult('<div class="badge badge-green">已保存</div>');
    } catch (e) { showResult('<div class="badge badge-red">' + esc(e.message) + '</div>'); }
  });

  $n('n-test').addEventListener('click', async () => {
    try {
      await api('/api/notify/config', { method: 'PUT', body: collect() });
      const r = await api('/api/notify/test', { method: 'POST', body: {} });
      showResult('<div class="badge ' + (r.ok ? 'badge-green' : 'badge-red') + '">' + (r.ok ? '测试推送成功' : '测试推送失败') + '</div>' +
        (r.results || []).map((s2) => '<div class="nh-item"><span class="badge ' + (s2.ok ? 'badge-green' : 'badge-red') + '">' + esc(s2.label) + '</span>' +
          '<span class="nh-title">' + (s2.ok ? '发送成功' : esc(s2.error)) + '</span></div>').join(''));
    } catch (e) { showResult('<div class="badge badge-red">' + esc(e.message) + '</div>'); }
  });

  $n('n-check').addEventListener('click', async () => {
    try {
      await api('/api/notify/config', { method: 'PUT', body: collect() });
      const r = await api('/api/notify/check', { method: 'POST', body: {} });
      if (r.skipped) { showResult('<div class="badge badge-yellow">' + esc(r.reason || '已跳过') + '</div>'); return; }
      showResult('<div class="badge ' + (r.sent ? 'badge-green' : 'badge-default') + '">检查 ' + r.checked + ' 项，推送 ' + r.sent + ' 项</div>' +
        (r.results || []).map((s2) => '<div class="nh-item"><span class="badge ' + (s2.ok ? 'badge-green' : 'badge-red') + '">' + esc(s2.type) + '</span>' +
          '<span class="nh-title">' + esc(s2.title) + '</span>' + (s2.error ? '<span class="nh-time">' + esc(s2.error) + '</span>' : '') + '</div>').join(''));
    } catch (e) { showResult('<div class="badge badge-red">' + esc(e.message) + '</div>'); }
  });
}

// ---------- 弹窗：合并账单组管理 ----------
// 组本身只存名称，成员关系记在每张卡的 billGroupId 上（服务端强制组内同还款日）
async function openBillGroupsModal(focusGid) {
  const groups = state.billGroups || [];
  const cards = state.myCards || [];
  const memberNames = (g) => cards.filter((x) => x.billGroupId === g.id).map((x) => esc(x.alias || x.name));

  let html = '<div style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:12px">' +
    '把<b>还款日相同</b>的几张卡加入同一组，还款提醒就会合并成 <b>1 条</b>（列出组内所有卡与银行到期日），不再逐卡重复推送。<br>' +
    '年费提醒、月刷卡任务仍按单卡推送（这两类卡片之间本就独立）。</div>';

  if (groups.length) {
    html += groups.map((g) => {
      const names = memberNames(g);
      return '<div class="bg-group" data-gid="' + esc(g.id) + '">' +
        '<div class="bg-head"><span class="bg-name">' + esc(g.name) + '</span>' +
        '<span class="badge badge-purple">' + g.memberCount + ' 张卡</span>' +
        (g.lastPayDate ? '<span class="badge badge-default">最后还款日 ' + esc(g.lastPayDate) + '</span>' : '') +
        '<div class="spacer" style="flex:1"></div>' +
        '<button class="btn small" data-act="bg-edit">编辑</button> ' +
        '<button class="btn small danger" data-act="bg-del">解散</button></div>' +
        '<div class="chip-row" style="margin-top:6px">' + (names.length ? names.map((n) => '<span class="stat-chip">' + n + '</span>').join('') : '<span style="font-size:12px;color:var(--text-3)">暂无成员</span>') + '</div>' +
        '</div>';
    }).join('');
  } else {
    html += '<div class="empty-tip" style="padding:16px">还没有合并账单组，点下面按钮新建</div>';
  }

  html += '<div id="bg-new" style="margin-top:14px">' +
    '<label style="font-size:12px;color:var(--text-2)">新建账单组</label>' +
    '<div class="form-grid" style="margin-top:6px">' +
    field('组名称', '<input id="bg-name" placeholder="如 招行合并还款">') +
    '</div>' +
    '<div style="margin-top:8px"><label style="font-size:12px;color:var(--text-2)">选择成员（至少 2 张，需同还款日）</label>' +
    '<div id="bg-members">' + memberChecklistHtml([]) + '</div></div>' +
    '</div>';

  openModal('<div class="modal-title">合并账单组</div>', html,
    '<button class="btn" data-close>关闭</button><button class="btn primary" id="bg-create">新建账单组</button>');

  const modal = $('.modal-body');
  $$('.bg-group', modal).forEach((el) => {
    const gid = el.dataset.gid;
    $('[data-act="bg-del"]', el).addEventListener('click', async () => {
      if (!(await confirmDialog('解散该组后，组内卡将恢复各自提醒。确定解散？'))) return;
      try {
        await api('/api/billgroups/' + gid, { method: 'DELETE' });
        toast('已解散');
        closeModal();
        await loadAll();
        openBillGroupsModal();
      } catch (e) { toast(e.message, 'error'); }
    });
    $('[data-act="bg-edit"]', el).addEventListener('click', () => openBillGroupEditModal(gid));
  });
  $('#bg-create').addEventListener('click', async () => {
    const name = $('#bg-name').value.trim();
    if (!name) return toast('请填写组名称', 'error');
    const memberIds = $$('#bg-members input:checked').map((x) => x.value);
    if (memberIds.length < 2) return toast('至少选择 2 张卡', 'error');
    try {
      await api('/api/billgroups', { method: 'POST', body: { name, memberIds } });
      toast('账单组已创建');
      closeModal();
      await loadAll();
      openBillGroupsModal();
    } catch (e) { toast(e.message, 'error'); }
  });
  if (focusGid) {
    const el = modal.querySelector('.bg-group[data-gid="' + focusGid + '"]');
    // scrollIntoView 在部分环境（无头浏览器 / 旧内核 / 测试环境）不存在，直接调用会抛 TypeError
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  }
}

/**
 * 成员勾选列表。
 * @param checkedIds 预勾选的持卡 id
 * @param currentGid 当前正在编辑的组 id。属于「本组」的卡必须保持可勾选（否则无法取消勾选移出成员）；
 *                   属于「其它组」的卡置灰并说明原因，避免误选导致服务端拒绝
 */
function memberChecklistHtml(checkedIds, currentGid) {
  const groups = state.billGroups || [];
  return (state.myCards || []).map((m) => {
    const g = groups.find((x) => x.id === m.billGroupId);
    const isSelf = !!(g && currentGid && g.id === currentGid);
    const label = (m.alias || m.name) + ' · ' + m.bank + ' · 还款 ' + ((m.payment && m.payment.lastPayDate) || '—');
    const disabled = (g && !isSelf) ? ' disabled' : '';
    const tag = (g && !isSelf) ? '（已在「' + esc(g.name) + '」）' : '';
    return '<label class="bg-member"><input type="checkbox" value="' + esc(m.id) + '"' + disabled +
      (checkedIds.includes(m.id) ? ' checked' : '') + '> <span>' + esc(label) + '</span>' +
      '<span style="color:var(--text-3);font-size:12px">' + tag + '</span></label>';
  }).join('');
}

async function openBillGroupEditModal(gid) {
  const g = (state.billGroups || []).find((x) => x.id === gid);
  if (!g) return;
  const my = (state.myCards || []).filter((x) => x.billGroupId === gid).map((x) => x.id);
  openModal('<div class="modal-title">编辑账单组 — ' + esc(g.name) + '</div>',
    '<div class="form-grid">' + field('组名称', '<input id="bg-name" value="' + esc(g.name) + '">') + '</div>' +
    '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text-2)">成员（取消勾选可移出该组）</label>' +
    '<div id="bg-members">' + memberChecklistHtml(my, gid) + '</div></div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="bg-save">保存</button>');
  $('#bg-save').addEventListener('click', async () => {
    const name = $('#bg-name').value.trim();
    if (!name) return toast('请填写组名称', 'error');
    const memberIds = $$('#bg-members input:checked').map((x) => x.value);
    if (memberIds.length === 1) return toast('账单组至少需要 2 张卡，可改为解散该组', 'error');
    try {
      await api('/api/billgroups/' + gid, { method: 'PUT', body: { name, memberIds } });
      toast('已保存');
      closeModal();
      await loadAll();
      openBillGroupsModal(memberIds.length ? gid : undefined);
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ---------- 抽屉：持卡详情 ----------
function openDrawer(id) {
  state.drawerId = id;
  renderDrawer();
}

function closeDrawer() {
  state.drawerId = null;
  renderDrawer();
}

function renderDrawer() {
  const root = $('#drawer-root');
  const m = state.myCards.find((x) => x.id === state.drawerId);
  if (!m) { root.innerHTML = ''; return; }

  let overlay = $('.overlay', root);
  if (!overlay) {
    root.innerHTML = '<div class="overlay"></div><div class="drawer" id="drawer"></div>';
    overlay = $('.overlay', root);
    overlay.addEventListener('click', closeDrawer);
  }
  const drawer = $('#drawer', root);
  // 保留滚动位置：loadAll 后重绘抽屉不丢滚动进度（记一笔/补录后仍停在原处）
  const prevScroll = drawer.scrollTop;
  drawer.innerHTML = drawerHtml(m);
  drawer.scrollTop = prevScroll;
  requestAnimationFrame(() => {
    // rAF 是异步的：这一帧之间可能已经 closeDrawer / 切页（root 被清空），
    // 不做存在性判断会直接抛 TypeError 打断后续渲染
    const ov = $('.overlay', root);
    if (ov) ov.classList.add('show');
    if (drawer.isConnected) drawer.classList.add('show');
  });
  bindDrawerEvents(m);
}

function drawerHtml(m) {
  const w = m.waiver;
  let feePolicyHtml = '';
  if (w.kind === '消费刷免' || w.kind === '笔数刷免') {
    const pct = w.target > 0 ? Math.min(100, Math.round((w.progress / w.target) * 100)) : 0;
    feePolicyHtml =
      '<div class="progress"><div class="progress-track"><div class="progress-fill' + (w.met ? ' done' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-text"><span>' + (w.unit === '元' ? fmtMoney(w.progress) + ' / ' + fmtMoney(w.target) : fmtInt(w.progress) + ' / ' + fmtInt(w.target) + ' 笔') + '</span>' +
      (w.met ? '<span style="color:var(--green);font-weight:600">已达标</span>' : '<span class="remaining">剩余 ' + (w.unit === '元' ? fmtMoney(w.remaining) : fmtInt(w.remaining) + ' 笔') + '</span>') +
      '</div></div>' +
      '<div style="font-size:12px;color:var(--text-3)">' + esc(w.kind) + ' ' + esc(m.waiverCondition || '') + ' · 按卡年统计（自上个年费日 ' + esc(m.feeMonth) + ' 月 ' + esc(m.feeDay) + ' 日起）</div>';
  } else if (w.kind === '积分抵扣') {
    feePolicyHtml = sliderHtml('toggle-points-drawer', m.pointsDeducted, m.pointsDeducted ? '已抵扣' : '未抵扣', m.pointsDeductDate, m.id);
  } else if (w.kind === '资产存免') {
    feePolicyHtml = sliderHtml('toggle-asset-drawer', m.assetWaived, m.assetWaived ? '已达标' : '未达标', m.assetWaivedDate, m.id) +
      '<div style="font-size:12px;color:var(--text-3);margin-top:4px">要求存款：' + esc(m.waiverCondition || '0') + '</div>';
  } else if (w.kind === '刚性') {
    feePolicyHtml = '<span class="badge badge-red">刚性年费</span> <span style="font-size:12px;color:var(--text-3)">必须缴费</span>';
  } else {
    feePolicyHtml = '<span class="badge badge-green">免年费</span>';
  }

  const benefitsHtml = (m.benefits || []).map((b, i) => benefitBlockHtml(m, b, i)).join('');

  return (
    '<div class="drawer-header">' +
    '<div class="drawer-title">' + esc(m.name) + (m.alias ? '<span class="alias" style="color:var(--gold-deep);font-weight:500;margin-left:6px">“' + esc(m.alias) + '”</span>' : '') +
    '<div class="drawer-sub">' + esc(m.bank) + ' · ' + esc(m.org) + ' · ' + esc(m.level) + '</div></div>' +
    '<button class="drawer-close" data-act="close" title="关闭">✕</button>' +
    '</div>' +
    '<div class="drawer-body">' +

    '<div class="drawer-section"><h3>基础信息</h3>' +
    '<div class="info-grid">' +
    infoItem('授信额度', fmtMoney(m.creditLimit)) +
    infoItem('卡号后四位', m.last4 ? '**** ' + esc(m.last4) : '未填写') +
    infoItem('账单日', '每月 ' + m.billingDay + ' 日') +
    infoItem('还款方式', m.repayMode === 'afterBill' ? '账单日后 ' + (m.repayValue || 0) + ' 天' : '每月 ' + (m.repayValue || m.repaymentDay || '—') + ' 日') +
    infoItem('宽限期', (m.graceDays || 0) + ' 天') +
    infoItem('最长免息期', (m.payment && m.payment.maxInterestDays) ? m.payment.maxInterestDays + ' 天' : '—') +
    infoItem('合并账单', m.billGroupId
      ? '<span class="badge badge-purple">' + esc(m.billGroupName || '未命名组') + '</span> <span style="font-size:12px;color:var(--text-3)">' + groupMembersOf(m).length + ' 张卡</span>'
      : '<span style="color:var(--text-3)">未合并</span>') +
    '</div>' +
    '<div class="bill-hint">本期账单 ' + esc((m.payment && m.payment.billDate) || '—') + ' · 银行到期 ' + esc((m.payment && m.payment.dueDate) || '—') +
    ((m.payment && m.payment.isInGrace) ? ' <span class="badge badge-yellow">宽限期内</span>' : '') +
    ' · 建议消费日 ' + esc((m.payment && m.payment.bestSpendDate) || '—') + '（免息最长）</div>' +
    '<div style="margin-top:10px;display:flex;gap:8px">' +
    '<button class="btn small" data-act="edit-mycard">编辑持卡</button>' +
    '<button class="btn small danger" data-act="del-mycard">删除持卡</button>' +
    '</div></div>' +

    '<div class="drawer-section"><h3>每月刷卡任务</h3>' +
    (m.monthlySpendTarget > 0
      ? '<div class="progress"><div class="progress-track"><div class="progress-fill" style="width:' + m.monthProgress + '%"></div></div>' +
        '<div class="progress-text"><span>本月消费 ' + fmtMoney(m.monthSpend) + '</span><span>目标 ' + fmtMoney(m.monthlySpendTarget) + '</span></div></div>'
      : '<div style="font-size:13px;color:var(--text-3)">未设置月消费目标（编辑持卡可设置）</div>') +
    '</div>' +

    '<div class="drawer-section"><h3>年费信息</h3>' +
    '<div class="info-grid">' +
    infoItem('下期年费日', m.nextFeeDate) +
    infoItem('年费倒计时', m.waiver.needsPayment ? '<span class="badge ' + (FEE_BADGE[m.feeDaysColor] || 'badge-default') + '">年费还有 ' + m.feeDays + ' 天</span>' : '<span class="badge badge-green">年费已免</span>') +
    infoItem('达标状态', m.feeStatus ? '<span class="badge ' + (m.feeStatus === '未达标' ? 'badge-default' : 'badge-green') + '">' + esc(m.feeStatus) + '</span>' : '—') +
    infoItem('年费预警', m.feeAlert ? '<span class="badge ' + (FEE_ALERT_BADGE[m.feeAlert] || 'badge-default') + '">' + esc(m.feeAlert) + '</span>' : '—') +
    '</div>' +
    (m.feeMonthsLeft != null ? '<div class="bill-hint">距年费约 ' + m.feeMonthsLeft + ' 个月</div>' : '') +
    '<div style="margin-top:10px">' + feePolicyHtml + '</div></div>' +

    '<div class="drawer-section"><h3>消费记录</h3>' +
    '<div class="chip-row">' +
    '<span class="stat-chip">本月 <b>' + fmtMoney(m.monthSpend) + '</b> · ' + m.monthCount + ' 笔 <button class="btn small" data-act="detail-records" data-scope="month">本月明细</button></span>' +
    '<span class="stat-chip">本年 <b>' + fmtMoney(m.yearSpend) + '</b> · ' + m.yearCount + ' 笔 <button class="btn small" data-act="detail-records" data-scope="year">本年明细</button></span>' +
    '<span class="stat-chip">累计 <b>' + fmtMoney(m.totalSpend) + '</b> · ' + m.totalCount + ' 笔 <button class="btn small" data-act="detail-records" data-scope="all">累计明细</button></span>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
    '<button class="btn small primary" data-act="record-consumption">记一笔</button>' +
    '<span class="count-topup">补录笔数 <input type="number" id="count-topup-input" min="1" step="1" placeholder="笔数"> <button class="btn small" data-act="count-topup">保存</button></span>' +
    '</div>' +
    (m.recent.length
      ? '<table class="record-table"><thead><tr><th>日期</th><th>渠道</th><th>分类</th><th>备注</th><th style="text-align:right">金额</th></tr></thead><tbody>' +
        m.recent.map((r) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.channel) + '</td><td>' + esc(r.category) + '</td><td>' + esc(r.note || '') + '</td><td class="amount">' + fmtMoney(r.amount) + '</td></tr>').join('') +
        '</tbody></table><div style="font-size:12px;color:var(--text-3);margin-top:4px">仅显示最近 5 条，更多见上方明细</div>'
      : '<div style="font-size:13px;color:var(--text-3)">暂无消费记录</div>') +
    '</div>' +

    '<div class="drawer-section"><h3>账单流水</h3>' +
    '<div class="chip-row" style="margin-top:0">' +
    '<button class="btn small primary" data-act="bill-add">新增账单</button>' +
    '<button class="btn small" data-act="bill-gen">生成本期账单</button>' +
    '<span class="stat-chip">未还 <b>' + unpaidCount(m) + '</b> 笔</span>' +
    '</div>' +
    billsHtml(m) + '</div>' +

    (m.billGroupId ? groupBillsSectionHtml(m) : '') +

    '<div class="drawer-section"><h3>权益使用明细</h3>' +
    (benefitsHtml || '<div style="font-size:13px;color:var(--text-3)">暂无权益（编辑持卡可添加）</div>') +
    '</div>' +
    '</div>'
  );
}

function infoItem(k, v) {
  return '<div class="info-item"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}

/** 合并账单组视角：组内成员 + 按月合计（还款提醒按组只推 1 条） */
function groupBillsSectionHtml(m) {
  const members = groupMembersOf(m);
  const rows = groupBillRows(m);
  const memberHtml = members.map((x) => '<span class="stat-chip">' + esc(x.alias || x.name) +
    (x.id === m.id ? '<span style="color:var(--text-3)">（当前）</span>' : '') + '</span>').join('');
  return '<div class="drawer-section"><h3>合并账单组：' + esc(m.billGroupName || '未命名组') + '</h3>' +
    '<div class="bill-hint">组内 ' + members.length + ' 张卡共用同一还款日，' +
    '提醒按组合并为 1 条（不再逐卡推送）。组内卡的最后还款日：' + esc((m.payment && m.payment.lastPayDate) || '—') + '</div>' +
    '<div class="chip-row">' + memberHtml + '</div>' +
    (rows.length
      ? '<table class="record-table"><thead><tr><th>月份</th><th>合计应还</th><th>到期日</th><th>未还</th></tr></thead><tbody>' +
        rows.map((r) => '<tr><td>' + esc(r.month) + '</td>' +
          '<td class="amount">' + fmtMoney(r.total) + '</td>' +
          '<td>' + esc(r.dueDate || '—') + '</td>' +
          '<td>' + (r.unpaid ? '<span class="badge badge-red">' + r.unpaid + ' 笔</span>' : '<span class="badge badge-green">已还清</span>') + '</td></tr>').join('') +
        '</tbody></table>'
      : '<div style="font-size:13px;color:var(--text-3)">组内暂无账单记录</div>') +
    '<div style="margin-top:10px;display:flex;gap:8px">' +
    '<button class="btn small" data-act="group-edit" data-gid="' + esc(m.billGroupId) + '">管理账单组</button>' +
    '<button class="btn small" data-act="group-leave" data-id="' + m.id + '">退出合并账单</button>' +
    '</div></div>';
}

function myBills(m) {
  return (state.bills || []).filter((b) => b.myCardId === m.id).sort((a, b) => (a.month < b.month ? 1 : -1));
}

function groupMembersOf(m) {
  if (!m.billGroupId) return [];
  return (state.myCards || []).filter((x) => x.billGroupId === m.billGroupId);
}

// 合并账单组：同月账单合计（组内还款日一致，到期日应相同）
function groupBillRows(m) {
  const members = groupMembersOf(m);
  if (!members.length) return [];
  const ids = members.map((x) => x.id);
  const byMonth = {};
  for (const b of state.bills || []) {
    if (!ids.includes(b.myCardId)) continue;
    const e = byMonth[b.month] || (byMonth[b.month] = { month: b.month, total: 0, unpaid: 0, count: 0, dueDate: '', paidDate: '' });
    e.total += Number(b.amount) || 0;
    e.count++;
    if (b.paid !== '已还') e.unpaid++;
    // 到期日取最早（组内不一致时宁可提前提醒）
    if (b.dueDate && (!e.dueDate || b.dueDate < e.dueDate)) e.dueDate = b.dueDate;
    if (b.paidDate && (!e.paidDate || b.paidDate > e.paidDate)) e.paidDate = b.paidDate;
  }
  return Object.values(byMonth).sort((a, b) => (a.month < b.month ? 1 : -1));
}

function unpaidCount(m) {
  return myBills(m).filter((b) => b.paid !== '已还').length;
}

function billsHtml(m) {
  const list = myBills(m);
  if (!list.length) return '<div style="font-size:13px;color:var(--text-3)">暂无账单记录（点「生成本期账单」快速创建）</div>';
  return '<table class="record-table"><thead><tr><th>月份</th><th>金额</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
    list.map((b) => '<tr data-bill-id="' + b.id + '">' +
      '<td>' + esc(b.month) + '</td>' +
      '<td class="amount">' + fmtMoney(b.amount) + '</td>' +
      '<td>' + esc(b.dueDate || '—') + '</td>' +
      '<td><span class="badge ' + (b.paid === '已还' ? 'badge-green' : 'badge-red') + '">' + esc(b.paid) + '</span>' +
      (b.paidDate ? '<div class="slider-date">' + esc(b.paidDate) + '</div>' : '') + '</td>' +
      '<td><button class="btn small" data-act="bill-toggle">' + (b.paid === '已还' ? '标记未还' : '标记已还') + '</button> ' +
      '<button class="btn small danger" data-act="bill-del">删除</button></td></tr>').join('') +
    '</tbody></table>';
}

async function openBillModal(m) {
  const p = m.payment || {};
  openModal('<div class="modal-title">新增账单 — ' + esc(m.alias || m.name) + '</div>',
    '<div class="form-grid">' +
    field('出账月份（YYYY-MM）', '<input id="b-month" value="' + esc(p.billMonth || '') + '" placeholder="2026-10">') +
    field('账单金额', '<input id="b-amount" type="number" min="0" step="0.01" value="0">') +
    field('到期还款日', '<input id="b-due" type="date" value="' + esc(p.dueDate || '') + '">') +
    field('是否已还', '<select id="b-paid"><option>未还</option><option>已还</option></select>') +
    '</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="b-save">保存</button>');
  $('#b-save').addEventListener('click', async () => {
    try {
      await api('/api/bills', {
        method: 'POST',
        body: {
          myCardId: m.id,
          month: $('#b-month').value.trim(),
          amount: $('#b-amount').value,
          dueDate: $('#b-due').value,
          paid: $('#b-paid').value,
        },
      });
      toast('账单已添加');
      closeModal();
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
}

function sliderHtml(act, on, label, date, id) {
  return '<button class="slider-toggle' + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + id + '">' +
    '<span class="slider-track"><span class="slider-knob"></span></span>' +
    '<span><span class="slider-label">' + label + '</span>' +
    (date ? '<div class="slider-date">' + esc(date) + '</div>' : '') + '</span></button>';
}

function benefitBlockHtml(m, b, i) {
  const badgeCls = CYCLE_BADGE[b.resetCycle] || 'badge-default';
  const unlimited = b.total < 0;
  const pct = b.total > 0 ? Math.min(100, Math.round((b.used / b.total) * 100)) : 0;
  const countTxt = unlimited ? '已用 ' + b.used + ' / 不限' : '已用 ' + b.used + ' / ' + b.total;
  const stateBadge = b.expired ? '<span class="badge badge-default">已过期</span>'
    : (unlimited ? '<span class="badge badge-green">不限次</span>'
      : '<span class="badge ' + (b.used >= b.total ? 'badge-red' : 'badge-default') + '">' + (b.remaining != null ? '剩 ' + b.remaining : countTxt) + '</span>');
  return '<div class="benefit-block" data-idx="' + i + '">' +
    '<div class="b-head"><span class="b-name">' + esc(b.name) + '</span>' +
    (b.type ? '<span class="badge badge-blue">' + esc(b.type) + '</span>' : '') +
    '<span class="badge ' + badgeCls + '">' + esc(b.resetCycle) + '重置</span>' +
    '<span class="badge badge-default">' + countTxt + '</span>' + stateBadge +
    (b.validUntil ? '<span class="slider-date">有效期至 ' + esc(b.validUntil) + '</span>' : '') + '</div>' +
    '<div class="progress"><div class="progress-track"><div class="progress-fill' + (b.used >= b.total ? ' done' : '') + '" style="width:' + pct + '%"></div></div></div>' +
    '<div class="b-actions">' +
    '<button class="btn small" data-act="record-benefit">记一笔</button>' +
    '<span class="count-topup">补录 <input type="number" min="1" step="1" placeholder="次数"> <button class="btn small" data-act="count-benefit">保存</button></span>' +
    '<div class="spacer" style="flex:1"></div>' +
    '<button class="btn small" data-act="benefit-history">历史记录</button>' +
    '</div></div>';
}

function bindDrawerEvents(m) {
  const drawer = $('#drawer');
  if (!drawer) return;
  $('[data-act="close"]', drawer).addEventListener('click', closeDrawer);

  const editBtn = $('[data-act="edit-mycard"]', drawer);
  if (editBtn) editBtn.addEventListener('click', () => openMyCardModal(m));

  const delBtn = $('[data-act="del-mycard"]', drawer);
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!(await confirmDialog('确定删除持卡「' + (m.alias || m.name) + '」？消费记录和权益记录将一并删除。'))) return;
    try {
      await api('/api/mycards/' + m.id, { method: 'DELETE' });
      toast('已删除');
      closeDrawer();
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });

  const pts = $('[data-act="toggle-points-drawer"]', drawer);
  if (pts) pts.addEventListener('click', () => togglePoints(m.id));
  const asset = $('[data-act="toggle-asset-drawer"]', drawer);
  if (asset) asset.addEventListener('click', () => toggleAsset(m.id));

  // 消费记录
  $('[data-act="record-consumption"]', drawer).addEventListener('click', () => openConsumptionModal(m));
  $('[data-act="count-topup"]', drawer).addEventListener('click', async () => {
    const input = $('#count-topup-input', drawer);
    const n = parseInt(input.value, 10);
    if (!n || n <= 0) return toast('请输入大于 0 的笔数', 'error');
    try {
      await api('/api/mycards/' + m.id + '/consumptions/count', { method: 'POST', body: { date: today(), count: n } });
      toast('已补录 ' + n + ' 笔');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
  $$('[data-act="detail-records"]', drawer).forEach((btn) => {
    btn.addEventListener('click', () => openRecordsModal(m, btn.dataset.scope));
  });

  // 账单流水
  const billAdd = $('[data-act="bill-add"]', drawer);
  if (billAdd) billAdd.addEventListener('click', () => openBillModal(m));
  const billGen = $('[data-act="bill-gen"]', drawer);
  if (billGen) billGen.addEventListener('click', async () => {
    try {
      await api('/api/mycards/' + m.id + '/bills/generate', { method: 'POST', body: {} });
      toast('已生成本期账单');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
  $$('[data-act="bill-toggle"]', drawer).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.billId;
      const b = (state.bills || []).find((x) => x.id === id);
      if (!b) return;
      try {
        await api('/api/bills/' + id, { method: 'PUT', body: { paid: b.paid === '已还' ? '未还' : '已还' } });
        await loadAll();
      } catch (e) { toast(e.message, 'error'); }
    });
  });
  $$('[data-act="bill-del"]', drawer).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.billId;
      if (!(await confirmDialog('确定删除这条账单记录？'))) return;
      try {
        await api('/api/bills/' + id, { method: 'DELETE' });
        toast('已删除');
        await loadAll();
      } catch (e) { toast(e.message, 'error'); }
    });
  });

  // 合并账单组
  const grpEdit = $('[data-act="group-edit"]', drawer);
  if (grpEdit) grpEdit.addEventListener('click', () => openBillGroupsModal(grpEdit.dataset.gid));
  const grpLeave = $('[data-act="group-leave"]', drawer);
  if (grpLeave) grpLeave.addEventListener('click', async () => {
    if (!(await confirmDialog('退出后这张卡将恢复单独提醒，确定退出合并账单？'))) return;
    try {
      await api('/api/mycards/' + m.id, { method: 'PUT', body: { billGroupId: '' } });
      toast('已退出合并账单');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });

  // 权益
  $$('.benefit-block', drawer).forEach((block) => {
    const idx = +block.dataset.idx;
    const b = (m.benefits || [])[idx];
    if (!b) return;
    $('[data-act="record-benefit"]', block).addEventListener('click', () => openBenefitModal(m, idx));
    $('[data-act="count-benefit"]', block).addEventListener('click', async () => {
      const input = $('input', block);
      const n = parseInt(input.value, 10);
      if (!n || n <= 0) return toast('请输入大于 0 的次数', 'error');
      try {
        await api('/api/mycards/' + m.id + '/benefits/' + idx + '/count', { method: 'POST', body: { date: today(), count: n, bid: b.id || '' } });
        toast('已补录 ' + n + ' 次');
        await loadAll();
      } catch (e) { toast(e.message, 'error'); }
    });
    $('[data-act="benefit-history"]', block).addEventListener('click', () => openBenefitHistoryModal(m, idx));
  });
}

// ---------- 通用弹窗 ----------
function openModal(titleHtml, bodyHtml, footerHtml) {
  const root = $('#modal-root');
  root.innerHTML =
    '<div class="modal-wrap" id="modal-wrap">' +
    '<div class="modal" id="modal">' +
    '<div class="modal-header">' + titleHtml +
    '<button class="modal-close" data-close>✕</button></div>' +
    '<div class="modal-body">' + bodyHtml + '</div>' +
    (footerHtml ? '<div class="modal-footer">' + footerHtml + '</div>' : '') +
    '</div></div>';
  const wrap = $('#modal-wrap');
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
  });
  return $('#modal');
}

function closeModal() {
  const wrap = $('#modal-wrap');
  if (!wrap) return;
  wrap.classList.remove('show');
  // 延迟清理时必须确认仍是同一个弹窗，否则会把期间新开的弹窗误清空
  const node = wrap;
  setTimeout(() => {
    if ($('#modal-wrap') === node) $('#modal-root').innerHTML = '';
  }, 200);
}

// ---------- 弹窗：添加 / 编辑持卡 ----------
function openAddCardModal() {
  const pickHtml =
    '<div class="search-box"><input id="pick-search" placeholder="搜索银行或卡片名称…"></div>' +
    '<div class="pick-list" id="pick-list"></div>' +
    '<div id="pick-form" style="margin-top:14px"></div>';
  openModal('<div class="modal-title">添加持卡</div>', pickHtml,
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-mycard">保存</button>');
  const selected = { cardId: null };
  renderPickList(selected, '');
  $('#pick-search').addEventListener('input', (e) => renderPickList(selected, e.target.value.trim()));
  $('#btn-save-mycard').addEventListener('click', () => saveMyCard(selected, null));
}

function renderPickList(selected, kw) {
  const list = $('#pick-list');
  const byBank = {};
  for (const c of state.cards) {
    if (kw && !(c.bank.includes(kw) || c.name.includes(kw))) continue;
    if (!byBank[c.bank]) byBank[c.bank] = [];
    byBank[c.bank].push(c);
  }
  const banks = orderedBanks(Object.keys(byBank));
  if (!banks.length) { list.innerHTML = '<div class="empty-tip" style="padding:20px">没有匹配的卡种</div>'; $('#pick-form').innerHTML = ''; return; }
  let html = '';
  for (const bank of banks) {
    const autoOpen = !!kw;
    html += '<div class="pick-bank" data-bank="' + esc(bank) + '"' + (autoOpen ? '' : ' style="display:none"') + ' data-force="' + (autoOpen ? '1' : '0') + '">' +
      '<div class="pick-bank-header" data-bank-toggle><span class="collapse-arrow">▾</span>' + esc(bank) + '（' + byBank[bank].length + '）</div>';
    for (const c of byBank[bank]) {
      html += '<div class="pick-card' + (selected.cardId === c.id ? ' selected' : '') + '" data-card-id="' + c.id + '">' +
        '<span class="pick-card-name">' + esc(c.name) + '</span>' +
        '<span class="pick-card-meta">' + esc(c.org) + ' · ' + esc(c.level) + ' · 年费 ' + (c.annualFee ? fmtMoney(c.annualFee) : '免') + '</span></div>';
    }
    html += '</div>';
  }
  list.innerHTML = html;
  $$('.pick-bank-header', list).forEach((h) => {
    h.addEventListener('click', () => {
      const bank = h.closest('.pick-bank');
      if (bank.dataset.force === '1') return; // 搜索命中时保持展开
      bank.style.display = bank.style.display === 'none' ? '' : 'none';
    });
  });
  $$('.pick-card', list).forEach((el) => {
    el.addEventListener('click', () => {
      $$('.pick-card', list).forEach((x) => x.classList.remove('selected'));
      el.classList.add('selected');
      selected.cardId = el.dataset.cardId;
      renderPickForm(selected);
    });
  });
}

function renderPickForm(selected) {
  const c = state.cards.find((x) => x.id === selected.cardId);
  const form = $('#pick-form');
  if (!c) { form.innerHTML = ''; return; }
  form.innerHTML = myCardFormHtml(c, null);
  bindMyCardForm(form, c, null);
}

function myCardFormHtml(c, m) {
  const bens = m ? (m.benefits || []) : (c.benefits || []).map((name) => ({ name, total: 1, resetCycle: '自然年' }));
  return (
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--gold-deep)">' + esc(c.name) + ' · ' + esc(c.bank) + '</div>' +
    '<div class="form-grid">' +
    field('别名（可选）', '<input id="f-alias" placeholder="给卡起个名字" value="' + esc(m ? m.alias : '') + '">') +
    field('卡号后四位（选填）', '<input id="f-last4" maxlength="4" placeholder="如 6688" value="' + esc(m ? m.last4 : '') + '">') +
    field('授信额度', '<input id="f-credit" type="number" min="0" step="1000" value="' + (m ? m.creditLimit : (c.startCredit || 0)) + '">') +
    field('月消费目标（选填）', '<input id="f-target" type="number" min="0" step="1000" value="' + (m ? m.monthlySpendTarget : 0) + '">') +
    field('账单日（1-31）', '<input id="f-billing" type="number" min="1" max="31" value="' + (m ? m.billingDay : 1) + '">') +
    field('还款方式', '<select id="f-repaymode"><option value="fixed"' + (!m || m.repayMode !== 'afterBill' ? ' selected' : '') + '>每月固定日</option><option value="afterBill"' + (m && m.repayMode === 'afterBill' ? ' selected' : '') + '>账单日后 N 天</option></select>') +
    field('还款值', '<input id="f-repay" type="number" min="1" max="365" value="' + (m ? (m.repayValue != null ? m.repayValue : m.repaymentDay) : 20) + '" title="固定日=第几日；账单日后N天=天数">') +
    field('宽限期（天）', '<input id="f-grace" type="number" min="0" max="30" value="' + (m ? (m.graceDays || 0) : 3) + '">') +
    field('最长免息期（天，选填）', '<input id="f-interest" type="number" min="0" max="120" value="' + (m ? (m.maxInterestDays || 0) : 0) + '">') +
    field('年费收取月（1-12）', '<input id="f-feemonth" type="number" min="1" max="12" value="' + (m ? m.feeMonth : 1) + '">') +
    field('年费收取日（1-31）', '<input id="f-feeday" type="number" min="1" max="31" value="' + (m ? m.feeDay : 1) + '">') +
    field('已达标年份（手工，选填）', '<input id="f-waivedyear" type="number" min="0" value="' + (m ? (m.waivedYear || 0) : 0) + '" title="填当前年份表示手工声明本年已达标/已减免">') +
    field('已刷核定期（选填）', '<input id="f-countperiod" type="number" min="0" value="' + (m ? (m.countPeriodYear || 0) : 0) + '" title="填年份表示已刷数据统计到该年，跨年后自动失效">') +
    field('合并账单组', groupSelectHtml(m)) +
    '</div>' +
    '<div style="margin-top:12px"><label style="font-size:12px;color:var(--text-2)">权益（名称 / 总次数 / 重置周期）</label>' +
    '<div id="benefit-rows">' + bens.map((b, i) => benefitEditRow(b, i)).join('') + '</div>' +
    '<button class="btn small" id="btn-add-benefit" style="margin-top:6px">＋ 添加权益</button></div>'
  );
}

/** 合并账单组下拉：空 = 不合并；只列出「与本卡还款日一致」或「尚无成员」的组 */
function groupSelectHtml(m) {
  const cur = (m && m.billGroupId) || '';
  const opts = ['<option value="">不合并（单独提醒）</option>'];
  for (const g of state.billGroups || []) {
    if (g.id === cur) { opts.push('<option value="' + esc(g.id) + '" selected>' + esc(g.name) + '</option>'); continue; }
    // 已有成员的组：还款日不一致的不列出来，避免选完才被服务端拒绝
    if (g.memberCount > 0 && !sameRepayAsGroup(m, g)) continue;
    opts.push('<option value="' + esc(g.id) + '">' + esc(g.name) + '（' + g.memberCount + ' 张）</option>');
  }
  return '<select id="f-billgroup">' + opts.join('') + '</select>';
}

/** 前端预判：本卡与组内首个成员的还款节奏是否一致（最终以服务端校验为准） */
function sameRepayAsGroup(m, g) {
  if (!m) return g.memberCount === 0;
  const peer = (state.myCards || []).find((x) => x.billGroupId === g.id);
  if (!peer || !m.payment || !peer.payment) return g.memberCount === 0;
  // 组内一致性由「最后还款日 + 还款方式 + 账单日 + 宽限期」共同决定，任一项不同即视为不一致
  return m.payment.lastPayDate === peer.payment.lastPayDate
    && (m.repayMode || 'fixed') === (peer.repayMode || 'fixed')
    && Number(m.billingDay) === Number(peer.billingDay)
    && Number(m.graceDays || 0) === Number(peer.graceDays || 0);
}

function benefitEditRow(b, i) {  const cycles = state.meta.resetCycles || [];
  const types = state.meta.benefitTypes || [];
  return '<div class="benefit-row" data-i="' + i + '" data-bid="' + esc(b.id || '') + '">' +
    '<input class="b-name" placeholder="权益名称" value="' + esc(b.name) + '">' +
    '<select class="b-type"><option value="">类型（选填）</option>' +
    types.map((t) => '<option' + (t === (b.type || b.benefitType) ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' +
    '<input class="b-total" type="number" min="-1" placeholder="次数" title="-1 = 不限次" value="' + (b.total == null ? 1 : b.total) + '">' +
    '<select class="b-cycle">' + cycles.map((c2) => '<option' + (c2 === b.resetCycle ? ' selected' : '') + '>' + c2 + '</option>').join('') + '</select>' +
    '<input class="b-until" type="date" title="有效期至（选填）" value="' + esc(b.validUntil || '') + '">' +
    '<button class="remove-btn" title="删除">✕</button></div>';
}

function bindMyCardForm(form, c, m) {
  $('#btn-add-benefit', form).addEventListener('click', () => {
    const rows = $('#benefit-rows', form);
    rows.insertAdjacentHTML('beforeend', benefitEditRow({ name: '', total: 1, resetCycle: '自然年' }, rows.children.length));
    bindRemoveButtons(form);
  });
  bindRemoveButtons(form);
}

function bindRemoveButtons(form) {
  $$('.benefit-row .remove-btn', form).forEach((btn) => {
    btn.onclick = () => btn.closest('.benefit-row').remove();
  });
}

function collectBenefits(form) {
  return $$('.benefit-row', form).map((row) => {
    const raw = parseInt($('.b-total', row).value, 10);
    const total = isNaN(raw) ? 1 : (raw < 0 ? -1 : raw); // -1 = 不限次
    const bid = row.dataset.bid || '';
    return {
      id: bid, // 稳定 id：权益增删/重排后使用记录仍能对上（空 = 新建，由服务端分配）
      name: $('.b-name', row).value.trim(),
      type: ($('.b-type', row) && $('.b-type', row).value) || '',
      total,
      resetCycle: $('.b-cycle', row).value,
      validUntil: ($('.b-until', row) && $('.b-until', row).value) || '',
    };
  }).filter((b) => b.name);
}

async function saveMyCard(selected, editing) {
  const form = $('#pick-form');
  const body = {
    alias: $('#f-alias', form).value.trim(),
    last4: $('#f-last4', form).value.trim(),
    creditLimit: $('#f-credit', form).value,
    monthlySpendTarget: $('#f-target', form).value,
    billingDay: $('#f-billing', form).value,
    repaymentDay: $('#f-repay', form).value,
    repayMode: ($('#f-repaymode', form) && $('#f-repaymode', form).value) || 'fixed',
    repayValue: $('#f-repay', form).value,
    graceDays: ($('#f-grace', form) && $('#f-grace', form).value) || 0,
    maxInterestDays: ($('#f-interest', form) && $('#f-interest', form).value) || 0,
    feeMonth: $('#f-feemonth', form).value,
    feeDay: $('#f-feeday', form).value,
    waivedYear: ($('#f-waivedyear', form) && $('#f-waivedyear', form).value) || 0,
    countPeriodYear: ($('#f-countperiod', form) && $('#f-countperiod', form).value) || 0,
    billGroupId: ($('#f-billgroup', form) && $('#f-billgroup', form).value) || '',
    benefits: collectBenefits(form),
  };
  try {
    if (editing) {
      await api('/api/mycards/' + editing.id, { method: 'PUT', body });
      toast('已保存修改');
    } else {
      if (!selected.cardId) return toast('请先选择一张卡', 'error');
      await api('/api/mycards', { method: 'POST', body: Object.assign({ cardId: selected.cardId }, body) });
      toast('已添加持卡');
    }
    closeModal();
    await loadAll();
    if (editing) openDrawer(editing.id);
  } catch (e) { toast(e.message, 'error'); }
}

function openMyCardModal(m) {
  const c = state.cards.find((x) => x.id === m.cardId) || { name: m.name, bank: m.bank, startCredit: m.creditLimit, benefits: [] };
  openModal('<div class="modal-title">编辑持卡</div>',
    '<div id="pick-form">' + myCardFormHtml(c, m) + '</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-mycard">保存</button>');
  bindMyCardForm($('#pick-form'), c, m);
  $('#btn-save-mycard').addEventListener('click', () => saveMyCard(null, m));
}

// ---------- 弹窗：记一笔消费 ----------
function openConsumptionModal(m) {
  const channels = state.meta.channels || [];
  const cats = state.meta.categories || [];
  openModal('<div class="modal-title">记一笔 — ' + esc(m.alias || m.name) + '</div>',
    '<div class="form-grid">' +
    field('日期', '<input id="c-date" type="date" value="' + today() + '">') +
    field('金额', '<input id="c-amount" type="number" min="0.01" step="0.01" placeholder="0.00">') +
    field('支付渠道', '<select id="c-channel">' + channels.map((x) => '<option>' + x + '</option>').join('') + '</select>') +
    field('消费分类', '<select id="c-category">' + cats.map((x) => '<option>' + x + '</option>').join('') + '</select>') +
    field('备注（可选）', '<input id="c-note" placeholder="备注">') +
    '</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-consumption">保存</button>');
  $('#btn-save-consumption').addEventListener('click', async () => {
    const amount = parseFloat($('#c-amount').value);
    if (!amount || amount <= 0) return toast('请输入大于 0 的金额', 'error');
    try {
      await api('/api/mycards/' + m.id + '/consumptions', {
        method: 'POST',
        body: { date: $('#c-date').value, amount, channel: $('#c-channel').value, category: $('#c-category').value, note: $('#c-note').value.trim() },
      });
      toast('已记录');
      closeModal();
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ---------- 弹窗：消费明细 ----------
async function openRecordsModal(m, scope) {
  const titles = { month: '本月明细', year: '本年明细', all: '累计明细' };
  let recs;
  try {
    const data = await api('/api/mycards/' + m.id + '/consumptions?scope=' + scope);
    recs = data.records;
  } catch (e) { return toast(e.message, 'error'); }

  let body;
  if (!recs.length) {
    body = '<div class="empty-tip">暂无记录</div>';
  } else if (scope === 'month') {
    body = recordsTable(recs, true);
  } else if (scope === 'year') {
    const byMonth = groupBy(recs, (r) => r.date.slice(0, 7));
    body = byMonth.map(([k, list]) => groupHtml(k + ' 月', list, true)).join('');
  } else {
    const byYear = groupBy(recs, (r) => r.date.slice(0, 4));
    body = byYear.map(([y, list]) => {
      const byMonth = groupBy(list, (r) => r.date.slice(0, 7));
      return '<div class="record-group"><div class="record-group-header" data-toggle><span class="collapse-arrow">▾</span>' + y + ' 年<span class="count">' + list.length + ' 笔</span><span class="sum">' + fmtMoney(sum(list)) + '</span></div>' +
        '<div class="record-group-body">' + byMonth.map(([k2, l2]) => groupHtml(k2 + ' 月', l2, true)).join('') + '</div></div>';
    }).join('');
  }
  const total = recs.reduce((s, r) => s + r.amount, 0);
  openModal('<div class="modal-title">' + titles[scope] + ' — ' + esc(m.alias || m.name) + '（共 ' + recs.length + ' 笔 / ' + fmtMoney(total) + '）</div>',
    '<div class="scroll-y">' + body + '</div>',
    '<button class="btn primary" data-close>关闭</button>');
  bindRecordGroups($('#modal'));
  bindRecordDelete($('#modal'), m.id);
}

function groupHtml(title, list, canDelete) {
  return '<div class="record-group"><div class="record-group-header" data-toggle><span class="collapse-arrow">▾</span>' + esc(title) +
    '<span class="count">' + list.length + ' 笔</span><span class="sum">' + fmtMoney(sum(list)) + '</span></div>' +
    '<div class="record-group-body">' + recordsTable(list, canDelete) + '</div></div>';
}

function recordsTable(recs, canDelete) {
  return '<table class="record-table"><thead><tr><th>日期</th><th>渠道</th><th>分类</th><th>备注</th><th style="text-align:right">金额</th>' + (canDelete ? '<th></th>' : '') + '</tr></thead><tbody>' +
    recs.map((r) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.channel) + '</td><td>' + esc(r.category) + '</td><td>' + esc(r.note || '') + '</td><td class="amount">' + fmtMoney(r.amount) + '</td>' +
      (canDelete ? '<td class="row-del"><button class="link-btn danger" data-cons-del="' + esc(r.id) + '" title="删除这条记录">删</button></td>' : '') +
      '</tr>').join('') +
    '</tbody></table>';
}

function bindRecordDelete(root, myCardId) {
  $$('[data-cons-del]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.consDel;
      if (!(await confirmDialog('确定删除这条消费记录？删除后统计与刷免进度将同步减少。'))) return;
      try {
        await api('/api/mycards/' + myCardId + '/consumptions/' + id, { method: 'DELETE' });
        toast('已删除');
        closeModal();
        await loadAll();
      } catch (e) { toast(e.message, 'error'); }
    });
  });
}

function bindRecordGroups(root) {
  $$('.record-group-header', root).forEach((h) => {
    h.addEventListener('click', () => h.closest('.record-group').classList.toggle('collapsed'));
  });
}

function groupBy(arr, fn) {
  const map = new Map();
  for (const x of arr) {
    const k = fn(x);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(x);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
function sum(arr) { return arr.reduce((s, r) => s + (Number(r.amount) || 0), 0); }

// ---------- 弹窗：权益使用 ----------
function openBenefitModal(m, idx) {
  const b = (m.benefits || [])[idx];
  openModal('<div class="modal-title">权益记一笔 — ' + esc(b.name) + '</div>',
    '<div class="form-grid">' +
    field('日期', '<input id="b-date" type="date" value="' + today() + '">') +
    field('备注（可选）', '<input id="b-note" placeholder="如：上海机场T2">') +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-3);margin-top:8px">当前周期已用 ' + b.used + ' 次（' + esc(b.resetCycle) + '重置' + (b.unlimited ? '，不限次数' : '，上限 ' + b.total + ' 次') + '）</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-benefit">保存</button>');
  $('#btn-save-benefit').addEventListener('click', async () => {
    try {
      await api('/api/mycards/' + m.id + '/benefits/' + idx + '/usage', {
        method: 'POST', body: { date: $('#b-date').value, note: $('#b-note').value.trim(), bid: b.id || '' },
      });
      toast('已记录');
      closeModal();
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
}

async function openBenefitHistoryModal(m, idx) {
  const b = (m.benefits || [])[idx];
  let groups;
  try { groups = await api('/api/mycards/' + m.id + '/benefits/' + idx + '/history?bid=' + encodeURIComponent(b.id || '')); }
  catch (e) { return toast(e.message, 'error'); }
  const body = groups.length
    ? groups.map((g) =>
        '<div class="record-group"><div class="record-group-header" data-toggle>' +
        '<span class="collapse-arrow">▾</span>周期 ' + esc(g.key) +
        '<span class="count">已用 ' + g.used + ' 次</span></div>' +
        '<div class="record-group-body"><table class="record-table"><thead><tr><th>日期</th><th>说明</th></tr></thead><tbody>' +
        g.records.map((r) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.note || '') + '</td></tr>').join('') +
        '</tbody></table></div></div>').join('')
    : '<div class="empty-tip">暂无历史记录</div>';
  openModal('<div class="modal-title">历史记录 — ' + esc(b.name) + '（' + esc(b.resetCycle) + '重置）</div>',
    '<div class="scroll-y">' + body + '</div>',
    '<button class="btn primary" data-close>关闭</button>');
  bindRecordGroups($('#modal'));
}

// ---------- 弹窗：新增 / 编辑卡种 ----------
function openCardTypeModal(id) {
  const c = id ? state.cards.find((x) => x.id === id) : null;
  const types = state.meta.waiverTypes || [];
  openModal('<div class="modal-title">' + (c ? '编辑卡种' : '新增卡种') + '</div>',
    '<div class="form-grid">' +
    field('银行', '<input id="t-bank" value="' + esc(c ? c.bank : '') + '" placeholder="如 招商银行">') +
    field('卡片名称', '<input id="t-name" value="' + esc(c ? c.name : '') + '" placeholder="如 经典白金卡">') +
    field('卡等级', '<input id="t-level" value="' + esc(c ? c.level : '') + '" placeholder="如 白金卡">') +
    field('卡组织', '<input id="t-org" value="' + esc(c ? c.org : '') + '" placeholder="如 银联/VISA">') +
    field('年费（元）', '<input id="t-fee" value="' + (c ? c.annualFee : 0) + '" placeholder="如 3600 或 0">') +
    field('起批额度（元）', '<input id="t-credit" value="' + (c ? c.startCredit : 0) + '" placeholder="如 50000 或 5万">') +
    field('免年费类型', '<select id="t-waivertype">' + types.map((x) => '<option' + (c && c.waiverType === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>') +
    field('刷免条件', '<input id="t-condition" value="' + esc(c ? c.waiverCondition : '') + '" placeholder="金额/笔数/积分/存款，如 10万、10笔、10000">') +
    field('免年费政策', '<input id="t-policy" class="full" value="' + esc(c ? c.waiverPolicy : '') + '" placeholder="政策说明">') +
    field('主要权益（多个用 | 分隔）', '<textarea id="t-benefits" placeholder="机场贵宾厅|积分兑换里程|道路救援">' + esc(c ? (c.benefits || []).join('|') : '') + '</textarea>') +
    field('申请条件', '<input id="t-apply" value="' + esc(c ? c.applyCondition : '') + '" placeholder="申请条件">') +
    field('备注', '<input id="t-note" value="' + esc(c ? c.note : '') + '" placeholder="备注">') +
    '</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-cardtype">保存</button>');
  $('#btn-save-cardtype').addEventListener('click', async () => {
    const body = {
      bank: $('#t-bank').value.trim(),
      name: $('#t-name').value.trim(),
      level: $('#t-level').value.trim(),
      org: $('#t-org').value.trim(),
      annualFee: $('#t-fee').value,
      startCredit: $('#t-credit').value,
      waiverType: $('#t-waivertype').value,
      waiverCondition: $('#t-condition').value.trim(),
      waiverPolicy: $('#t-policy').value.trim(),
      benefits: $('#t-benefits').value,
      applyCondition: $('#t-apply').value.trim(),
      note: $('#t-note').value.trim(),
    };
    try {
      if (c) await api('/api/cards/' + c.id, { method: 'PUT', body });
      else await api('/api/cards', { method: 'POST', body });
      toast(c ? '卡种已更新' : '卡种已添加');
      closeModal();
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
}

async function deleteCardType(id) {
  const c = state.cards.find((x) => x.id === id);
  if (!c) return toast('卡种不存在，可能已被删除', 'error');
  if (!(await confirmDialog('确定删除卡种「' + c.name + '」？已添加的持卡不受影响（快照保留）。'))) return;
  try {
    await api('/api/cards/' + id, { method: 'DELETE' });
    toast('已删除');
    await loadAll();
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- 弹窗：批量导入 ----------
function openImportModal() {
  openModal('<div class="modal-title">批量导入卡种（CSV）</div>',
    '<div style="font-size:12px;color:var(--text-2);margin-bottom:10px">表头：' + esc((state.meta.csvHeader || []).join(',')) +
    '<br>金额支持纯数字或数字+单位（如 5万）；多个权益用 | 分隔；免年费类型：' + esc((state.meta.waiverTypes || []).join(' / ')) +
    '<br>已存在的卡种（银行+名称+卡组织+卡等级）会自动跳过。</div>' +
    '<div class="field" style="margin-bottom:10px"><label>选择 CSV 文件</label><input type="file" id="import-file" accept=".csv,text/csv"></div>' +
    '<div class="field"><label>或直接粘贴 CSV 内容</label><textarea id="import-text" style="min-height:120px" placeholder="银行,卡片名称,卡等级,…"></textarea></div>' +
    '<div id="import-result" style="margin-top:10px"></div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-do-import">开始导入</button>');
  $('#btn-do-import').addEventListener('click', async () => {
    const btn = $('#btn-do-import');
    if (btn.disabled) return; // 防重复提交：文件读取+解析期间按钮置灰
    const file = $('#import-file').files[0];
    let text = $('#import-text').value;
    if (file) {
      try { text = await file.text(); }
      catch (e) { return toast('文件读取失败：' + (e.message || e.name), 'error'); }
    }
    if (!text.trim()) return toast('请选择文件或粘贴内容', 'error');
    btn.disabled = true;
    try {
      const r = await api('/api/cards/import', { method: 'POST', body: { csv: text } });
      $('#import-result').innerHTML =
        '<div class="badge badge-green">成功导入 ' + r.added + ' 张</div> ' +
        (r.skipped.length ? '<div class="badge badge-yellow" style="margin-left:6px">跳过 ' + r.skipped.length + ' 张（已存在）</div>' : '') +
        (r.errors.length ? '<div class="badge badge-red" style="margin-left:6px">' + r.errors.length + ' 行有误</div>' : '');
      toast('导入完成');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
    btn.disabled = false;
  });
}

function field(label, inputHtml) {
  return '<div class="field"><label>' + label + '</label>' + inputHtml + '</div>';
}

// ---------- 启动 ----------
boot().catch((e) => {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = '<div class="empty-tip">加载失败：' + esc(e.message) + '</div>';
});
