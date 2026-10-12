'use strict';
/* 极简 mock 通知服务（用于端到端联调）：接收 wxpusher / Server酱 / Bark 请求并写入日志
 * 用法: PORT=3998 LOG=.test-data/mock.log node tools/mock-notify.js
 */
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3998;
const LOG = process.env.LOG || '.test-data/mock.log';

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    fs.appendFileSync(LOG, req.method + ' ' + req.url + ' | ' + String(req.headers['content-type'] || '') + ' | ' + body.slice(0, 400) + '\n');
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('wxpusher')) res.end(JSON.stringify({ code: 1000, msg: '成功', success: true }));
    else if (req.url.includes('.send')) res.end(JSON.stringify({ code: 0, message: '', data: {} }));
    else res.end(JSON.stringify({ code: 200, message: 'success' }));
  });
}).listen(PORT, '127.0.0.1', () => console.log('mock notify server on ' + PORT));
