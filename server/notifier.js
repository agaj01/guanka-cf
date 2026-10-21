'use strict';

/* ---------------- SSRF 防护 ----------------
 * Bark 的「服务器地址」是用户可控的，服务端会拿它去发请求。若不校验，攻击者可以把
 * 它指向内网或云元数据端点（http://169.254.169.254/…），让服务端当跳板：
 *   - 探测内网资产（靠响应时间/状态码做端口扫描）
 *   - 读取云实例凭证（IMDSv1 可直接 GET 到 access key）
 *   - 触发内网 GET 型管理接口的副作用
 * 实测确认过：配置指向 127.0.0.1:4999 后，服务端确实代为发出了 POST /push。
 * 策略：只允许 https（顺带解决 Bark 密钥明文走 HTTP 的问题），且解析后的 IP 不得落在
 * 私有/环回/链路本地/保留网段。自建 Bark 属于极少数场景，改用 NOTIFY_BARK_URL 环境变量走白名单。
 */
const dns = require('dns');

function isBlockedIp(ip) {
  // IPv4：环回 / 私有 / 链路本地 / 0.0.0.0 / 保留段
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
  // IPv4-mapped（::ffff:127.0.0.1 这类绕过检查的写法）
  const m = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isBlockedIp(m[1]);
  return false;
}

/** 校验自建 Bark 服务器地址是否安全；不安全则抛出可展示的错误 */
async function assertSafeBarkServer(raw) {
  const s = String(raw || '').trim();
  if (!s) return;
  let u;
  try { u = new URL(s); } catch (e) { throw new Error('Bark 服务器地址格式非法：' + s.slice(0, 60)); }
  if (u.protocol !== 'https:') throw new Error('Bark 服务器地址必须使用 https（当前：' + u.protocol + '）');
  // 主机名本身是 IP 字面量时直接判定；否则必须解析 DNS 后逐个校验
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = await new Promise((resolve) => {
    if (/^[\d.]+$/.test(host) || host.includes(':')) return resolve([{ address: host }]);
    dns.lookup(host, { all: true }, (e, list) => resolve(e || !list ? [] : list));
  });
  if (!addrs.length) throw new Error('Bark 服务器地址无法解析：' + host);
  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new Error('Bark 服务器地址不允许指向内网/环回/链路本地地址（解析为 ' + a.address + '）');
    }
  }
}

/* ---------------- 提醒通道：wxpusher / Server酱³(sct) / Bark / 企业微信(wecom) ----------------
 * - 零依赖：使用 Node 18+ 内置 fetch
 * - 每个通道独立 try/catch，单个通道失败不影响其余通道
 * - 端点可通过环境变量覆盖（NOTIFY_WXPUSHER_URL / NOTIFY_SCT_URL / NOTIFY_BARK_URL / NOTIFY_WECOM_URL），便于本地 mock 测试
 */
const TIMEOUT_MS = 10000;

/* 判定上游返回码。
 *
 * 原实现写作 `if (r.data && r.data.code !== undefined && r.data.code !== expected)`，
 * 当上游返回 HTTP 200 但响应体不是 JSON（网关错误页 / HTML 拦截页 / 维护公告）时，
 * 解析出的 data 为 null，`r.data &&` 直接短路 → **落到 return { ok: true }**。
 * 于是一整类失败（token 过期、被风控、上游降级）被静默记为「已推送成功」，
 * 用户看到一片绿色勾、实际一条都没收到，是最难排查的那类缺陷。
 * 这里把「响应格式异常」显式判为失败。
 *
 * codeField：上游返回码的字段名。wxpusher/Server酱/Bark 都是 `code`，
 * 企业微信是 `errcode`，缺省为 `code` 以保持既有调用不变。 */
function verdict(r, expectedCode, label, msgField, codeField) {
  const cf = codeField || 'code';
  if (!r.data || typeof r.data !== 'object') {
    return {
      ok: false,
      error: label + '返回非 JSON 响应（HTTP 200）：' +
        String(r.raw || r.contentType || '').slice(0, 120),
    };
  }
  if (r.data[cf] === undefined || r.data[cf] === null) {
    return { ok: false, error: label + '响应缺少 ' + cf + ' 字段：' + JSON.stringify(r.data).slice(0, 120) };
  }
  if (r.data[cf] !== expectedCode) {
    return { ok: false, error: label + '返回 ' + r.data[cf] + ': ' + ((msgField && r.data[msgField]) || '') };
  }
  return { ok: true, data: r.data };
}

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
    // 无返回类型：由调用方判定 code，避免「HTTP 200 但响应体不是 JSON」被当成成功
    return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
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
    return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
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
  return verdict(r, 1000, 'wxpusher', 'msg');
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
  return verdict(r, 0, 'Server酱', 'message');
}

// ---------------- Bark ----------------
// POST https://api.day.app/push  {device_key, title, body, level, group, url}
async function sendBark(cfg, title, content) {
  // 允许通过环境变量整体接管端点（白名单，跳过用户可控地址）；否则校验用户填的地址
  const override = process.env.NOTIFY_BARK_URL;
  if (!override) await assertSafeBarkServer(cfg.server);
  const base = (override || cfg.server || 'https://api.day.app').replace(/\/$/, '');
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
  return verdict(r, 200, 'Bark', 'message');
}

// ---------------- 企业微信消息推送 (wecom)（原「群机器人」，v4.1.41 起更名，协议不变） ----------------
// POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<KEY>
// {msgtype:'markdown', markdown:{content}}；成功判定 {errcode:0, errmsg:'ok'}
const WECOM_CONTENT_MAX_BYTES = 4096; // 企业微信 markdown content 长度上限（UTF-8 字节）

/** 按 UTF-8 字节数截断字符串（逐码点累计，不撕裂多字节字符） */
function utf8Slice(str, maxBytes) {
  const s = String(str || '');
  if (Buffer.byteLength(s, 'utf8') <= maxBytes) return s;
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

async function sendWecom(cfg, title, content) {
  if (!cfg.webhookKey) return { ok: false, error: '缺少 webhook Key' };
  const base = endpoint('NOTIFY_WECOM_URL', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send');
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

// ---------------- 企业微信应用消息 (wecomapp) ----------------
// 官方「发送应用消息」接口（文档 90236），与 wecom（群机器人 webhook）并行：
// 消息直达应用可见范围内成员的会话（非群聊）。
// 两段式：GET /cgi-bin/gettoken 拿 access_token（7200s TTL，有每日获取次数上限 → 必须全局缓存），
//         POST /cgi-bin/message/send 下发消息；成功判定 errcode==0（与 webhook 相同）。
// token 失效（40014 invalid access_token / 42001 access_token expired）清缓存重取一次再发。
// markdown content 上限 2048 字节——比 webhook 通道的 4096 小一档，注意区分。
// 注意：新建自建应用须在应用详情配置「企业可信IP」（60020 = 调用方 IP 不在白名单；
// Cloudflare Workers 出站 IP 不固定，直连会报 60020，可用 NOTIFY_WECOM_APP_*_URL 指向固定 IP 代理）。
// 端点固定 qyapi.weixin.qq.com，无用户可控服务器地址 → 无 SSRF 面（Bark 通道那套校验不适用）。
const WECOM_APP_CONTENT_MAX_BYTES = 2048;
const WECOM_APP_TOKEN_RETRY_CODES = [40014, 42001];

/** access_token 进程级缓存：key=corpid|secret（token 由二者决定），value={token, expiresAt}。
 * 仅内存态：Node 版随进程存活；Workers 版随 isolate 存活，重启丢失即重取。
 * 7200s TTL + 提醒推送低频，远低于官方每日取 token 次数上限。 */
const wecomAppTokens = new Map();
const WECOM_APP_TOKEN_MARGIN_MS = 60 * 1000; // 提前 60s 视为过期，避免边界时刻拿到刚失效的旧 token

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* 非 JSON 响应 */ }
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' ' + text.slice(0, 160) };
    return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timer);
  }
}

/** 取自建应用 access_token：命中缓存直接返回；否则请求 gettoken 并落缓存 */
async function getWecomAppToken(corpid, secret) {
  const ck = corpid + '|' + secret;
  const hit = wecomAppTokens.get(ck);
  if (hit && hit.expiresAt > Date.now() + WECOM_APP_TOKEN_MARGIN_MS) return { ok: true, token: hit.token };
  const base = endpoint('NOTIFY_WECOM_APP_TOKEN_URL', 'https://qyapi.weixin.qq.com/cgi-bin/gettoken');
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

async function sendWecomApp(cfg, title, content) {
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
    touser, // 原样透传：支持「|」分隔多账号与 @all（上限 1000 个，超出由上游报错）
    msgtype: 'markdown',
    agentid: Number.isFinite(aid) && String(aid) === agentid ? aid : agentid, // 官方要求数字；非纯数字原样传让上游报错
    markdown: { content: utf8Slice(text, WECOM_APP_CONTENT_MAX_BYTES) },
  };
  const sendBase = endpoint('NOTIFY_WECOM_APP_SEND_URL', 'https://qyapi.weixin.qq.com/cgi-bin/message/send');
  const attempt = async () => {
    const t = await getWecomAppToken(corpid, secret);
    if (!t.ok) return t; // 取凭证失败（网络错误 / errcode 非 0），带原错误直接返回
    return postJson(sendBase + (sendBase.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(t.token), payload);
  };
  let r = await attempt();
  if (r.ok && r.data && WECOM_APP_TOKEN_RETRY_CODES.includes(r.data.errcode)) {
    invalidateWecomAppToken(corpid, secret);
    r = await attempt();
  }
  if (!r.ok) return r;
  // errcode=0 且 invaliduser 非空 = 部分账号无效，剩余账号已收到（官方语义仍算成功）
  return verdict(r, 0, '企业微信应用消息', 'errmsg', 'errcode');
}

const CHANNELS = {
  wxpusher: { label: 'WxPusher', send: sendWxpusher },
  serverchan: { label: 'Server酱³', send: sendServerChan },
  bark: { label: 'Bark', send: sendBark },
  wecom: { label: '企业微信', send: sendWecom },
  wecomapp: { label: '企业微信应用消息', send: sendWecomApp },
};

/** 向所有已启用通道推送；返回 [{channel,label,ok,error}]
 * 并行发送（通道间无依赖，postJson/postForm 各自 try/catch + 超时已隔离错误），
 * 最坏等待从「各通道超时之和」降为「单通道超时」；结果按 CHANNELS 注册顺序回填，输出结构稳定 */
async function notifyAll(cfg, title, content) {
  const keys = Object.keys(CHANNELS).filter((key) => {
    const chCfg = (cfg && cfg.channels && cfg.channels[key]) || {};
    return chCfg.enabled;
  });
  const settled = await Promise.allSettled(keys.map((key) => {
    const ch = CHANNELS[key];
    const chCfg = (cfg && cfg.channels && cfg.channels[key]) || {};
    return ch.send(chCfg, title, content);
  }));
  return settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      const r = s.value;
      return { channel: keys[i], label: CHANNELS[keys[i]].label, ok: !!r.ok, error: r.ok ? '' : (r.error || '发送失败') };
    }
    // send 内部已 try/catch 兜底，rejected 属于意外抛错（如 AssertionError），仍需兜住
    const e = s.reason;
    return { channel: keys[i], label: CHANNELS[keys[i]].label, ok: false, error: e && e.message ? e.message : String(e) };
  });
}

function enabledChannels(cfg) {
  return Object.keys(CHANNELS).filter((k) => cfg && cfg.channels && cfg.channels[k] && cfg.channels[k].enabled);
}

module.exports = { notifyAll, enabledChannels, CHANNELS, assertSafeBarkServer, isBlockedIp, _wecomAppTokens: wecomAppTokens };
