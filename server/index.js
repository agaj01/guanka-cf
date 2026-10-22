'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { Store } = require('./db');
const routes = require('./routes');
const auth = require('./auth');

const PORT = parseInt(process.env.PORT || '3000', 10);
// 默认仍监听所有网卡（容器内必须如此，否则端口映射收不到请求），
// 但**访问控制**改由 auth.guard 负责：未配置 AUTH_TOKEN 时只放行回环来源。
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const store = new Store(DATA_DIR);
routes.init(store);

// TRUST_PROXY=1 表示部署在可信反代之后（按 X-Forwarded-For 判定客户端来源）。
// 反代场景下回环判定依据的是代理转发头而非 TCP 源地址，若此时未设 AUTH_TOKEN，
// 「仅回环放行」模式实际拦截不到任何外部请求（公网流量经反代进来都带本机源地址），
// 必须拒绝启动，防止静默降级为公网裸奔。
if (auth.TRUST_PROXY && !auth.authEnabled()) {
  console.error('[管卡] 启动被拒绝：TRUST_PROXY=1 要求必须设置 AUTH_TOKEN。' +
    '反代部署下「未设令牌仅回环」模式无法生效（外部请求经代理进来源地址均为本机）。' +
    '请设置 AUTH_TOKEN，或去掉 TRUST_PROXY 仅本机直连使用。');
  process.exit(1);
}

// 未捕获异常兜底：落盘后退出，由 Docker restart 策略拉起（JSON 原子写入保证数据不坏）
function crashLog(kind, e) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'error.log'),
      '[' + new Date().toISOString() + '] ' + kind + ': ' + ((e && (e.stack || e.message)) || e) + '\n');
  } catch (_) { /* 忽略日志写入失败 */ }
}
process.on('uncaughtException', (e) => { crashLog('uncaughtException', e); console.error('[管卡] 未捕获异常，服务退出:', e); process.exit(1); });
process.on('unhandledRejection', (e) => { crashLog('unhandledRejection', e); console.error('[管卡] 未处理的 Promise 拒绝，服务退出:', e); process.exit(1); });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/* ---------------- 静态资源：启动时预载 + 预压缩 + ETag ----------------
 * 原实现每个请求都 fs.readFile 重读磁盘、无内容协商压缩、且发 Cache-Control: no-cache
 * （语义是「每次都必须重新下载」）。实测 app.js 84,616 B → gzip 21,945 B，可省 74% 带宽；
 * 而 no-cache 让每次刷新都全量重传这 84KB。这些文件在运行时不会变，一次性读入内存即可。
 */
const STATIC = new Map();
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);
(function preloadStatic() {
  let files;
  try { files = fs.readdirSync(PUBLIC_DIR); } catch (e) { return; }
  for (const name of files) {
    const abs = path.join(PUBLIC_DIR, name);
    let buf;
    try {
      if (!fs.statSync(abs).isFile()) continue;
      buf = fs.readFileSync(abs);
    } catch (e) { continue; }
    const ext = path.extname(name).toLowerCase();
    const entry = {
      raw: buf,
      etag: '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"',
      type: MIME[ext] || 'application/octet-stream',
      compressible: COMPRESSIBLE.has(ext),
    };
    // 小于 1KB 不值得压缩（gzip 头开销会抵消收益）
    if (entry.compressible && buf.length > 1024) {
      try { entry.gz = zlib.gzipSync(buf, { level: 6 }); } catch (e) { /* 保留未压缩 */ }
    }
    STATIC.set('/' + name, entry);
  }
})();

function serveStatic(req, res, pathname) {
  if (pathname.includes('\0')) { send(res, 400, { error: 'Bad request' }); return; }
  const fp = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
  // 注意必须带上路径分隔符比较：只写 startsWith(PUBLIC_DIR) 会把同级目录 public-x/ 也放行
  if (fp !== PUBLIC_DIR && !fp.startsWith(PUBLIC_DIR + path.sep)) { send(res, 403, { error: 'Forbidden' }); return; }

  const rel = '/' + path.relative(PUBLIC_DIR, fp).split(path.sep).join('/');
  let entry = STATIC.get(rel);
  if (!entry) {
    // 未预载（启动后新增的文件）或路径不是文件：回落到 SPA 入口
    entry = STATIC.get('/index.html');
    if (!entry) { send(res, 404, { error: 'Not found' }); return; }
  }

  const headers = Object.assign({}, SECURITY_HEADERS, {
    'Content-Type': entry.type,
    'Cache-Control': 'public, max-age=3600',
    'ETag': entry.etag,
    'Vary': 'Accept-Encoding',
  });

  // 条件请求：内容未变直接 304，省掉整个响应体
  const inm = req.headers['if-none-match'];
  if (inm && inm.split(',').some((v) => v.trim() === entry.etag)) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  const accept = req.headers['accept-encoding'] || '';
  if (entry.gz && /\bgzip\b/.test(accept)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    res.end(entry.gz);
    return;
  }
  res.writeHead(200, headers);
  res.end(entry.raw);
}

/* ---------------- 请求体 ---------------- */
const MAX_BODY = 20 * 1024 * 1024;

function readBody(req, res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        // 原实现直接 req.destroy()：客户端只看到 ECONNRESET 拿不到 413，
        // 服务端的错误也因连接已断而写不回去。这里先应答再断开。
        if (!aborted) {
          aborted = true;
          try {
            const payload = JSON.stringify({ error: '请求体过大（上限 ' + (MAX_BODY / 1024 / 1024) + 'MB）' });
            res.writeHead(413, {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Length': Buffer.byteLength(payload),
              'Connection': 'close',
            });
            res.end(payload);
          } catch (_) { /* 响应可能已发出 */ }
          req.destroy();
          reject(new Error('请求体过大'));
        }
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('JSON 解析失败')); }
      } else {
        resolve(raw);
      }
    });
    req.on('error', (e) => { if (!aborted) reject(e); });
  });
}

/* ---------------- 安全响应头（基线纵深防御） ----------------
 * 前端 40+ 处 innerHTML，虽绝大多数经 esc() 转义，但任何一处疏漏都会变成可执行
 * XSS——CSP 是转义失误时的第二道防线。style-src 须带 unsafe-inline（前端大量
 * 内联 style）；脚本全部外链 app.js 无内联 <script>，script-src 'self' 即可。
 * X-Frame-Options 阻断点击劫持（shutdown 等敏感操作页面不该被任意站点嵌入）。
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; " +
    "base-uri 'none'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function send(res, status, data, headers) {
  if (res.headersSent) return;
  const isObj = typeof data === 'object' && data !== null && !Buffer.isBuffer(data);
  const payload = isObj ? JSON.stringify(data) : String(data);
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS,
    { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' }, headers || {}));
  res.end(payload);
}

/* ---------------- 登录 / 会话 ---------------- */
const LOGIN_MAX_TRIES = 5;
const LOGIN_LOCK_MS = 60 * 1000;
const loginFails = new Map(); // ip -> { count, until }

function loginLocked(ip) {
  const rec = loginFails.get(ip);
  if (!rec || !rec.until) return 0;
  if (Date.now() < rec.until) return Math.ceil((rec.until - Date.now()) / 1000);
  loginFails.delete(ip);
  return 0;
}
function noteLoginFail(ip) {
  const rec = loginFails.get(ip) || { count: 0, until: 0 };
  rec.count++;
  if (rec.count >= LOGIN_MAX_TRIES) { rec.until = Date.now() + LOGIN_LOCK_MS; rec.count = 0; }
  loginFails.set(ip, rec);
}

// @returns {true} 已处理；{false} 交给后续路由
async function handleAuthRoutes(req, res, pathname, urlObj) {
  // 登录限流按「客户端真实来源」计数：反代部署（TRUST_PROXY=1）时必须看 XFF，
  // 否则所有外部请求都被记到 127.0.0.1 头上，限流互相误伤（且形同共享封禁）
  const ip = auth.clientIp(req) || '?';

  if (pathname === '/api/auth/status') {
    // 只回「是否需要登录 / 当前是否已授权」，不回任何敏感信息
    const blocked = auth.authEnabled() ? !auth.checkToken(auth.credentialOf(req, urlObj)) : !auth.isLoopback(req);
    send(res, 200, { authRequired: auth.authEnabled(), authorized: !blocked });
    return true;
  }
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const wait = loginLocked(ip);
    if (wait) { send(res, 429, { error: '尝试过于频繁，请 ' + wait + ' 秒后重试' }); return true; }
    if (!auth.authEnabled()) { send(res, 400, { error: '服务未设置 AUTH_TOKEN，无需登录' }); return true; }
    let body = {};
    try { body = await readBody(req, res); } catch (e) { send(res, 413, { error: e.message }); return true; }
    const token = (body && typeof body === 'object' && body.token) || '';
    if (!auth.checkToken(String(token).trim())) {
      noteLoginFail(ip);
      send(res, 401, { error: '令牌不正确' });
      return true;
    }
    loginFails.delete(ip);
    send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie() });
    return true;
  }
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  let pathname;
  let urlObj;
  try {
    urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    // 畸形编码（如 /%、/%E0%A4%A）会抛 URIError：必须接住返回 400，
    // 否则 async 回调变成 rejected promise → unhandledRejection → 进程退出
    pathname = decodeURIComponent(urlObj.pathname);
  } catch (e) {
    send(res, 400, { error: 'Bad request' });
    return;
  }
  try {
    if (pathname.startsWith('/api/')) {
      // 登录/登出/状态：不参与鉴权守卫
      if (pathname.startsWith('/api/auth/')) {
        if (await handleAuthRoutes(req, res, pathname, urlObj)) return;
        send(res, 404, { error: 'Not found' });
        return;
      }
      // 鉴权守卫：健康检查放行；其余按 AUTH_TOKEN / 回环规则判定
      const blocked = auth.guard(req, urlObj, pathname);
      if (blocked) { send(res, blocked.status, blocked.body); return; }

      let body = {};
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        body = await readBody(req, res);
      }
      const result = await routes.handle(req.method, pathname, urlObj, body, req);
      if (result === undefined) { send(res, 404, { error: 'Not found' }); return; }
      if (result.shutdown) {
        send(res, 200, { ok: true, msg: '管卡服务正在安全退出…' });
        console.log('[管卡] 收到退出指令，数据已安全保存，正在停止服务…');
        setTimeout(() => {
          server.close(() => process.exit(0));
          setTimeout(() => process.exit(0), 1500).unref();
        }, 300);
        return;
      }
      if (result.csv !== undefined) {
        // headers 允许调用方覆盖（如持卡模板要自定义文件名）；缺省沿用卡种导出的老行为
        send(res, 200, result.csv, Object.assign({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cards-export.csv"',
        }, result.headers || {}));
        return;
      }
      if (result.ics !== undefined) {
        send(res, 200, result.ics, result.headers);
        return;
      }
      send(res, result.status || 200, result.body, result.headers);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error('[管卡] 请求处理错误:', e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.message || '服务器内部错误' });
  }
});

server.listen(PORT, HOST, () => {
  const cards = store.read('cards', []);
  console.log('============================================');
  console.log('  管卡 — 信用卡管理工具（Docker 版）已启动');
  console.log('  访问地址: http://localhost:' + PORT);
  console.log('  数据目录: ' + DATA_DIR + '（卡种库 ' + cards.length + ' 张）');
  if (auth.authEnabled()) {
    console.log('  访问控制: 已启用 AUTH_TOKEN（首次访问需输入令牌）');
  } else {
    console.log('  访问控制: 未设置 AUTH_TOKEN → 仅允许本机访问');
    console.log('            如需局域网/公网使用，请先设置 AUTH_TOKEN 环境变量');
  }
  if (store.warnings && store.warnings.length) {
    console.log('  数据告警: ' + store.warnings.length + ' 条（详见上方日志）');
  }
  console.log('============================================');
  startNotifyScheduler();
});

// 提醒调度：容器常驻进程每 10 分钟探测一次，实际检查间隔由 notify 配置决定
function startNotifyScheduler() {
  const tick = async () => {
    try {
      const out = await routes.runNotifyChecks(false);
      if (out && !out.skipped && out.sent > 0) {
        console.log('[管卡] 提醒检查完成：待提醒 %d 项，已推送 %d 项', out.checked || 0, out.sent || 0);
      }
    } catch (e) {
      console.error('[管卡] 提醒检查失败:', e && e.message ? e.message : e);
    }
  };
  setTimeout(tick, 15000); // 启动后先跑一次（首次 lastCheckAt 为空，会立即检查）
  setInterval(tick, 10 * 60 * 1000).unref();
}

process.on('SIGTERM', () => { console.log('[管卡] 收到 SIGTERM，退出'); process.exit(0); });
process.on('SIGINT', () => { console.log('[管卡] 收到 SIGINT，退出'); process.exit(0); });
