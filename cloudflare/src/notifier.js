'use strict';

/* Cloudflare Workers 版推送通知层：适配 server/notifier.js。
 *
 * 差异点：
 * 1. dns.lookup（Node 内置）不可用 → 改用 Cloudflare DoH（1.1.1.1）解析后校验，
 *    SSRF 防护逻辑（isBlockedIp）与原版逐字节一致。 * 2. fetch / AbortController / URLSearchParams 均为 Workers 原生支持，无需适配。
 * 3. process.env[name] → 由 worker 入口把 env 对象传入 endpoint()。
 */

const TIMEOUT_MS = 10000;
const DOH_URL = 'https://cloudflare-dns.com/dns-query?name=<HOST>&type=A';

/* isBlockedIp：与 server/notifier.js **逐字节一致**（数值化解析，防 IPv6 等价写法绕过）。
 * 说明见 server/notifier.js 同名函数注释；Workers 无 net 模块，纯 JS 实现两版共用。 */

/** 把 IPv4/IPv6 地址归一化为 8 组 16bit 整数（长度 8 的数组）；非法格式返回 null。
 *  IPv4 → [a,b,c,d,0,0,0,0]。 */
function ipToGroups(ip) {
  const s = String(ip || '').trim().replace(/^\[|\]$/g, '');
  // IPv4 点分十进制
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const p = s.split('.').map(Number);
    if (p.some((x) => x > 255)) return null;
    return [p[0], p[1], p[2], p[3], 0, 0, 0, 0];
  }
  // IPv6：处理 :: 缩写；每段 1-4 位十六进制
  if (!/^[0-9A-Fa-f:.]+$/.test(s)) return null;
  let head = s, tail = '';
  const dc = s.indexOf('::');
  if (dc >= 0) {
    if (s.indexOf('::', dc + 2) >= 0) return null;  // 多个 :: 不合法
    head = s.slice(0, dc);
    tail = s.slice(dc + 2);
  }
  const hGroups = head === '' ? [] : head.split(':');
  const tGroups = tail === '' ? [] : tail.split(':');
  // 末段内嵌 IPv4（如 ::ffff:127.0.0.1）：拆成 2 组 16bit（推 hex 字符串，
  // 与后续 parseInt(g, 16) 的解析方式一致）
  const expandV4 = (arr) => {
    if (!arr.length || !arr[arr.length - 1].includes('.')) return true;
    const v4 = ipToGroups(arr.pop());
    if (!v4) return false;
    arr.push((v4[0] * 256 + v4[1]).toString(16), (v4[2] * 256 + v4[3]).toString(16));
    return true;
  };
  if (!expandV4(tGroups) || !expandV4(hGroups)) return null;
  const total = hGroups.length + tGroups.length;
  if (total > 8) return null;
  if (dc < 0 && total !== 8) return null;          // 无 :: 时必须恰好 8 段
  if (dc >= 0 && total === 8) return null;         // :: 不能替代零段（有歧义，拒绝）
  const zeros = 8 - total;
  const groups = [...hGroups, ...new Array(zeros).fill('0'), ...tGroups].map((g) => {
    const n = parseInt(g, 16);
    return Number.isNaN(n) || g === '' || g.length > 4 || n > 0xffff ? -1 : n;
  });
  if (groups.some((n) => n < 0)) return null;
  return groups;
}

function isBlockedIp(ip) {
  const g = ipToGroups(ip);
  if (!g) {
    // 解析失败：保守起见按字符串兜底拦掉明显危险前缀（正常调用不会走到这——
    // 入口只接受 dns 解析结果或 IP 字面量）
    const low = String(ip || '').toLowerCase();
    return low === '::1' || low === '::' || /^f[cd][0-9a-f]{2}:/.test(low) || /^fe[89ab][0-9a-f]:/.test(low);
  }
  const allZeroPrefix = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;
  // IPv4-mapped（::ffff:0:0/96，前 80bit 为 0、第 81-96bit 为 0xffff）：拆出内嵌 IPv4
  if (allZeroPrefix && g[5] === 0xffff) {
    return isBlockedOctets(g[6] * 65536 + g[7]);
  }
  // 纯 IPv4 输入（ipToGroups 已拆成前 4 组）
  if (g[4] === 0 && g[5] === 0 && g[6] === 0 && g[7] === 0 && String(ip).includes('.')) {
    return isBlockedOctets(g[0] * 16777216 + g[1] * 65536 + g[2] * 256 + g[3]);
  }
  // 未指定 :: → 全 0；回环 ::1 → 仅末组为 1
  if (g.every((x) => x === 0)) return true;
  if (allZeroPrefix && g[6] === 0 && g[7] === 1) return true;
  // fc00::/7 唯一本地：g0 ∈ [0xfc00, 0xfdff]（首 7bit 1111110x）
  if ((g[0] >>> 9) === 0x7e) return true;
  // fe80::/10 链路本地：g0 ∈ [0xfe80, 0xfebf]（首 10bit 1111111010）
  if ((g[0] >>> 6) === 0x3fa) return true;
  return false;
}

/** IPv4 数值（0..2^32-1）按八位组规则判定 */
function isBlockedOctets(v4) {
  const a = Math.floor(v4 / 16777216) & 0xff;
  const b = Math.floor(v4 / 65536) & 0xff;
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
  if (a >= 224) return true;                          // 组播/保留
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
const WECOM_TEXT_MAX_BYTES = 2048;    // 微信兼容模式发 text 消息，上限小一档
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

/** 微信兼容模式：markdown → 纯文本（微信插件端不支持渲染 markdown 消息，与 Node 版同语义） */
function markdownToText(md) {
  return String(md || '')
    .split('\n')
    .map((line) => line.replace(/^>\s?/, '').replace(/^\s*[-*]\s+\[ \]\s*/, '□ ').replace(/^\s*[-*]\s+/, '· ').replace(/^\s*\d+\.\s+/, (m) => m))
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '');
}

async function sendWecom(env, cfg, title, content) {
  if (!cfg.webhookKey) return { ok: false, error: '缺少 webhook Key' };
  const base = endpoint(env, 'NOTIFY_WECOM_URL', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send');
  const url = base + (base.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(String(cfg.webhookKey).trim());
  const text = String(cfg.summaryPrefix || '管卡提醒') + '｜' + title + '\n' + content;
  // 微信兼容模式（wechatCompat）：发 text 纯文本，微信插件端可正常显示
  if (cfg.wechatCompat) {
    const r = await postJson(url, {
      msgtype: 'text',
      text: { content: utf8Slice(markdownToText(text), WECOM_TEXT_MAX_BYTES) },
    });
    if (!r.ok) return r;
    return verdict(r, 0, '企业微信', 'errmsg', 'errcode');
  }
  const r = await postJson(url, {
    msgtype: 'markdown',
    markdown: { content: utf8Slice(text, WECOM_CONTENT_MAX_BYTES) },
  });
  if (!r.ok) return r;
  // 企业微信返回 errcode=0 表示成功（其余通道是 code 字段）
  return verdict(r, 0, '企业微信', 'errmsg', 'errcode');
}

const CHANNELS = {
  wxpusher: { label: 'WxPusher', send: sendWxpusher },
  serverchan: { label: 'Server酱³', send: sendServerChan },
  bark: { label: 'Bark', send: sendBark },
  wecom: { label: '企业微信', send: sendWecom },
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

module.exports = { notifyAll, enabledChannels, CHANNELS, assertSafeBarkServer, isBlockedIp, markdownToText };
