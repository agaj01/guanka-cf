'use strict';

/* 鉴权原语（Cloudflare Workers 环境）。
 *
 * 相对上游版本的改动（对应安全评估里指出的问题）：
 * 1. **不再把 AUTH_TOKEN 当会话凭证**：登录成功后签发随机不透明 session id，
 *    Cookie 只携带该 id，主令牌永不落到浏览器。会话可单独吊销、可全部吊销。
 * 2. **日历订阅使用独立派生令牌**：HMAC-SHA256(AUTH_TOKEN, 固定标签) 派生出的
 *    只读令牌，仅 /api/calendar.ics 接受；主令牌不再允许出现在 URL/查询串里。
 * 3. 令牌强度校验前移到部署自检（见 scripts/preflight.js），运行期也做兜底校验。
 *
 * 恒时比较：先各自 SHA-256 成定长字节再逐字节异或累积，
 * 长度差异与内容差异都不通过时间侧信道泄露。
 */

const COOKIE_NAME = 'gk_sid';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天绝对有效期
const CAL_LABEL = 'guanka-calendar-v1';

function enc(s) { return new TextEncoder().encode(String(s == null ? '' : s)); }

async function sha256Bytes(str) {
  const digest = await crypto.subtle.digest('SHA-256', enc(str));
  return new Uint8Array(digest);
}

/** 恒定时间比较（等长字节） */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 恒时比较两个字符串：双哈希后比较，不泄露长度与内容 */
async function safeEqualStr(a, b) {
  return constantTimeEqual(await sha256Bytes(a), await sha256Bytes(b));
}

function base64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 随机不透明会话 id（32 字节 → 43 字符 base64url） */
function randomId() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

function masterToken(env) { return String((env && env.AUTH_TOKEN) || ''); }

/** 是否已配置主令牌（未配置时一律拒绝服务，不存在「免登录」回退） */
function authEnabled(env) { return masterToken(env).length > 0; }

/** 校验提交的主令牌 */
async function checkMasterToken(env, given) {
  const token = masterToken(env);
  if (!token) return false;
  return safeEqualStr(String(given || ''), token);
}

/**
 * 日历只读令牌：由主令牌 HMAC 派生。
 * - 独立于主令牌：泄露该令牌只能读日历，拿不到任何写权限；
 * - 无状态可重算：轮换 AUTH_TOKEN 即等于吊销旧日历令牌。
 */
async function calendarToken(env) {
  const token = masterToken(env);
  if (!token) return '';
  const key = await crypto.subtle.importKey('raw', enc(CAL_LABEL), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc(token));
  return base64url(new Uint8Array(sig)).slice(0, 32);
}

async function checkCalendarToken(env, given) {
  const expect = await calendarToken(env);
  if (!expect) return false;
  return safeEqualStr(String(given || ''), expect);
}

/**
 * 主令牌指纹：把会话绑定到「签发它时的那个令牌」。
 * 换 AUTH_TOKEN 后指纹随之改变，所有旧会话立即失效——
 * 否则令牌泄露后轮换令牌是无效动作，攻击者手里的会话还能再活 30 天。
 * 只存指纹不存令牌；SHA-256 之后再截断，无法反推原令牌。
 */
async function tokenFingerprint(env) {
  const token = masterToken(env);
  if (!token) return '';
  const buf = await crypto.subtle.digest('SHA-256', enc('guanka-session-v1:' + token));
  return base64url(new Uint8Array(buf)).slice(0, 16);
}

/* ---------------- Cookie ---------------- */

function parseCookies(req) {
  const out = {};
  const raw = req.headers.get('cookie') || '';
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    const v = part.slice(i + 1).trim();
    try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; }
  }
  return out;
}

function sessionCookie(sid) {
  // HttpOnly：页面脚本读不到；Secure：仅 HTTPS；SameSite=Lax：挡住跨站写请求
  return COOKIE_NAME + '=' + encodeURIComponent(sid) +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(SESSION_TTL_MS / 1000) + '; Secure';
}

function clearCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure';
}

/** 从请求中取会话 id（仅 Cookie；不再接受 query 传主令牌） */
function sidOf(req) { return parseCookies(req)[COOKIE_NAME] || ''; }

/** 从请求中取 Bearer 令牌（供脚本/API 客户端用） */
function bearerOf(req) {
  const hdr = req.headers.get('authorization') || '';
  if (!hdr.startsWith('Bearer ')) return '';
  return hdr.slice(7).trim();
}

/* ---------------- 杂项 ---------------- */

/** 同源校验（无 Origin/Referer 时放行——非浏览器客户端由会话层负责鉴权） */
function sameOrigin(req) {
  const source = req.headers.get('origin') || req.headers.get('referer');
  if (!source) return true;
  try { return new URL(source).host === (req.headers.get('host') || ''); } catch (e) { return false; }
}

function clientIp(req) { return req.headers.get('cf-connecting-ip') || '?'; }

/**
 * 主令牌强度体检：规则定义在 src/token-rules.js，
 * 部署自检（scripts/check-token.js）与运行期告警共用同一实现。
 */
const { inspectTokenStrength } = require('./token-rules.js');

module.exports = {
  COOKIE_NAME, SESSION_TTL_MS,
  sha256Bytes, constantTimeEqual, safeEqualStr, randomId,
  authEnabled, checkMasterToken, masterToken,
  calendarToken, checkCalendarToken, tokenFingerprint,
  parseCookies, sidOf, bearerOf, sessionCookie, clearCookie,
  sameOrigin, clientIp, inspectTokenStrength,
};
