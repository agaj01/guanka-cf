'use strict';

/* 提醒通道：wxpusher / Server酱³(sct) / Bark
 * - 零依赖：使用 Node 18+ 内置 fetch
 * - 每个通道独立 try/catch，单个通道失败不影响其余通道
 * - 端点可通过环境变量覆盖（NOTIFY_WXPUSHER_URL / NOTIFY_SCT_URL / BARK_SERVER），便于本地 mock 测试
 */
const TIMEOUT_MS = 10000;

function endpoint(name, fallback) {
  return process.env[name] || fallback;
}

async function postJson(url, body, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, headers || {}),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* 非 JSON 响应 */ }
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
    return { ok: true, data, raw: text.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

async function postForm(url, form) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams(form).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* ignore */ }
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
    return { ok: true, data, raw: text.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- wxpusher ----------------
// POST https://wxpusher.zjiecode.com/api/send/message
// {appToken, content, summary, contentType:3(markdown), uids:[], topicIds:[], url}
async function sendWxpusher(cfg, title, content) {
  const url = endpoint('NOTIFY_WXPUSHER_URL', 'https://wxpusher.zjiecode.com/api/send/message');
  const uids = String(cfg.uids || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
  const topicIds = String(cfg.topicIds || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
  if (!cfg.appToken) return { ok: false, error: '缺少 appToken' };
  if (!uids.length && !topicIds.length) return { ok: false, error: '缺少 uids 或 topicIds' };
  const r = await postJson(url, {
    appToken: cfg.appToken,
    content: content,
    summary: String(cfg.summaryPrefix || '管卡提醒') + '｜' + title,
    contentType: 3, // markdown
    uids,
    topicIds,
    url: '',
  });
  if (!r.ok) return r;
  // 官方返回 code=1000 表示成功
  if (r.data && r.data.code !== undefined && r.data.code !== 1000) {
    return { ok: false, error: 'wxpusher 返回 ' + r.data.code + ': ' + (r.data.msg || '') };
  }
  return { ok: true, data: r.data };
}

// ---------------- Server酱³ (sct) ----------------
// POST https://sctapi.ftqq.com/<SENDKEY>.send  (form: title, desp)
function sctUrl(cfg) {
  const base = endpoint('NOTIFY_SCT_URL', 'https://sctapi.ftqq.com');
  return base.replace(/\/$/, '') + '/' + encodeURIComponent(String(cfg.sendkey || '').trim()) + '.send';
}
async function sendServerChan(cfg, title, content) {
  if (!cfg.sendkey) return { ok: false, error: '缺少 SendKey' };
  const r = await postForm(sctUrl(cfg), { title: title.slice(0, 100), desp: content });
  if (!r.ok) return r;
  // code=0 表示成功
  if (r.data && r.data.code !== undefined && r.data.code !== 0) {
    return { ok: false, error: 'Server酱返回 code=' + r.data.code + ': ' + (r.data.message || '') };
  }
  return { ok: true, data: r.data };
}

// ---------------- Bark ----------------
// POST https://api.day.app/push  {device_key, title, body, level, group, url}
async function sendBark(cfg, title, content) {
  const base = endpoint('NOTIFY_BARK_URL', cfg.server || 'https://api.day.app').replace(/\/$/, '');
  if (!cfg.deviceKey) return { ok: false, error: '缺少 deviceKey' };
  const r = await postJson(base + '/push', {
    device_key: cfg.deviceKey,
    title: title.slice(0, 100),
    body: content,
    level: cfg.level || 'active',
    group: cfg.group || '管卡',
    isArchive: 1,
  });
  if (!r.ok) return r;
  // {code:200,...}
  if (r.data && r.data.code !== undefined && r.data.code !== 200) {
    return { ok: false, error: 'Bark 返回 code=' + r.data.code + ': ' + (r.data.message || '') };
  }
  return { ok: true, data: r.data };
}

const CHANNELS = {
  wxpusher: { label: 'WxPusher', send: sendWxpusher },
  serverchan: { label: 'Server酱³', send: sendServerChan },
  bark: { label: 'Bark', send: sendBark },
};

/** 向所有已启用通道推送；返回 [{channel,label,ok,error}] */
async function notifyAll(cfg, title, content) {
  const results = [];
  for (const key of Object.keys(CHANNELS)) {
    const ch = CHANNELS[key];
    const chCfg = (cfg && cfg.channels && cfg.channels[key]) || {};
    if (!chCfg.enabled) continue;
    try {
      const r = await ch.send(chCfg, title, content);
      results.push({ channel: key, label: ch.label, ok: !!r.ok, error: r.ok ? '' : (r.error || '发送失败') });
    } catch (e) {
      results.push({ channel: key, label: ch.label, ok: false, error: e && e.message ? e.message : String(e) });
    }
  }
  return results;
}

function enabledChannels(cfg) {
  return Object.keys(CHANNELS).filter((k) => cfg && cfg.channels && cfg.channels[k] && cfg.channels[k].enabled);
}

module.exports = { notifyAll, enabledChannels, CHANNELS };
