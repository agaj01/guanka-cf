'use strict';

/* 主令牌强度体检。
 *
 * 用法：
 *   node scripts/check-token.js 'my-token'
 *   echo -n 'my-token' | node scripts/check-token.js
 *   AUTH_TOKEN='my-token' node scripts/check-token.js
 *
 * 退出码 0 = 合格，1 = 不合格（可用于 CI / 部署脚本串联）。
 */

const { inspectTokenStrength } = require('../src/token-rules.js');

function readToken() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.env.AUTH_TOKEN) return process.env.AUTH_TOKEN;
  try {
    const stdin = require('fs').readFileSync(0, 'utf8');
    if (stdin) return stdin.replace(/\r?\n$/, '');
  } catch (e) { /* 无 stdin */ }
  return '';
}

const token = readToken();
if (!token) {
  console.error('用法：node scripts/check-token.js \'<令牌>\'  或  echo -n \'<令牌>\' | node scripts/check-token.js');
  process.exit(1);
}

const r = inspectTokenStrength(token);
const masked = token.length <= 6 ? '***' : token.slice(0, 2) + '***' + token.slice(-2);
console.log('令牌：' + masked + '（长度 ' + token.length + '）');
if (r.ok) {
  console.log('✅ 强度合格');
  process.exit(0);
}
console.error('❌ 不合格：' + r.reason);
console.error('   生成合格令牌：openssl rand -base64 32');
process.exit(1);
