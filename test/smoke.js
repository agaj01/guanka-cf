'use strict';

/* 冒烟测试：不依赖 wrangler/miniflare，用 Node 模拟 DO 环境验证：
 * 1. biz/ 业务层可加载（require 链完整、无 Node 专有 API 残留报错）
 * 2. NOW() 注入后业务层日期语义 = 北京时间
 * 3. routes.handle 全链路：health/meta/settings/cards CRUD/持卡/笔数/备份
 * 4. Store 读写 + 类型隔离
 * 5. 本项目定制点：只记笔数（金额记账已移除）、账单接口已下线、排序字段齐备
 *
 * 运行：node test/smoke.js
 */

const fs = require('fs');
const assert = require('assert');

const ROOT = __dirname + '/..';

// ---- 模拟 DO Storage（对齐真实 API：get/put/delete 返回 Promise；put 微任务后落盘）----
class MockStorage {
  constructor() { this.map = new Map(); }
  get(k) { return Promise.resolve(this.map.has(k) ? this.map.get(k) : undefined); }
  put(k, v) { return Promise.resolve().then(() => { this.map.set(k, structuredClone(v)); }); }
  delete(k) { return Promise.resolve().then(() => { this.map.delete(k); }); }
  list(opts) {
    const prefix = (opts && opts.prefix) || '';
    const out = new Map();
    for (const [k, v] of this.map) if (k.startsWith(prefix)) out.set(k, v);
    return Promise.resolve(out);
  }
}

// ---- 构造 globalThis.NOW / ENV（do.js 在运行时注入的等价物）----
const { nowBJ } = require(ROOT + '/src/time.js');
globalThis.NOW = nowBJ;
globalThis.ENV = { AUTH_TOKEN: 'test-token-0123456789abcdef' };

const { Store } = require(ROOT + '/src/store.js');
const routes = require(ROOT + '/biz/routes.js');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}

async function main() {
  const state = { storage: new MockStorage() };
  const store = new Store(state);
  await store.warmup();
  routes.init(store);

  console.log('== 1. Store 基础 ==');
  store.write('settings', { theme: 'dark' });
  await store.flush();
  ok(state.storage.map.has('ds:settings'), 'write 落盘 DO Storage');
  ok(store.readObject('settings', {}).theme === 'dark', 'read 回读缓存');
  const store2 = new Store(state);
  await store2.warmup();
  ok(store2.readObject('settings', {}).theme === 'dark', '重启后从持久层恢复');
  await state.storage.put('ds:cards', 'not-an-array');
  const store3 = new Store(state);
  await store3.warmup();
  ok(Array.isArray(store3.readArray('cards')) && store3.readArray('cards').length === 0, '非数组数据隔离回退空数组');
  ok(store3.warnings.some((w) => w.includes('cards') && w.includes('隔离')), '坏数据已隔离并告警');

  console.log('== 2. NOW() 时区语义 ==');
  const d = nowBJ();
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  ok(d.getHours() === bj.getHours() && d.getDate() === bj.getDate(), 'NOW() 分量 = UTC+8');
  const U = require(ROOT + '/biz/util.js');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(U.todayStr()), 'todayStr 走 NOW 锚定');

  console.log('== 3. 数据集已精简 ==');
  const { DATASETS } = require(ROOT + '/src/store.js');
  ok(!DATASETS.includes('bills'), 'store 不再持有 bills 数据集');
  ok(DATASETS.includes('consumptions'), 'store 仍持有 consumptions 数据集');

  console.log('== 4. routes 全链路 ==');
  const url = (p) => new URL('https://x.test' + p);
  const req = { headers: { origin: '', referer: '', host: 'x.test' } };

  let r = await routes.handle('GET', '/api/health', url('/api/health'), {}, req);
  ok(r.body && r.body.ok === true, 'GET /api/health');

  r = await routes.handle('GET', '/api/meta', url('/api/meta'), {}, req);
  ok(r.body && r.body.channels && r.body.assets && r.body.csvHeader, 'GET /api/meta（含资产元数据）');

  r = await routes.handle('PUT', '/api/settings', url('/api/settings'), { theme: 'dark' }, req);
  ok(r.body.theme === 'dark', 'PUT /api/settings');

  r = await routes.handle('POST', '/api/cards', url('/api/cards'), { bank: '测试银行', name: '测试卡', level: '白金', org: '银联', annualFee: '1000' }, req);
  ok(r.status === 201 && r.body.id, 'POST /api/cards 创建');
  const cardId = r.body.id;

  r = await routes.handle('GET', '/api/cards', url('/api/cards'), {}, req);
  ok(r.body.some((c) => c.id === cardId), 'GET /api/cards 含新卡');
  ok(r.body.length >= 5, '种子卡种已播种（init）');

  r = await routes.handle('GET', '/api/mycards', url('/api/mycards'), {}, req);
  ok(Array.isArray(r.body.data) && r.body.data.length === 0, 'GET /api/mycards 空列表');

  // 建一张「笔数刷免」卡：每年刷 6 笔免年费
  r = await routes.handle('POST', '/api/mycards', url('/api/mycards'), {
    cardId, alias: '主力卡', creditLimit: '50000',
    waiverType: '笔数刷免', waiverCondition: '6', annualFee: '1000',
    billingDay: 5, repayMode: 'fixed', repayValue: 25, graceDays: 3,
    feeMonth: 12, feeDay: 1,
  }, req);
  ok(r.status === 201 && r.body.id, 'POST /api/mycards 持卡（笔数刷免）');
  const myCardId = r.body.id;

  console.log('== 5. 只记笔数 ==');
  r = await routes.handle('GET', '/api/mycards', url('/api/mycards'), {}, req);
  let mc = r.body.data[0];
  ok(mc.waiver && mc.waiver.kind === '笔数刷免', 'waiver 类型正确');
  ok(mc.waiver.target === 6 && mc.waiver.progress === 0, '初始进度 0/6');
  ok(typeof mc.interestFreeDays === 'number' && mc.interestFreeDays > 0, '返回免息期天数 interestFreeDays');
  ok(mc.monthCount === 0 && mc.cardYearCount === 0, '笔数统计初始为 0');
  ok(mc.monthSpend === undefined, '不再返回金额统计字段');

  r = await routes.handle('POST', '/api/mycards/' + myCardId + '/consumptions/count',
    url('/api/mycards/' + myCardId + '/consumptions/count'), { date: U.todayStr(), count: 4 }, req);
  ok(r.status === 201 && r.body.type === 'count', 'POST 记 4 笔');

  r = await routes.handle('GET', '/api/mycards', url('/api/mycards'), {}, req);
  mc = r.body.data[0];
  ok(mc.waiver.progress === 4 && mc.waiver.remaining === 2, '笔数进度 4/6、剩余 2');
  ok(mc.waiver.met === false && mc.feeStatus === '未达标', '未达标状态正确');
  ok(mc.monthCount === 4 && mc.cardYearCount === 4, '月/卡年笔数统计');

  // 金额记账接口应已下线
  r = await routes.handle('POST', '/api/mycards/' + myCardId + '/consumptions',
    url('/api/mycards/' + myCardId + '/consumptions'), { amount: '66.5' }, req);
  ok(r === undefined, '金额记账 POST /consumptions 已下线（404）');

  r = await routes.handle('POST', '/api/mycards/' + myCardId + '/consumptions/count',
    url('/api/mycards/' + myCardId + '/consumptions/count'), { date: U.todayStr(), count: 2 }, req);
  r = await routes.handle('GET', '/api/mycards', url('/api/mycards'), {}, req);
  mc = r.body.data[0];
  ok(mc.waiver.progress === 6 && mc.waiver.met === true, '刷满 6 笔后自动达标');
  ok(mc.feeStatus !== '未达标', 'feeStatus 转为已达标');

  // 删除一条笔数记录应可撤销
  const countRecs = store.readArray('consumptions');
  ok(countRecs.length === 2, '库中两条笔数记录');
  r = await routes.handle('DELETE', '/api/mycards/' + myCardId + '/consumptions/' + countRecs[0].id,
    url('/api/mycards/' + myCardId + '/consumptions/' + countRecs[0].id), {}, req);
  ok(r.body && r.body.ok === true, 'DELETE 可撤销笔数记录');

  // 账单接口应全部下线
  const removed = [
    ['GET', '/api/bills'],
    ['POST', '/api/bills'],
    ['POST', '/api/mycards/' + myCardId + '/bills/generate'],
  ];
  for (const [m, p] of removed) {
    const res = await routes.handle(m, p, url(p), {}, req);
    ok(res === undefined, '账单接口已下线：' + m + ' ' + p);
  }

  console.log('== 6. 备份导入导出 ==');
  r = await routes.handle('GET', '/api/mycards/export', url('/api/mycards/export'), {}, req);
  const backup = JSON.parse(r.body);
  ok(backup.schema === 'guanka-backup' && backup.myCards.length === 1, '备份导出 schema/内容');
  ok(backup.bills === undefined, '备份不再包含 bills');
  ok(backup.consumptions.every((x) => x.type === 'count'), '备份消费记录全为笔数型');

  r = await routes.handle('POST', '/api/mycards/import', url('/api/mycards/import'), { data: backup, mode: 'merge' }, req);
  ok(r.status === 200 && r.body.dedupedCards === 1, '备份导入 merge（重复持卡按 id 去重）');
  await routes.handle('POST', '/api/mycards/import', url('/api/mycards/import'), { data: backup, mode: 'merge' }, req);
  r = await routes.handle('GET', '/api/mycards', url('/api/mycards'), {}, req);
  ok(r.body.data.length === 1, 'merge 幂等：重复导入不产生重复持卡');

  // 旧备份带 bills / 金额消费，导入应静默忽略而不报错
  const legacy = JSON.parse(JSON.stringify(backup));
  legacy.bills = [{ id: 'b1', myCardId: myCardId, month: '2026-09', amount: 999 }];
  legacy.consumptions.push({ id: 'legacy-amount-1', myCardId: myCardId, type: 'amount', amount: 100, date: '2026-09-01' });
  r = await routes.handle('POST', '/api/mycards/import', url('/api/mycards/import'), { data: legacy, mode: 'patch' }, req);
  ok(r.status === 200, '旧版备份（含 bills/金额消费）导入不报错');

  console.log('== 7. 统计与日历 ==');
  r = await routes.handle('GET', '/api/stats', url('/api/stats'), {}, req);
  ok(r.body && 'monthCount' in r.body && r.body.monthSpend === undefined, 'GET /api/stats 只统计笔数');

  r = await routes.handle('GET', '/api/notify/config', url('/api/notify/config'), {}, req);
  ok(r.body && r.body.channels, 'GET /api/notify/config');

  r = await routes.handle('GET', '/api/calendar.ics', url('/api/calendar.ics'), {}, req);
  ok(typeof r.ics === 'string' && r.ics.startsWith('BEGIN:VCALENDAR'), 'GET /api/calendar.ics');

  console.log('== 8. 源码卫生检查 ==');
  for (const f of fs.readdirSync(ROOT + '/biz')) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(ROOT + '/biz/' + f, 'utf8');
    ok(!/new Date\(\s*\)/.test(src), f + ' 无裸 new Date() 残留');
    ok(!/process\.env\./.test(src), f + ' 无裸 process.env 残留');
    ok(!/Date\.now\(\)/.test(src), f + ' 无裸 Date.now() 残留（与 NOW 时钟统一）');
  }
  const routesSrc = fs.readFileSync(ROOT + '/biz/routes.js', 'utf8');
  ok(!/getBills\(/.test(routesSrc), 'routes.js 无 getBills 残留');
  ok(!/'bills'/.test(routesSrc.replace(/\/\/.*$/gm, '')), 'routes.js 无 bills 数据集写入残留');

  console.log('== 9. 提醒节流时钟一致性（P0 防回归）==');
  ok(/NOW\(\)\.getTime\(\) - new Date\(cfg\.lastCheckAt\)/.test(routesSrc), '节流判断与写入同用 NOW 时钟');
  const out1 = await routes.runNotifyChecks(false);
  ok(out1.skipped === false, '第 1 轮 cron 执行（lastCheckAt 为空不节流）');
  const notifyCfg = JSON.parse(JSON.stringify(store.readObject('notify', {})));
  ok(notifyCfg.lastCheckAt, 'lastCheckAt 已写入');
  const out2 = await routes.runNotifyChecks(false);
  ok(out2.skipped === true, '第 2 轮 cron 被 interval 节流');

  console.log('== 10. 会话与令牌轮换（安全防回归）==');
  const { SessionStore, SESSION_TTL_MS } = require(ROOT + '/src/session.js');
  const sess = new SessionStore({ storage: new MockStorage() });
  await sess.create('sid-aaa', '1.2.3.4', 'UA/1', 'fp-old');
  ok(!!(await sess.get('sid-aaa', 'fp-old')), '同令牌指纹可取到会话');
  ok((await sess.get('sid-aaa', 'fp-new')) === null, '换令牌后旧会话立即失效');
  ok((await sess.get('sid-aaa', 'fp-old')) === null, '失效会话已被删除（不会复活）');
  await sess.create('sid-bbb', '1.2.3.4', 'UA/1', 'fp-old');
  ok((await sess.get('sid-bbb', '')) === null, '缺指纹（升级前的老会话）一律失效');
  await sess.create('sid-old', '1.2.3.4', 'UA/1', 'fp-old');
  const raw = await sess.storage.get('sess:sid-old');
  raw.createdAt = Date.now() - SESSION_TTL_MS - 1000;
  await sess.storage.put('sess:sid-old', raw);
  ok((await sess.get('sid-old', 'fp-old')) === null, '超过 30 天绝对有效期失效');
  ok(!/fp-old/.test(fs.readFileSync(ROOT + '/src/auth.js', 'utf8')), 'auth.js 不含任何硬编码指纹');

  const authMod = require(ROOT + '/src/auth.js');
  ok(authMod.authEnabled({}) === false, '无 AUTH_TOKEN 时 authEnabled=false');
  ok((await authMod.calendarToken({})) === '', '无 AUTH_TOKEN 时日历派生令牌为空（纯 Access 模式不支持日历订阅）');
  ok((await authMod.calendarToken({ AUTH_TOKEN: 'x'.repeat(40) })).length === 32, '有令牌时派生令牌为 32 字符');

  console.log('== 11. Cloudflare Access 验签（各类绕过）==');
  const access = require(ROOT + '/src/access.js');
  const TEAM = 'demo.cloudflareaccess.com';
  const AUD = 'a'.repeat(64);
  const cfg = access.accessConfig({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD });

  ok(!!cfg && cfg.issuer === 'https://' + TEAM, 'ACCESS_TEAM_DOMAIN + ACCESS_AUD 同时配置才启用');
  ok(access.accessConfig({ ACCESS_TEAM_DOMAIN: TEAM }) === null, '只配 team 不启用（缺一即禁用）');
  ok(access.accessConfig({ ACCESS_AUD: AUD }) === null, '只配 aud 不启用');
  ok(access.accessConfig({ ACCESS_TEAM_DOMAIN: 'https://' + TEAM + '/', ACCESS_AUD: AUD }) !== null, '容错 https:// 前缀与末尾斜杠');
  ok(access.accessConfig({ ACCESS_TEAM_DOMAIN: 'evil/../x', ACCESS_AUD: AUD }) === null, '非法 team 主机名被拒（防 JWKS 请求被引走）');

  // 用真 RSA 密钥对自签，比 mock 更接近真实链路
  const kp = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
  const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
  pubJwk.kid = 'test-kid'; pubJwk.alg = 'RS256'; pubJwk.use = 'sig';
  access.__setJwksForTest([pubJwk]);

  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const nowS = Math.floor(Date.now() / 1000);
  const basePayload = () => ({
    iss: 'https://' + TEAM, aud: [AUD], exp: nowS + 300, iat: nowS - 5, nbf: nowS - 5,
    email: 'u@example.com', sub: 'user-1',
  });
  async function makeJwt(headerPatch, payloadPatch) {
    const h = Object.assign({ alg: 'RS256', kid: 'test-kid', typ: 'JWT' }, headerPatch || {});
    const p = Object.assign(basePayload(), payloadPatch || {});
    const data = Buffer.from(b64u(h) + '.' + b64u(p));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, data);
    return data.toString() + '.' + Buffer.from(sig).toString('base64url');
  }

  const good = await makeJwt();
  const vGood = await access.verifyJwt(good, cfg);
  ok(vGood.ok === true, '合法断言通过');
  ok(access.identityOf(vGood.payload) === 'u@example.com', '能取到 email 作为展示身份');

  ok((await access.verifyJwt(await makeJwt({ alg: 'none' }), cfg)).ok === false, '拒绝 alg=none');
  ok((await access.verifyJwt(await makeJwt({ alg: 'HS256' }), cfg)).ok === false, '拒绝 alg=HS256（公钥当 HMAC 密钥的绕过）');
  ok((await access.verifyJwt(await makeJwt({ alg: 'RS256', kid: 'nope' }), cfg)).ok === false, '拒绝未知 kid');
  ok((await access.verifyJwt(await makeJwt({}, { aud: ['b'.repeat(64)] }), cfg)).ok === false, '拒绝 aud 不匹配（别的应用的合法 JWT）');
  ok((await access.verifyJwt(await makeJwt({}, { iss: 'https://other.cloudflareaccess.com' }), cfg)).ok === false, '拒绝跨团队 iss');
  ok((await access.verifyJwt(await makeJwt({}, { exp: nowS - 120 }), cfg)).ok === false, '拒绝已过期断言');
  ok((await access.verifyJwt(await makeJwt({}, { nbf: nowS + 300 }), cfg)).ok === false, '拒绝尚未生效断言');
  ok((await access.verifyJwt(await makeJwt({}, { aud: AUD }), cfg)).ok === true, 'aud 为字符串时同样接受');
  ok((await access.verifyJwt('a.b', cfg)).ok === false, '拒绝结构非法');
  ok((await access.verifyJwt('', cfg)).ok === false, '拒绝空断言');

  // 签名篡改：改载荷但保留旧签名
  const parts = good.split('.');
  const tampered = parts[0] + '.' + Buffer.from(JSON.stringify(Object.assign(basePayload(), { aud: ['b'.repeat(64)] }))).toString('base64url') + '.' + parts[2];
  ok((await access.verifyJwt(tampered, cfg)).ok === false, '拒绝载荷篡改（签名对不上）');

  // 用另一把私钥签（等同伪造者自己生成密钥对）
  const kp2 = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']);
  const data2 = Buffer.from(b64u({ alg: 'RS256', kid: 'test-kid', typ: 'JWT' }) + '.' + b64u(basePayload()));
  const sig2 = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp2.privateKey, data2);
  ok((await access.verifyJwt(data2.toString() + '.' + Buffer.from(sig2).toString('base64url'), cfg)).ok === false,
    '拒绝他人自签 JWT（无 CF 私钥无法伪造）');

  console.log('\n========== 冒烟结果: ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
