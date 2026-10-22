'use strict';

/* Cloudflare Workers 版鉴权：适配 server/auth.js 到 Workers 环境。
 *
 * 与 Node 版的差异：
 * 1. AUTH_TOKEN 不能在模块加载时固化（Workers 全局实例可能跨 isolate 复用，
 *    环境变量在每次 fetch/scheduled 调用时注入）→ token 改为从 env 传入。
 * 2. crypto.timingSafeEqual → Web Crypto 的 crypto.subtle.timingSafeEqual
 *    不存在，用「SHA-256 双哈希 + 恒定时间比较」等价实现：先把两边都哈希成
 *    定长字节再逐字节异或累积，长度信息不泄露、内容信息不泄露。
 * 3. 回环判断不再有意义（Workers 没有本机回环访问的概念，所有流量都来自边缘）→
 *    未配置 token 时统一要求登录（比 Node 版更严格，因为没有「本机」可豁免）。
 */

const COOKIE_NAME = 'gk_token';
const SESSION_TTL_S = 30 * 24 * 3600;

async function sha256(s) {
  const data = new TextEncoder().encode(String(s || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

/** 恒定时间比较（等价于 Node crypto.timingSafeEqual 的安全语义） */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 是否已启用鉴权（Workers 部署必须配置 token，无「仅回环」回退模式） */
function authEnabled(env) { return String(env.AUTH_TOKEN || '').length > 0; }

async function checkToken(env, given) {
  const token = String(env.AUTH_TOKEN || '');
  if (!token) return false;
  return constantTimeEqual(await sha256(given), await sha256(token));
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.get('cookie') || '';
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) { try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { out[k] = part.slice(i + 1).trim(); } }
  }
  return out;
}

/** 请求携带的凭据：Cookie 优先，其次 Bearer，最后 ?token=——但**只对白名单端点生效**
 * （与 Node 版 server/auth.js 对齐：令牌进 URL 会留痕浏览器历史/访问日志/Referer，
 * 暴露面必须压到最小。前端实际只有日历订阅用 query 传 token）。 */
const QUERY_TOKEN_PATHS = new Set(['/api/calendar.ics']);

function credentialOf(req, url) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const hdr = req.headers.get('authorization') || '';
  if (hdr.startsWith('Bearer ')) return hdr.slice(7).trim();
  if (url && QUERY_TOKEN_PATHS.has(url.pathname)) {
    return url.searchParams.get('token') || '';
  }
  return '';
}

/**
 * 鉴权守卫。@returns null=放行；{status, body}=拦截
 * 注意：健康检查放行；静态资源由 Workers Assets 托管（不经过这里）。
 */
async function guard(req, url, pathname, env) {
  if (pathname === '/api/health') return null;
  if (!authEnabled(env)) {
    return {
      status: 403,
      body: {
        error: 'Worker 未配置 AUTH_TOKEN 环境变量。请用 `wrangler secret put AUTH_TOKEN` 或 wrangler.toml [vars] 配置后重试。',
        needToken: true,
      },
    };
  }
  if (await checkToken(env, credentialOf(req, url))) return null;
  return { status: 401, body: { error: '未授权：请先登录', needAuth: true } };
}

/** 登录会话 Cookie（Workers 一律 HTTPS，恒加 Secure） */
function sessionCookie(env) {
  return COOKIE_NAME + '=' + encodeURIComponent(String(env.AUTH_TOKEN || '')) +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + SESSION_TTL_S + '; Secure';
}

function clearCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure';
}

/** 同源校验（语义与 Node 版一致：无 Origin/Referer 放行，有则必须同 host） */
function sameOrigin(req) {
  const source = req.headers.get('origin') || req.headers.get('referer');
  if (!source) return true;
  try { return new URL(source).host === (req.headers.get('host') || ''); } catch (e) { return false; }
}

/** 客户端 IP（限流用；Workers 下取 CF-Connecting-IP） */
function clientIp(req) {
  return req.headers.get('cf-connecting-ip') || '?';
}

module.exports = { authEnabled, checkToken, credentialOf, guard, sessionCookie, clearCookie, sameOrigin, clientIp, COOKIE_NAME };
