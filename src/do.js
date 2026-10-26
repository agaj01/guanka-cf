'use strict';

/* Durable Object：管卡应用内核 + 唯一身份判定点。
 *
 * 职责：
 * 1. 持 Store（内存缓存 + DO Storage 持久化）与 SessionStore（会话表 + 登录限流）
 * 2. 串行化：Workers 平台保证同一 DO 的请求逐个执行，「读-改-写」之间无并发让出点
 * 3. 鉴权：Cookie 里的不透明会话 id → 服务端会话表校验（不再是「Cookie 值就是主令牌」）
 * 4. 注入平台环境：globalThis.NOW（北京时区锚定）/ globalThis.ENV（env 绑定）
 */

import { Store } from './store.js';
import { SessionStore } from './session.js';
import { nowBJ } from './time.js';
import auth from './auth.js';
import routes from '../biz/routes.js';

// 请求体上限：与上游 Node 版 MAX_BODY(20MB) 对齐
const MAX_BODY = 20 * 1024 * 1024;

function resp(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function respWith(status, obj, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}),
  });
}

function bodyTooLarge(request) {
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  return Number.isFinite(len) && len > MAX_BODY;
}

/* 提前返回响应之前，先把请求体消费掉。
 *
 * 每个请求体是一根从 Worker 传进来的流；若在流被读完之前就把响应发出去，
 * workerd 会在响应已发出后继续拉取剩余字节并抛出
 * “Can't read from request stream after response has been sent.”。
 * 因此所有「不读 body 就返回」的分支（鉴权失败 / CSRF / 413 / 404）都要先收尾。 */
async function drainBody(request) {
  if (!request.body) return;
  const reader = request.body.getReader();
  try {
    // 分块读、即读即弃：不累积到内存，大体积请求也不会把 DO 撑爆
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (e) {
    try { await reader.cancel(); } catch (e2) { /* 已关闭，忽略 */ }
  }
}

export class GuankaDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.store = new Store(state);
    this.sessions = new SessionStore(state);
    globalThis.NOW = nowBJ;
    globalThis.ENV = env;

    state.blockConcurrencyWhile(async () => {
      await this.store.warmup();
      routes.init(this.store);
      // 运行期兜底：主令牌强度不足时在日志里明确告警（部署自检会先拦一道）
      const chk = auth.inspectTokenStrength(auth.masterToken(env));
      if (!chk.ok) console.warn('[管卡] AUTH_TOKEN 强度不足：' + chk.reason);
    });
    this.ready = true;
  }

  /* ================= 身份判定 ================= */

  /**
   * 判定请求身份。接受三种凭证，权限各有边界：
   * 1. 会话 Cookie（浏览器，唯一能进 UI 的方式）
   * 2. Bearer <主令牌>（脚本/自动化；等于完全权限，故不进 Cookie）
   * 3. ?token=<日历派生令牌>（仅 /api/calendar.ics 只读）
   * 主令牌**不接受**出现在查询串里——避免进浏览器历史/访问日志/Referer。
   */
  async authenticate(request, url, pathname) {
    if (!auth.authEnabled(this.env)) {
      return {
        ok: false, status: 403, sid: '',
        body: {
          error: 'Worker 未配置 AUTH_TOKEN。请执行 `wrangler secret put AUTH_TOKEN` 后重试。',
          needToken: true,
        },
      };
    }

    const sid = auth.sidOf(request);
    if (sid) {
      const rec = await this.sessions.get(sid, await auth.tokenFingerprint(this.env));
      if (rec) return { ok: true, sid, rec, via: 'session' };
    }

    const bearer = auth.bearerOf(request);
    if (bearer && await auth.checkMasterToken(this.env, bearer)) {
      return { ok: true, sid: '', via: 'bearer' };
    }

    if (pathname === '/api/calendar.ics') {
      const t = url.searchParams.get('token') || '';
      if (t && await auth.checkCalendarToken(this.env, t)) {
        return { ok: true, sid: '', via: 'calendar' };
      }
    }

    return { ok: false, status: 401, sid, body: { error: '未授权：请先登录', needAuth: true } };
  }

  /* ================= 鉴权端点 ================= */

  async authStatus(request) {
    const enabled = auth.authEnabled(this.env);
    if (!enabled) return resp(200, { authRequired: true, authorized: false, configured: false });
    const sid = auth.sidOf(request);
    let authorized = false;
    if (sid) authorized = !!(await this.sessions.get(sid, await auth.tokenFingerprint(this.env)));
    if (!authorized) {
      const bearer = auth.bearerOf(request);
      if (bearer) authorized = await auth.checkMasterToken(this.env, bearer);
    }
    const out = { authRequired: true, authorized, configured: true };
    if (authorized) {
      const chk = auth.inspectTokenStrength(auth.masterToken(this.env));
      out.weakToken = chk.ok ? '' : chk.reason; // 仅在已授权时回传，避免未登录探测
    }
    return resp(200, out);
  }

  async login(request) {
    if (!auth.authEnabled(this.env)) return resp(400, { error: '服务未设置 AUTH_TOKEN，无法登录' });

    const ip = auth.clientIp(request);
    const gate = await this.sessions.gate(ip);
    if (gate.locked) {
      await drainBody(request);
      return respWith(429, { error: '尝试过于频繁，请 ' + gate.wait + ' 秒后重试', wait: gate.wait },
        { 'Retry-After': String(gate.wait) });
    }

    // CSRF：登录本身也要求同源（无 Origin/Referer 的脚本请求放行）
    if (!auth.sameOrigin(request)) {
      await drainBody(request);
      return resp(403, { error: '跨站请求被拒绝' });
    }

    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    const given = String((body && body.token) || '').trim();

    if (!(await auth.checkMasterToken(this.env, given))) {
      const st = await this.sessions.fail(ip);
      const left = st.until ? Math.ceil((st.until - Date.now()) / 1000) : 0;
      return respWith(401, {
        error: left > 0 ? '令牌不正确，已锁定 ' + left + ' 秒' : '令牌不正确',
        wait: left,
      }, left > 0 ? { 'Retry-After': String(left) } : {});
    }

    await this.sessions.reset(ip);
    const sid = auth.randomId();
    // 会话绑定当前令牌指纹：换 AUTH_TOKEN 后旧会话自动全部失效
    await this.sessions.create(sid, ip, request.headers.get('user-agent') || '',
      await auth.tokenFingerprint(this.env));
    return respWith(200, { ok: true }, { 'Set-Cookie': auth.sessionCookie(sid) });
  }

  async logout(request) {
    await drainBody(request);
    const sid = auth.sidOf(request);
    if (sid) await this.sessions.revoke(sid);
    return respWith(200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  }

  /** 吊销其他所有会话（默认保留当前设备）；includeSelf=true 时连自己一起踢 */
  async logoutAll(request, who) {
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    const includeSelf = !!(body && body.includeSelf);
    const n = includeSelf
      ? await this.sessions.revokeAll(null)
      : await this.sessions.revokeAll(who.sid);
    const headers = includeSelf ? { 'Set-Cookie': auth.clearCookie() } : {};
    return respWith(200, { ok: true, revoked: n, selfSignedOut: includeSelf }, headers);
  }

  async listSessions(who) {
    const list = await this.sessions.list(who.sid);
    return resp(200, { sessions: list });
  }

  async revokeSession(request, who) {
    let body = {};
    try { body = await request.json(); } catch (e) { body = {}; }
    const id = String((body && body.id) || '').trim();
    if (!id) return resp(400, { error: '缺少会话 id' });
    const wasCurrent = who.sid && who.sid.startsWith(id);
    const ok = await this.sessions.revokeByPrefix(id);
    if (!ok) return resp(404, { error: '会话不存在或已失效' });
    const headers = wasCurrent ? { 'Set-Cookie': auth.clearCookie() } : {};
    return respWith(200, { ok: true, selfSignedOut: !!wasCurrent }, headers);
  }

  /** 日历订阅地址（派生令牌，可安全交给日历服务） */
  async calendarTokenResp(request) {
    const token = await auth.calendarToken(this.env);
    const origin = new URL(request.url).origin;
    return resp(200, {
      token,
      path: '/api/calendar.ics?token=' + token,
      url: origin + '/api/calendar.ics?token=' + token,
      note: '该令牌只能读取日历，不具备任何写权限；轮换 AUTH_TOKEN 即可吊销。',
    });
  }

  /* ================= 请求分发 ================= */

  async fetch(request) {
    globalThis.ENV = this.env;
    globalThis.NOW = nowBJ;

    const url = new URL(request.url);
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch (e) { pathname = url.pathname; }
    const method = request.method;

    // ---- 内部端点：只接受 Worker 的 scheduled 调用（外部无法命中，双保险）----
    if (pathname === '/__cron/checks') {
      if (request.headers.get('x-gk-cron') !== '1') {
        await drainBody(request);
        return resp(404, { error: 'Not found' });
      }
      return resp(200, await this.runCronChecks());
    }

    // ---- 公开端点 ----
    if (pathname === '/api/health') {
      // 健康检查不需要鉴权，但也只回最小信息（不回版本号，避免指纹暴露）
      await drainBody(request);
      return resp(200, { ok: true });
    }
    if (pathname === '/api/auth/status') return this.authStatus(request);
    if (pathname === '/api/auth/login' && method === 'POST') return this.login(request);
    if (pathname === '/api/auth/logout' && method === 'POST') return this.logout(request);

    if (!pathname.startsWith('/api/')) {
      await drainBody(request);
      return resp(404, { error: 'Not found' });
    }

    // ---- 以下全部需要鉴权 ----
    const who = await this.authenticate(request, url, pathname);
    if (!who.ok) {
      await drainBody(request);
      return respWith(who.status, who.body, {});
    }

    if (pathname === '/api/auth/logout-all' && method === 'POST') return this.logoutAll(request, who);
    if (pathname === '/api/auth/sessions' && method === 'GET') return this.listSessions(who);
    if (pathname === '/api/auth/sessions/revoke' && method === 'POST') return this.revokeSession(request, who);
    if (pathname === '/api/auth/calendar-token' && method === 'GET') return this.calendarTokenResp(request);

    // ---- 业务 API（写请求做同源校验，挡 CSRF）----
    if (method !== 'GET' && method !== 'HEAD' && who.via === 'session' && !auth.sameOrigin(request)) {
      await drainBody(request);
      return resp(403, { error: '跨站请求被拒绝' });
    }
    if (bodyTooLarge(request)) {
      // 兜底（正常应由 Worker 层拦下；这里的场景是 chunked 无 content-length 的请求）
      await drainBody(request);
      return resp(413, { error: '请求体过大（上限 ' + (MAX_BODY / 1024 / 1024) + 'MB）' });
    }
    return this.handleRequest(request, url);
  }

  /** 处理业务 API 请求（鉴权已在 fetch 层完成） */
  async handleRequest(req, url) {
    const method = req.method;
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch (e) { pathname = url.pathname; }

    let body = {};
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const raw = await req.text();
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return resp(400, { error: 'JSON 解析失败' }); }
      } else {
        body = raw;
      }
    }

    let result;
    try {
      result = await routes.handle(method, pathname, url, body, {
        // routes.js 的 sameOrigin(plainReq) 只用到这三个头
        headers: {
          origin: req.headers.get('origin'),
          referer: req.headers.get('referer'),
          host: req.headers.get('host'),
        },
      });
    } finally {
      // 请求收尾：等待全部排队落盘写完成（成功与异常路径都要走）
      await this.store.flush();
    }
    try {
      if (result === undefined) return resp(404, { error: 'Not found' });
      if (result.shutdown) {
        return resp(200, { ok: true, msg: 'Workers 版无进程退出概念（数据实时持久化），已忽略 shutdown 指令' });
      }
      if (result.csv !== undefined) {
        return new Response(result.csv, {
          status: 200,
          headers: Object.assign({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cards-export.csv"',
          }, result.headers || {}),
        });
      }
      if (result.ics !== undefined) {
        return new Response(result.ics, { status: 200, headers: result.headers || {} });
      }
      const status = result.status || 200;
      const isObj = typeof result.body === 'object' && result.body !== null;
      const payload = isObj ? JSON.stringify(result.body) : String(result.body == null ? '' : result.body);
      const headers = Object.assign(
        { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' },
        result.headers || {},
      );
      return new Response(payload, { status, headers });
    } catch (e) {
      console.error('[管卡] DO 请求处理错误:', (e && e.stack) || e);
      return resp((e && e.status) || 500, { error: (e && e.message) || '服务器内部错误' });
    }
  }

  /** 提醒检查（Cron 或手动触发共用；force=false 按 notify 配置节流） */
  async runCronChecks() {
    try {
      const out = await routes.runNotifyChecks(false);
      await this.store.flush();
      if (out && !out.skipped) {
        console.log('[管卡] 提醒检查完成：待提醒 %d 项，已推送 %d 项', out.checked || 0, out.sent || 0);
      }
      return out;
    } catch (e) {
      console.error('[管卡] 提醒检查失败:', (e && e.message) || e);
      return { skipped: true, reason: String((e && e.message) || e) };
    }
  }
}
