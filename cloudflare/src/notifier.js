'use strict';

/* Cloudflare Workers 版推送通知层：适配 server/notifier.js。
 *
 * 差异点：
 * 1. dns.lookup（Node 内置）不可用 → 改用 Cloudflare DoH（1.1.1.1）解析后校验，
 *    SSRF 防护逻辑（isBlockedIp）与原版逐字节一致。
 * 2. fetch / AbortController / URLSearchParams 均为 Workers 原生支持，无需适配。
 * 3. process.env[name] → 由 worker 入口把 env 对象传入 endpoint()。
 */

const TIMEOUT_MS = 10000;
const DOH_URL = 'https://cloudflare-dns.com/dns-query?name=<HOST>&type=A';

function isBlockedIp(ip) {
  // IPv4：环回 / 私有 / 链路本地 / 0.0.0.0 / 保留段（与 server/notifier.js 完全一致）
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 127 || p[0] === 10) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;  // CGNAT
    if (p[0] >= 224) return true;                                 // 组播/保留
    return false;
  }
  const low = ip.toLowerCase();
  if (low === '::1' || low === '::') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(low)) return true;   // fc00::/7 唯一本地
  if (/^fe[89ab][0-9a-f]:/.test(low)) return true;   // fe80::/10 链路本地
  const m = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isBlockedIp(m[1]);
  return false;
}

/** Workers 版 DNS 解析：走 1.1.1.1 DoH 拿 A 记录（IP 字面量直接返回） */
async function resolveHost(host) {
  if (/^[\d.]+$/.test(host)) return [host];
  if (host.includes(':')) return [host.replace(/^\[|\]$/g, '')];
  try {
    const res = await fetch(DOH_URL.replace('<HOST>', encodeURIComponent(host)), {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
  } catch (e) { return []; }
}

/** 校验自建 Bark 服务器地址是否安全（语义与 server/notifier.js 一致） */
async function assertSafeBarkServer(raw) {
  const s = String(raw || '').trim();
  if (!s) return;
  let u;
  try { u = new URL(s); } catch (e) { throw new Error('Bark 服务器地址格式非法：' + s.slice(0, 60)); }
  if (u.protocol !== 'https:') throw new Error('Bark 服务器地址必须使用 https（当前：' + u.protocol + '）');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = await resolveHost(host);
  if (!addrs.length) throw new Error('Bark 服务器地址无法解析：' + host);
  for (const a of addrs) {
    if (isBlockedIp(a)) {
      throw new Error('Bark 服务器地址不允许指向内网/环回/链路本地地址（解析为 ' + a + '）');
    }
  }
}

/* 判定上游返回码（与 server/notifier.js verdict 一致；codeField 缺省 code，企业微信传 errcode） */
function verdict(r, expectedCode, label, msgField, codeField) {
  const cf = codeField || 'code';
  if (!r.data || typeof r.data !== 'object') {
    return { ok: false, error: label + '返回非 JSON 响应（HTTP 200）：' + String(r.raw || r.contentType || '').slice(0, 120) };
  }
  if (r.data[cf] === undefined || r.data[cf] === null) {
    return { ok: false, error: label + '响应缺少 ' + cf + ' 字段：' + JSON.stringify(r.data).slice(0, 120) };
  }
  if (r.data[cf] !== expectedCode) {
    return { ok: false, error: label + '返回 ' + r.data[cf] + ': ' + ((msgField && r.data[msgField]) || '') };
  }
  return { ok: true, data: r.data };
}

function endpoint(env, name, fallback) { return env[name] || fallback; }

async function postJson(url, body, headers) {
  const res = await fetch(url, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, headers || {}),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* 非 JSON 响应 */ }
  if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
  return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
}

async function postForm(url, form) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* ignore */ }
  if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
  return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
}

async function sendWxpusher(env, cfg, title, content) {
  const url = endpoint(env, 'NOTIFY_WXPUSHER_URL', 'https://wxpusher.zjiecode.com/api/send/message');
  const uids = String(cfg.uids || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
  const topicIds = String(cfg.topicIds || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
  if (!cfg.appToken) return { ok: false, error: '缺少 appToken' };
  if (!uids.length && !topicIds.length) return { ok: false, error: '缺少 uids 或 topicIds' };
  const r = await postJson(url, {
    appToken: cfg.appToken, content, summary: String(cfg.summaryPrefix || '管卡提醒') + '｜' + title,
    contentType: 3, uids, topicIds, url: '',
  });
  if (!r.ok) return r;
  return verdict(r, 1000, 'wxpusher', 'msg');
}

function sctUrl(env, cfg) {
  const base = endpoint(env, 'NOTIFY_SCT_URL', 'https://sctapi.ftqq.com');
  return base.replace(/\/$/, '') + '/' + encodeURIComponent(String(cfg.sendkey || '').trim()) + '.send';
}
async function sendServerChan(env, cfg, title, content) {
  if (!cfg.sendkey) return { ok: false, error: '缺少 SendKey' };
  const r = await postForm(sctUrl(env, cfg), { title: title.slice(0, 100), desp: content });
  if (!r.ok) return r;
  return verdict(r, 0, 'Server酱', 'message');
}

async function sendBark(env, cfg, title, content) {
  const override = env.NOTIFY_BARK_URL;
  if (!override) await assertSafeBarkServer(cfg.server);
  const base = (override || cfg.server || 'https://api.day.app').replace(/\/$/, '');
  if (!cfg.deviceKey) return { ok: false, error: '缺少 deviceKey' };
  const r = await postJson(base + '/push', {
    device_key: cfg.deviceKey, title: title.slice(0, 100), body: content,
    level: cfg.level || 'active', group: cfg.group || '管卡', isArchive: 1,
  });
  if (!r.ok) return r;
  return verdict(r, 200, 'Bark', 'message');
}

// ---------------- 企业微信消息推送 (wecom)（原「群机器人」，v4.1.41 起更名，协议不变；语义与 server/notifier.js 一致）----------------
// POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<KEY>
// {msgtype:'markdown', markdown:{content}}；成功判定 {errcode:0, errmsg:'ok'}
const WECOM_CONTENT_MAX_BYTES = 4096; // 企业微信 markdown content 长度上限（UTF-8 字节）
const UTF8 = new TextEncoder();       // Workers 无 Buffer，用 TextEncoder 算字节数

/** 按 UTF-8 字节数截断字符串（逐码点累计，不撕裂多字节字符；与 Node 版同语义） */
function utf8Slice(str, maxBytes) {
  const s = String(str || '');
  if (UTF8.encode(s).length <= maxBytes) return s;
  let bytes = 0;
  let end = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i);
    const w = c > 0xFFFF ? 4 : (c > 0x7FF ? 3 : (c > 0x7F ? 2 : 1));
    if (bytes + w > maxBytes) break;
    bytes += w;
    end += c > 0xFFFF ? 2 : 1;
    if (c > 0xFFFF) i++; // 跳过代理对的低位
  }
  return s.slice(0, end);
}

async function sendWecom(env, cfg, title, content) {
  if (!cfg.webhookKey) return { ok: false, error: '缺少 webhook Key' };
  const base = endpoint(env, 'NOTIFY_WECOM_URL', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send');
  const url = base + (base.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(String(cfg.webhookKey).trim());
  const text = String(cfg.summaryPrefix || '管卡提醒') + '｜' + title + '\n' + content;
  const r = await postJson(url, {
    msgtype: 'markdown',
    markdown: { content: utf8Slice(text, WECOM_CONTENT_MAX_BYTES) },
  });
  if (!r.ok) return r;
  // 企业微信返回 errcode=0 表示成功（其余通道是 code 字段）
  return verdict(r, 0, '企业微信', 'errmsg', 'errcode');
}

// ---------------- 企业微信应用消息 (wecomapp)（语义与 server/notifier.js 一致）----------------
// 官方「发送应用消息」接口（文档 90236）：两段式 GET gettoken（7200s TTL，全局缓存）→
// POST message/send；token 失效（40014/42001）清缓存重取一次；markdown content 上限 2048 字节。
// 注意：新建自建应用须配置「企业可信IP」（60020）；Workers 出站 IP 不固定，直连会报 60020，
// 可用 NOTIFY_WECOM_APP_*_URL 环境变量指向固定 IP 代理。端点固定 → 无 SSRF 面。
const WECOM_APP_CONTENT_MAX_BYTES = 2048;
const WECOM_APP_TOKEN_RETRY_CODES = [40014, 42001];

/** access_token isolate 级缓存：DO 重启/isolate 回收后丢失即重取（低频推送远低于每日取 token 上限） */
const wecomAppTokens = new Map();
const WECOM_APP_TOKEN_MARGIN_MS = 60 * 1000;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* 非 JSON 响应 */ }
  if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
  return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
}

async function getWecomAppToken(env, corpid, secret) {
  const ck = corpid + '|' + secret;
  const hit = wecomAppTokens.get(ck);
  if (hit && hit.expiresAt > Date.now() + WECOM_APP_TOKEN_MARGIN_MS) return { ok: true, token: hit.token };
  const base = endpoint(env, 'NOTIFY_WECOM_APP_TOKEN_URL', 'https://qyapi.weixin.qq.com/cgi-bin/gettoken');
  const url = base + (base.includes('?') ? '&' : '?') + 'corpid=' + encodeURIComponent(corpid) + '&corpsecret=' + encodeURIComponent(secret);
  const r = await getJson(url);
  if (!r.ok) return r;
  const v = verdict(r, 0, '企业微信应用消息(凭证)', 'errmsg', 'errcode');
  if (!v.ok) return v;
  if (!r.data.access_token) return { ok: false, error: '企业微信应用消息(凭证)响应缺少 access_token 字段' };
  const token = String(r.data.access_token);
  wecomAppTokens.set(ck, { token, expiresAt: Date.now() + (Number(r.data.expires_in) || 7200) * 1000 });
  return { ok: true, token };
}

function invalidateWecomAppToken(corpid, secret) {
  wecomAppTokens.delete(corpid + '|' + secret);
}

async function sendWecomApp(env, cfg, title, content) {
  const corpid = String(cfg.corpid || '').trim();
  const secret = String(cfg.corpsecret || '').trim();
  const agentid = String(cfg.agentid || '').trim();
  const touser = String(cfg.touser || '').trim();
  if (!corpid) return { ok: false, error: '缺少 corpid' };
  if (!secret) return { ok: false, error: '缺少 corpsecret' };
  if (!agentid) return { ok: false, error: '缺少 agentid' };
  if (!touser) return { ok: false, error: '缺少 touser' };
  const text = String(cfg.summaryPrefix || '管卡提醒') + '｜' + title + '\n' + content;
  const aid = Number(agentid);
  const payload = {
    touser,
    msgtype: 'markdown',
    agentid: Number.isFinite(aid) && String(aid) === agentid ? aid : agentid,
    markdown: { content: utf8Slice(text, WECOM_APP_CONTENT_MAX_BYTES) },
  };
  const sendBase = endpoint(env, 'NOTIFY_WECOM_APP_SEND_URL', 'https://qyapi.weixin.qq.com/cgi-bin/message/send');
  const attempt = async () => {
    const t = await getWecomAppToken(env, corpid, secret);
    if (!t.ok) return t;
    return postJson(sendBase + (sendBase.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(t.token), payload);
  };
  let r = await attempt();
  if (r.ok && r.data && WECOM_APP_TOKEN_RETRY_CODES.includes(r.data.errcode)) {
    invalidateWecomAppToken(corpid, secret);
    r = await attempt();
  }
  if (!r.ok) return r;
  return verdict(r, 0, '企业微信应用消息', 'errmsg', 'errcode');
}

const CHANNELS = {
  wxpusher: { label: 'WxPusher', send: sendWxpusher },
  serverchan: { label: 'Server酱³', send: sendServerChan },
  bark: { label: 'Bark', send: sendBark },
  wecom: { label: '企业微信', send: sendWecom },
  wecomapp: { label: '企业微信应用消息', send: sendWecomApp },
};

/** 向所有已启用通道推送（env 首参，语义对齐 notifier.notifyAll）
 * 并行发送 + 按 CHANNELS 注册顺序回填，与 server/notifier.js 逐字节同语义 */
async function notifyAll(env, cfg, title, content) {
  const keys = Object.keys(CHANNELS).filter((key) => {
    const chCfg = (cfg && cfg.channels && cfg.channels[key]) || {};
    return chCfg.enabled;
  });
  const settled = await Promise.allSettled(keys.map((key) => {
    const ch = CHANNELS[key];
    const chCfg = (cfg && cfg.channels && cfg.channels[key]) || {};
    return ch.send(env, chCfg, title, content);
  }));
  return settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      const r = s.value;
      return { channel: keys[i], label: CHANNELS[keys[i]].label, ok: !!r.ok, error: r.ok ? '' : (r.error || '发送失败') };
    }
    const e = s.reason;
    return { channel: keys[i], label: CHANNELS[keys[i]].label, ok: false, error: e && e.message ? e.message : String(e) };
  });
}

function enabledChannels(cfg) {
  return Object.keys(CHANNELS).filter((k) => cfg && cfg.channels && cfg.channels[k] && cfg.channels[k].enabled);
}

module.exports = { notifyAll, enabledChannels, CHANNELS, assertSafeBarkServer, isBlockedIp, _wecomAppTokens: wecomAppTokens };
