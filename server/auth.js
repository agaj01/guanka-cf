'use strict';

/* 访问控制与安全辅助（零依赖）
 *
 * 背景：本应用原本是「零鉴权 + HOST=0.0.0.0」，安全模型完全依赖「没人能访问到端口」。
 * Docker 的端口映射默认对所有来源网卡放行（iptables -A DOCKER -j ACCEPT，且会绕过部分
 * 宿主防火墙规则），因此只要宿主机有公网 IP 并映射了 3000，就等于开放了一个无人看守的
 * 数据接口；配合「GET /api/notify/config 明文回吐推送 token」，泄露是立竿见影的。
 *
 * 设计原则：
 *  1. **安全默认**：未设置 AUTH_TOKEN 时，默认只允许回环地址访问（局域网/公网一律拒绝）。
 *     要开放局域网，必须显式配置 AUTH_TOKEN —— 让「开放」成为一个有意识的动作。
 *  2. **会话 Cookie 而非每请求带 token**：浏览器只会自动带上 Cookie，用户不必改造每个
 *     请求；同时用 HttpOnly 降低 XSS 窃取面，SameSite=Lax 阻断跨站表单的 CSRF。
 *  3. **固定时长比较**：避免按字符提前返回造成的时序侧信道。
 */

const crypto = require('crypto');

const TOKEN = String(process.env.AUTH_TOKEN || '');
const COOKIE_NAME = 'gk_token';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天

/** 是否已启用鉴权（未配置 token 则走「仅回环」模式，见 isAllowed） */
function authEnabled() { return TOKEN.length > 0; }

/** 固定时长字符串比较（长度不等直接 false，长度差本身不泄露内容） */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** 校验用户提交的 token 是否正确 */
function checkToken(given) { return authEnabled() && safeEqual(given, TOKEN); }

/** 从 Cookie 头里取指定 cookie */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** 请求携带的凭据：Cookie 优先，其次 Authorization: Bearer（便于 curl / 脚本调用） */
function credentialOf(req, urlObj) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const hdr = req.headers.authorization || '';
  if (hdr.startsWith('Bearer ')) return hdr.slice(7).trim();
  // 导出是 window.location 跳转，带不了自定义头，允许查询串兜底
  return urlObj && urlObj.searchParams.get('token') || '';
}

/** 判断来源是否为回环地址（未配置 token 时只放行回环） */
function isLoopback(req) {
  const ip = (req.socket && req.socket.remoteAddress) || '';
  // Node 对 IPv4 回环常表现为 ::ffff:127.0.0.1
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.') || ip.startsWith('::ffff:127.');
}

/**
 * 是否需要拦截该请求。
 * @returns {false} 放行
 * @returns {{status:number, body:object}} 拦截时的响应
 */
function guard(req, urlObj, pathname) {
  // 健康检查给 Docker HEALTHCHECK 用，且不泄露数据，始终放行
  if (pathname === '/api/health') return false;

  if (authEnabled()) {
    if (checkToken(credentialOf(req, urlObj))) return false;
    return { status: 401, body: { error: '未授权：请先登录', needAuth: true } };
  }

  // 未配置 AUTH_TOKEN：只允许回环访问（容器端口映射到宿主机时，宿主访问表现为回环）
  if (isLoopback(req)) return false;
  return {
    status: 403,
    body: {
      error: '已拒绝非本地访问：服务未设置 AUTH_TOKEN，为安全起见仅允许本机访问。' +
        '如需局域网/公网使用，请先设置环境变量 AUTH_TOKEN（见 README 安全章节）。',
      needToken: true,
    },
  };
}

/** 生成登录 Cookie（HttpOnly + SameSite=Lax；HTTPS 场景下应加 Secure） */
function sessionCookie() {
  // 容器常为纯 HTTP 部署，默认不加 Secure，否则浏览器不会回传导致登录死循环；
  // 若在反向代理上启用了 HTTPS，设置 TRUST_HTTPS=1 即可打开 Secure。
  const secure = process.env.TRUST_HTTPS === '1' ? '; Secure' : '';
  return COOKIE_NAME + '=' + encodeURIComponent(TOKEN) +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(SESSION_TTL_MS / 1000) + secure;
}

function clearCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

/** 同源校验：给不需要鉴权但会改变状态的接口（如 shutdown）兜底，阻断跨站表单 CSRF */
function sameOrigin(req) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host || '';
  const source = origin || referer;
  if (!source) return true; // 非浏览器（curl 等）无 Origin/Referer，由鉴权层负责
  try {
    const u = new URL(source);
    return u.host === host;
  } catch (e) { return false; }
}

module.exports = {
  authEnabled, checkToken, credentialOf, guard, sessionCookie, clearCookie,
  sameOrigin, isLoopback, safeEqual, COOKIE_NAME,
};
