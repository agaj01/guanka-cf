'use strict';

/* 主令牌强度规则（纯函数，无运行时依赖）。
 *
 * 单独成文件的原因：Worker 运行期（src/auth.js 兜底告警）与部署自检
 * （scripts/check-token.js、scripts/preflight.js）要共用同一套判定，
 * 否则「本地说能过、线上说太弱」这种口径漂移必然发生。
 */

/* eslint-disable no-control-regex */
function inspectTokenStrength(token) {
  const t = String(token || '');
  if (!t) return { ok: false, reason: '未配置 AUTH_TOKEN' };
  if (t.length < 24) return { ok: false, reason: 'AUTH_TOKEN 过短（至少 24 字符，建议 `openssl rand -base64 32` 生成的 44 字符）' };
  if (/^(.)\1+$/.test(t)) return { ok: false, reason: 'AUTH_TOKEN 是同一个字符重复' };
  if (/^\d+$/.test(t)) return { ok: false, reason: 'AUTH_TOKEN 全为数字，极易被穷举；请改用随机字符串' };
  if (/^(?:[0-9]{4}-?){3,}[0-9]*$/.test(t)) return { ok: false, reason: 'AUTH_TOKEN 像日期/证件号，请改用随机字符串' };
  const weak = ['password', 'passwd', 'admin', 'guanka', 'creditcard', 'card123', '123456', 'qwerty', 'changeme', 'letmein', 'test'];
  const low = t.toLowerCase();
  const hit = weak.find((w) => low.includes(w));
  if (hit) return { ok: false, reason: 'AUTH_TOKEN 含常见弱口令片段「' + hit + '」' };
  const kinds = new Set(t.split('')).size;
  if (kinds < 10) return { ok: false, reason: 'AUTH_TOKEN 字符种类过少（仅 ' + kinds + ' 种），熵不足' };
  return { ok: true, reason: '' };
}

module.exports = { inspectTokenStrength };
