'use strict';

/* Cloudflare Access 信任模式：校验 Cf-Access-Jwt-Assertion 的 RS256 签名。
 *
 * 为什么必须在应用层自己验签：
 * Access 加在请求上的 Cf-Access-Authenticated-User-Email 之类的头只是「便利字段」，
 * 任何能直达 Worker 的路径（workers.dev、预览 URL、Access 策略被改成 Everyone 的那一刻）
 * 都能自行伪造。唯一带密码学保证的是 JWT 签名——但 Access 不会替你验，必须自己来。
 *
 * 全部 fail closed：
 * - alg 只接受 RS256，显式拒绝 none / HS256（把公钥当 HMAC 密钥用的经典绕过）
 * - aud 必须精确等于配置的 Application Audience Tag —— 否则同团队其他 Access 应用的
 *   合法 JWT 可以拿来登这个应用
 * - iss 必须等于 https://<team>，防跨团队重放
 * - exp / nbf / iat 全校验，留 30s 时钟偏移
 *
 * 启用条件：ACCESS_TEAM_DOMAIN 与 ACCESS_AUD 同时配置。缺一个就整体禁用，
 * 不会退化成「只看请求头有没有值」。
 */

const JWKS_TTL_MS = 60 * 60 * 1000;    // 公钥缓存 1 小时
const JWKS_MIN_REFETCH_MS = 60 * 1000; // 未知 kid 触发的重取最小间隔（防打爆 certs 端点）
const CLOCK_SKEW_S = 30;

// 进程内缓存：isolate 存活期间复用。Workers 里每个 isolate 独立，量级可忽略。
let jwksCache = { keys: new Map(), fetchedAt: 0 };

function accessConfig(env) {
  const team = String((env && env.ACCESS_TEAM_DOMAIN) || '')
    .trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const aud = String((env && env.ACCESS_AUD) || '').trim();
  if (!team || !aud) return null;
  // team 必须是合法主机名，避免配置成任意 URL 导致 JWKS 请求被引去别处
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(team)) return null;
  return { team, aud, issuer: 'https://' + team };
}

function enabled(env) { return !!accessConfig(env); }

/* ---------------- base64url ---------------- */

function b64urlBytes(s) {
  const std = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const pad = std + '='.repeat((4 - (std.length % 4)) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

/* ---------------- JWKS ---------------- */

async function fetchJwks(cfg, force) {
  const now = Date.now();
  const fresh = jwksCache.keys.size > 0 && now - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh && !force) return jwksCache;
  // force 时也要夹一个最小间隔：攻击者用随机 kid 刷请求，不能让每次请求都去打 certs
  if (force && now - jwksCache.fetchedAt < JWKS_MIN_REFETCH_MS) return jwksCache;

  const res = await fetch(cfg.issuer + '/cdn-cgi/access/certs', {
    // Workers 的 fetch 支持 cf 缓存提示；Node 环境会忽略该字段
    cf: { cacheTtl: 3600, cacheEverything: true },
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error('JWKS 获取失败 HTTP ' + res.status);

  const data = await res.json();
  const keys = new Map();
  for (const k of (data && data.keys) || []) {
    if (k && k.kty === 'RSA' && k.kid) keys.set(k.kid, k);
  }
  jwksCache = { keys, fetchedAt: now };
  return jwksCache;
}

/** 测试注入点：替换公钥缓存（生产代码不调用） */
function __setJwksForTest(keys, fetchedAt) {
  const map = new Map();
  for (const k of keys || []) map.set(k.kid, k);
  jwksCache = { keys: map, fetchedAt: typeof fetchedAt === 'number' ? fetchedAt : Date.now() };
}

async function importKey(jwk) {
  return crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );
}

/* ---------------- JWT 校验 ---------------- */

/**
 * 校验断言。返回 { ok:true, payload } 或 { ok:false, reason }。
 * reason 只进服务端日志，不回给客户端（避免成为探测工具）。
 */
async function verifyJwt(token, cfg, opts) {
  if (!cfg) return { ok: false, reason: 'Access 未配置' };
  if (typeof token !== 'string' || !token) return { ok: false, reason: '缺少断言' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'JWT 结构非法' };

  let header, payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch (e) {
    return { ok: false, reason: 'JWT 编码非法' };
  }
  if (!header || typeof header !== 'object') return { ok: false, reason: 'JWT 头非法' };
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'JWT 载荷非法' };

  // 1. 算法白名单。绝不能接受 none，也绝不能接受 HS256——
  //    否则攻击者用公开的 JWKS 公钥当 HMAC 密钥就能自己签一个。
  if (header.alg !== 'RS256') {
    return { ok: false, reason: 'alg 必须为 RS256（实际：' + String(header.alg) + '）' };
  }
  if (!header.kid) return { ok: false, reason: '缺少 kid' };

  // 2. iss / aud / 时间窗
  if (String(payload.iss || '').replace(/\/+$/, '') !== cfg.issuer) {
    return { ok: false, reason: 'iss 不匹配' };
  }
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(cfg.aud)) {
    return { ok: false, reason: 'aud 不匹配（检查 ACCESS_AUD 是否为该应用的 Audience Tag）' };
  }
  const nowS = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number') return { ok: false, reason: '缺少 exp' };
  if (payload.exp + CLOCK_SKEW_S <= nowS) return { ok: false, reason: '断言已过期' };
  if (typeof payload.nbf === 'number' && payload.nbf - CLOCK_SKEW_S > nowS) {
    return { ok: false, reason: '断言尚未生效' };
  }
  if (typeof payload.iat === 'number' && payload.iat - CLOCK_SKEW_S > nowS) {
    return { ok: false, reason: '签发时间在未来' };
  }

  // 3. 取公钥（未知 kid 视为可能的密钥轮换，强制重取一次）
  let jwks;
  try {
    jwks = await fetchJwks(cfg, false);
    let jwk = jwks.keys.get(header.kid);
    if (!jwk) {
      jwks = await fetchJwks(cfg, true);
      jwk = jwks.keys.get(header.kid);
    }
    if (!jwk) return { ok: false, reason: '未知签名密钥 kid' };

    // 4. 验签
    const key = await importKey(jwk);
    const sig = b64urlBytes(parts[2]);
    const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
    if (!valid) return { ok: false, reason: '签名校验失败' };
  } catch (e) {
    return { ok: false, reason: '验签异常：' + (e && e.message ? e.message : String(e)) };
  }

  return { ok: true, payload };
}

/** 从载荷里取可展示身份（不参与任何权限判断） */
function identityOf(payload) {
  if (!payload) return '';
  return String(payload.email || payload.sub || '').slice(0, 120);
}

module.exports = {
  accessConfig, enabled, verifyJwt, identityOf,
  b64urlBytes, b64urlJson, __setJwksForTest,
  JWKS_TTL_MS, JWKS_MIN_REFETCH_MS, CLOCK_SKEW_S,
};
