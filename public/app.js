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
  if (!res.ok) throw new Error(data.error || ('请求失败 ' + res.status));
  return data;
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
  stats: null,
  drawerId: null,
};

const CYCLE_BADGE = { '自然月': 'badge-blue', '自然年': 'badge-purple', '年费日': 'badge-orange' };
const FEE_BADGE = { default: 'badge-default', yellow: 'badge-yellow', red: 'badge-red' };

// ---------- 启动 ----------
async function boot() {
  applyTheme(state.settings.theme);
  bindNav();
  await loadAll();
}

async function loadAll() {
  // mycards 响应已合并 stats/banks（服务端一次索引计算），省去一次全量统计请求
  const [settings, meta, mycardsResp, cards] = await Promise.all([
    api('/api/settings'), api('/api/meta'), api('/api/mycards'), api('/api/cards'),
  ]);
  state.settings = settings;
  state.meta = meta;
  state.myCards = mycardsResp.data || mycardsResp;
  state.stats = mycardsResp.stats || (await api('/api/stats'));
  state.cards = cards;
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
    '<button class="btn" id="btn-export">导出持卡</button>' +
    '<div class="spacer"></div>' +
    '<span style="font-size:12px;color:var(--text-3)">数据保存在 Docker 卷中，重启不丢失</span>' +
    '</div>';

  if (!state.myCards.length) {
    return html + '<div class="empty-tip">还没有持卡，点右上角「添加持卡」开始管理吧</div>';
  }

  const byBank = {};
  for (const m of state.myCards) {
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

function statCard(label, value, sub, warn, id) {
  return '<div class="stat-card' + (id ? ' clickable' : '') + '"' + (id ? ' id="' + id + '"' : '') + '>' +
    '<div class="stat-label">' + label + '</div>' +
    '<div class="stat-value' + (warn ? ' warn' : '') + '">' + value + '</div>' +
    '<div class="stat-sub">' + sub + '</div></div>';
}

function cardRowHtml(m) {
  return '<div class="card-row" data-id="' + m.id + '">' +
    '<div><div class="card-name">' + esc(m.name) + (m.alias ? '<span class="alias">“' + esc(m.alias) + '”</span>' : '') + '</div>' +
    '<div class="card-sub">' + esc(m.bank) + ' · ' + esc(m.org) + ' · ' + esc(m.level) + ' · 额度 ' + fmtMoney(m.creditLimit) + (m.last4 ? ' · 尾号 ' + esc(m.last4) : '') + '</div></div>' +
    '<div class="waiver-cell">' + waiverCellHtml(m) + '</div>' +
    '<div class="fee-cell">' + feeBadgeHtml(m) + '</div>' +
    '<div><button class="btn small" data-act="detail">详情</button></div>' +
    '</div>';
}

function feeBadgeHtml(m) {
  if (!m.waiver.needsPayment) return '<span class="badge badge-green">年费已免</span>';
  const cls = FEE_BADGE[m.feeDaysColor] || 'badge-default';
  return '<span class="badge ' + cls + '">年费还有 ' + m.feeDays + ' 天</span>';
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
  window.location = '/api/cards/export';
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
    field('检查间隔（分钟，最小 5）', '<input id="n-interval" type="number" min="5" value="' + esc(cfg.intervalMinutes) + '">') +
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
    $('.overlay', root).classList.add('show');
    drawer.classList.add('show');
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
    infoItem('还款日', '每月 ' + m.repaymentDay + ' 日') +
    infoItem('年费收取', '每年 ' + m.feeMonth + ' 月 ' + m.feeDay + ' 日') +
    infoItem('年费金额', m.annualFee ? fmtMoney(m.annualFee) : '免年费') +
    '</div>' +
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
    '</div>' +
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

    '<div class="drawer-section"><h3>权益使用明细</h3>' +
    (benefitsHtml || '<div style="font-size:13px;color:var(--text-3)">暂无权益（编辑持卡可添加）</div>') +
    '</div>' +
    '</div>'
  );
}

function infoItem(k, v) {
  return '<div class="info-item"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}

function sliderHtml(act, on, label, date, id) {
  return '<button class="slider-toggle' + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + id + '">' +
    '<span class="slider-track"><span class="slider-knob"></span></span>' +
    '<span><span class="slider-label">' + label + '</span>' +
    (date ? '<div class="slider-date">' + esc(date) + '</div>' : '') + '</span></button>';
}

function benefitBlockHtml(m, b, i) {
  const badgeCls = CYCLE_BADGE[b.resetCycle] || 'badge-default';
  const pct = b.total > 0 ? Math.min(100, Math.round((b.used / b.total) * 100)) : 0;
  return '<div class="benefit-block" data-idx="' + i + '">' +
    '<div class="b-head"><span class="b-name">' + esc(b.name) + '</span>' +
    '<span class="badge ' + badgeCls + '">' + esc(b.resetCycle) + '重置</span>' +
    '<span class="badge ' + (b.used >= b.total ? 'badge-red' : 'badge-default') + '">已用 ' + b.used + ' / ' + b.total + '</span></div>' +
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
        await api('/api/mycards/' + m.id + '/benefits/' + idx + '/count', { method: 'POST', body: { date: today(), count: n } });
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
    field('还款日（1-31）', '<input id="f-repay" type="number" min="1" max="31" value="' + (m ? m.repaymentDay : 20) + '">') +
    field('年费收取月（1-12）', '<input id="f-feemonth" type="number" min="1" max="12" value="' + (m ? m.feeMonth : 1) + '">') +
    field('年费收取日（1-31）', '<input id="f-feeday" type="number" min="1" max="31" value="' + (m ? m.feeDay : 1) + '">') +
    '</div>' +
    '<div style="margin-top:12px"><label style="font-size:12px;color:var(--text-2)">权益（名称 / 总次数 / 重置周期）</label>' +
    '<div id="benefit-rows">' + bens.map((b, i) => benefitEditRow(b, i)).join('') + '</div>' +
    '<button class="btn small" id="btn-add-benefit" style="margin-top:6px">＋ 添加权益</button></div>'
  );
}

function benefitEditRow(b, i) {
  const cycles = state.meta.resetCycles || ['自然月', '自然年', '年费日'];
  return '<div class="benefit-row" data-i="' + i + '">' +
    '<input class="b-name" placeholder="权益名称" value="' + esc(b.name) + '">' +
    '<input class="b-total" type="number" min="0" placeholder="次数" value="' + b.total + '">' +
    '<select class="b-cycle">' + cycles.map((c2) => '<option' + (c2 === b.resetCycle ? ' selected' : '') + '>' + c2 + '</option>').join('') + '</select>' +
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
  return $$('.benefit-row', form).map((row) => ({
    name: $('.b-name', row).value.trim(),
    total: Math.max(0, parseInt($('.b-total', row).value, 10) || 0),
    resetCycle: $('.b-cycle', row).value,
  })).filter((b) => b.name);
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
    feeMonth: $('#f-feemonth', form).value,
    feeDay: $('#f-feeday', form).value,
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
    body = recordsTable(recs);
  } else if (scope === 'year') {
    const byMonth = groupBy(recs, (r) => r.date.slice(0, 7));
    body = byMonth.map(([k, list]) => groupHtml(k + ' 月', list)).join('');
  } else {
    const byYear = groupBy(recs, (r) => r.date.slice(0, 4));
    body = byYear.map(([y, list]) => {
      const byMonth = groupBy(list, (r) => r.date.slice(0, 7));
      return '<div class="record-group"><div class="record-group-header" data-toggle><span class="collapse-arrow">▾</span>' + y + ' 年<span class="count">' + list.length + ' 笔</span><span class="sum">' + fmtMoney(sum(list)) + '</span></div>' +
        '<div class="record-group-body">' + byMonth.map(([k2, l2]) => groupHtml(k2 + ' 月', l2)).join('') + '</div></div>';
    }).join('');
  }
  const total = recs.reduce((s, r) => s + r.amount, 0);
  openModal('<div class="modal-title">' + titles[scope] + ' — ' + esc(m.alias || m.name) + '（共 ' + recs.length + ' 笔 / ' + fmtMoney(total) + '）</div>',
    '<div class="scroll-y">' + body + '</div>',
    '<button class="btn primary" data-close>关闭</button>');
  bindRecordGroups($('#modal'));
}

function groupHtml(title, list) {
  return '<div class="record-group"><div class="record-group-header" data-toggle><span class="collapse-arrow">▾</span>' + esc(title) +
    '<span class="count">' + list.length + ' 笔</span><span class="sum">' + fmtMoney(sum(list)) + '</span></div>' +
    '<div class="record-group-body">' + recordsTable(list) + '</div></div>';
}

function recordsTable(recs) {
  return '<table class="record-table"><thead><tr><th>日期</th><th>渠道</th><th>分类</th><th>备注</th><th style="text-align:right">金额</th></tr></thead><tbody>' +
    recs.map((r) => '<tr><td>' + esc(r.date) + '</td><td>' + esc(r.channel) + '</td><td>' + esc(r.category) + '</td><td>' + esc(r.note || '') + '</td><td class="amount">' + fmtMoney(r.amount) + '</td></tr>').join('') +
    '</tbody></table>';
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
    '<div style="font-size:12px;color:var(--text-3);margin-top:8px">当前周期已用 ' + b.used + ' / ' + b.total + ' 次（' + esc(b.resetCycle) + '重置）</div>',
    '<button class="btn" data-close>取消</button><button class="btn primary" id="btn-save-benefit">保存</button>');
  $('#btn-save-benefit').addEventListener('click', async () => {
    try {
      await api('/api/mycards/' + m.id + '/benefits/' + idx + '/usage', {
        method: 'POST', body: { date: $('#b-date').value, note: $('#b-note').value.trim() },
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
  try { groups = await api('/api/mycards/' + m.id + '/benefits/' + idx + '/history'); }
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
    const file = $('#import-file').files[0];
    let text = $('#import-text').value;
    if (file) text = await file.text();
    if (!text.trim()) return toast('请选择文件或粘贴内容', 'error');
    try {
      const r = await api('/api/cards/import', { method: 'POST', body: { csv: text } });
      $('#import-result').innerHTML =
        '<div class="badge badge-green">成功导入 ' + r.added + ' 张</div> ' +
        (r.skipped.length ? '<div class="badge badge-yellow" style="margin-left:6px">跳过 ' + r.skipped.length + ' 张（已存在）</div>' : '') +
        (r.errors.length ? '<div class="badge badge-red" style="margin-left:6px">' + r.errors.length + ' 行有误</div>' : '');
      toast('导入完成');
      await loadAll();
    } catch (e) { toast(e.message, 'error'); }
  });
}

function field(label, inputHtml) {
  return '<div class="field"><label>' + label + '</label>' + inputHtml + '</div>';
}

// ---------- 启动 ----------
boot().catch((e) => {
  $('#app').innerHTML = '<div class="empty-tip">加载失败：' + esc(e.message) + '</div>';
});
