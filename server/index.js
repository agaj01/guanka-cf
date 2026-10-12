'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Store } = require('./db');
const routes = require('./routes');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const store = new Store(DATA_DIR);
routes.init(store);

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 20 * 1024 * 1024) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('JSON 解析失败')); }
      } else {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data, headers) {
  const isObj = typeof data === 'object' && data !== null && !Buffer.isBuffer(data);
  const payload = isObj ? JSON.stringify(data) : String(data);
  res.writeHead(status, Object.assign({ 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' }, headers || {}));
  res.end(payload);
}

function serveStatic(res, pathname) {
  let fp = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
  if (!fp.startsWith(PUBLIC_DIR)) { send(res, 403, { error: 'Forbidden' }); return; }
  if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) fp = path.join(PUBLIC_DIR, 'index.html');
  const ext = path.extname(fp).toLowerCase();
  fs.readFile(fp, (e, data) => {
    if (e) { send(res, 404, { error: 'Not found' }); return; }
    send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  } catch (e) {
    send(res, 400, { error: 'Bad request' });
    return;
  }
  const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith('/api/')) {
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        body = await readBody(req);
      }
      const result = await routes.handle(req.method, pathname, url, body);
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
        send(res, 200, result.csv, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cards-export.csv"',
        });
        return;
      }
      send(res, result.status || 200, result.body);
      return;
    }
    serveStatic(res, pathname);
  } catch (e) {
    console.error('[管卡] 请求处理错误:', e);
    send(res, e.status || 500, { error: e.message || '服务器内部错误' });
  }
});

server.listen(PORT, HOST, () => {
  const cards = store.read('cards', []);
  console.log('============================================');
  console.log('  管卡 — 信用卡管理工具（Docker 版）已启动');
  console.log('  访问地址: http://localhost:' + PORT);
  console.log('  数据目录: ' + DATA_DIR + '（卡种库 ' + cards.length + ' 张）');
  console.log('============================================');
});

process.on('SIGTERM', () => { console.log('[管卡] 收到 SIGTERM，退出'); process.exit(0); });
process.on('SIGINT', () => { console.log('[管卡] 收到 SIGINT，退出'); process.exit(0); });
