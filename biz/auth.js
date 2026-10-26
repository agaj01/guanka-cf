'use strict';

/* Workers 垫片：取代 Node 版 server/auth.js。
 *
 * biz/routes.js 内部对原 auth 模块的唯一依赖是 sameOrigin(plainReq)，
 * 且调用方传入的是普通对象 { headers: { origin, referer, host } }（见 src/do.js 的适配）。
 * 真正的身份认证已上移到 Worker/DO 的会话层（src/auth.js + src/session.js），
 * 这里只保留 CSRF 同源判断。
 */

function sameOrigin(req) {
  const h = (req && req.headers) || {};
  const source = h.origin || h.referer || '';
  if (!source) return true; // 非浏览器请求（curl 等）无 Origin/Referer，由会话层负责鉴权
  try { return new URL(source).host === (h.host || ''); } catch (e) { return false; }
}

module.exports = { sameOrigin };
