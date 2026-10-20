'use strict';
// Workers 垫片：routes.js 的 sameOrigin(plainReq)（原 server/auth.js 同名函数的子集）
function sameOrigin(req) {
  const h = (req && req.headers) || {};
  const source = h.origin || h.referer || '';
  if (!source) return true; // 非浏览器（curl 等）无 Origin/Referer，由鉴权层负责
  try { return new URL(source).host === (h.host || ''); } catch (e) { return false; }
}
module.exports = { sameOrigin };
