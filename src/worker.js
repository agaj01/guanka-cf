'use strict';

/* Worker 入口：只做两件事——把 /api/* 转给 Durable Object，其余交给静态资源。
 *
 * 鉴权为什么全部搬进 DO：
 * 会话表存在 DO Storage 里，只有 DO 能读到；若在 Worker 层做守卫，Worker 每次
 * 都要额外回源 DO 查会话（多一次内部往返），且会出现「两处都判断身份」的分裂。
 * 现在 Worker 是纯路由器，DO 是唯一身份判定点。
 *
 * 外部可达性：Worker 只转发 /api/ 前缀，因此 DO 的内部端点
 * （/__cron/*）不可能被公网请求命中；DO 本身没有公网入口。
 */

import { GuankaDO } from './do.js';

export { GuankaDO };

const DO_NAME = 'guanka-singleton';

/** 请求体上限：与 DO 侧 MAX_BODY 保持一致（20MB） */
const MAX_BODY = 20 * 1024 * 1024;

function getStub(env) {
  const id = env.GUANKA_DO.idFromName(DO_NAME);
  return env.GUANKA_DO.get(id);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 注意：这里是**未解码**的 pathname。编码变体（/api/%2e%2e/x）会原样转发给 DO，
    // 由 DO 解码后再做严格匹配，不会因为解码差异跳出 /api/ 前缀。
    if (url.pathname.startsWith('/api/')) {
      // 超大请求体在转发之前就拒掉：Request 一旦被当作子请求发出，它携带的流
      // 就由运行时负责泵送，此时提前返回响应会在日志里留下
      // “Can't read from request stream after response has been sent.”。
      const len = parseInt(request.headers.get('content-length') || '0', 10);
      if (Number.isFinite(len) && len > MAX_BODY) {
        return new Response(
          JSON.stringify({ error: '请求体过大（上限 ' + (MAX_BODY / 1024 / 1024) + 'MB）' }),
          { status: 413, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
        );
      }
      return getStub(env).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },

  /** Cron Triggers：每 10 分钟心跳（实际推送节奏由 notify.intervalMinutes 节流） */
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const stub = getStub(env);
        const res = await stub.fetch('https://do.internal/__cron/checks', {
          method: 'POST',
          headers: { 'x-gk-cron': '1' },
        });
        const out = await res.json();
        if (out && !out.skipped) console.log('[管卡] cron 提醒检查：待提醒 %d，已推送 %d', out.checked || 0, out.sent || 0);
        else if (out && out.skipped) console.log('[管卡] cron 跳过：' + (out.reason || ''));
      } catch (e) {
        console.error('[管卡] cron 失败:', (e && e.message) || e);
      }
    })());
  },
};
