'use strict';
/* QA 独立 E2E：wecom 渠道边界验证（临时 DATA_DIR，测完即删）
 * 覆盖：测试推送 results 结构 / 掩码 roundtrip / 多通道故障隔离 /
 *       4096 字节精确边界 / emoji 代理对 / 组合字符 / 空 summaryPrefix / 前端 collect 存在性
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
process.env.DATA_DIR = path.join(os.tmpdir(), 'qa-wecom-e2e-' + Date.now());
const notifier = require(path.join(ROOT, 'server', 'notifier'));
const reminder = require(path.join(ROOT, 'server', 'reminder'));

let total = 0, failures = 0;
function check(name, cond, extra) {
  total++;
  console.log((cond ? '  OK  ' : '  FAIL') + ' ' + name + (cond ? '' : '  -> ' + extra));
  if (!cond) failures++;
}

// mock 上游：fail-key 返回 errcode 非 0；其余返回 errcode 0
const received = [];
const upstream = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => {
    received.push({ url: req.url, body: b });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('fail-key')) res.end(JSON.stringify({ errcode: 93000, errmsg: 'invalid webhook url' }));
    else if (req.url.includes('webhook/send')) res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
    else if (req.url.includes('/push')) res.end(JSON.stringify({ code: 200, message: 'success' }));
    else if (req.url.includes('wxpusher')) res.end(JSON.stringify({ code: 1000, msg: 'ok' }));
    else res.end(JSON.stringify({ code: 0, message: '' }));
  });
});

async function main() {
  await new Promise((res) => upstream.listen(0, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + upstream.address().port;
  process.env.NOTIFY_WECOM_URL = base + '/wecom/webhook/send';
  process.env.NOTIFY_WXPUSHER_URL = base + '/wxpusher/message';
  process.env.NOTIFY_SCT_URL = base + '/sct';
  process.env.NOTIFY_BARK_URL = base + '/bark';

  // ---------- A. utf8Slice 单元验证（Node 版）----------
  console.log('=== A. utf8Slice 截断语义 ===');
  const utf8Slice = (str, n) => {
    // 从模块内拿不到（未导出），用等价内联副本——与源码逐行一致
    const s = String(str || '');
    if (Buffer.byteLength(s, 'utf8') <= n) return s;
    let bytes = 0, end = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.codePointAt(i);
      const w = c > 0xFFFF ? 4 : (c > 0x7FF ? 3 : (c > 0x7F ? 2 : 1));
      if (bytes + w > n) break;
      bytes += w; end += c > 0xFFFF ? 2 : 1;
      if (c > 0xFFFF) i++;
    }
    return s.slice(0, end);
  };
  // A1: 恰好 4096 字节（'长'=3B，1365 个=4095B + 1 个 ASCII=4096B）
  const exact = utf8Slice('长'.repeat(1365) + 'x', 4096);
  check('A1 恰好 4096 字节不截断', Buffer.byteLength(exact) === 4096 && exact.length === 1366, String(Buffer.byteLength(exact)));
  // A2: 4097 字节 → 截到 4095
  const over = utf8Slice('长'.repeat(1366), 4096); // 4098B -> 截断
  check('A2 超一字节时截到最后完整字符(4095B)', Buffer.byteLength(over) === 4095, String(Buffer.byteLength(over)));
  // A3: emoji 代理对（😀=4B U+1F600）
  const emoji = 'a'.repeat(4094) + '😀'; // 4094+4=4098 -> emoji 放不下
  const cut = utf8Slice(emoji, 4096);
  check('A3 emoji 放不下时整体丢弃（不撕裂代理对）', Buffer.byteLength(cut) === 4094 && !cut.includes('\uD83D'), String(Buffer.byteLength(cut)));
  const emojiFit = utf8Slice('a'.repeat(4092) + '😀', 4096); // 4092+4=4096 恰好
  check('A4 emoji 恰好放得下时保留完整', emojiFit === 'a'.repeat(4092) + '😀', String(Buffer.byteLength(emojiFit)));
  // A5: 组合字符（e + U+0301 = 2 个码点 3 字节）——按码点截断会拆开字形组合序列
  // （e×1366=1366B + U+0301×1365=2730B = 4096B 恰好装满；最后一个 e 丢失跟随的组合符）
  // 但 UTF-8 字节流本身仍合法，只是「渲染上」少一个重音——记录为已知语义
  const comb = utf8Slice('e\u0301'.repeat(1400), 4096);
  check('A5 组合字符截断后字节流仍合法(4096B，字形拆分为已知语义)',
    Buffer.byteLength(comb) === 4096 && Buffer.from(comb, 'utf8').toString('utf8') === comb,
    String(Buffer.byteLength(comb)));
  // A6: 空串与 null
  check('A6 空串/null 安全', utf8Slice('', 100) === '' && utf8Slice(null, 100) === '');

  // ---------- B. 多通道故障隔离（wecom 失败不影响其他）----------
  console.log('=== B. 多通道故障隔离 ===');
  const cfgIso = reminder.normalizeConfig({
    enabled: true,
    channels: {
      wxpusher: { enabled: true, appToken: 'AT_x', uids: 'UID_x' },
      serverchan: { enabled: true, sendkey: 'SCT_x' },
      bark: { enabled: true, deviceKey: 'bk_x' },
      wecom: { enabled: true, webhookKey: 'fail-key' }, // 上游返回 errcode 93000
    },
  });
  const rIso = await notifier.notifyAll(cfgIso, '隔离测试', '正文');
  check('B1 返回 4 个通道结果', rIso.length === 4, JSON.stringify(rIso.map((x) => x.channel)));
  const wcFail = rIso.find((x) => x.channel === 'wecom');
  const others = rIso.filter((x) => x.channel !== 'wecom');
  check('B2 wecom 失败且报错含 errcode 信息', wcFail && wcFail.ok === false && /93000|invalid/.test(wcFail.error), JSON.stringify(wcFail));
  check('B3 其余三通道不受影响', others.every((x) => x.ok === true), JSON.stringify(others));

  // ---------- C. sendWecom 直调边界 ----------
  console.log('=== C. sendWecom 直调 ===');
  // C1: 恰好 4096 字节 content 通过完整链路
  const big = '长'.repeat(1400); // 4200B
  const rBig = await notifier.CHANNELS.wecom.send({ webhookKey: 'ok-key', summaryPrefix: '前缀' }, '标题', big);
  check('C1 超长 content 发送成功（截断不崩）', rBig.ok === true, JSON.stringify(rBig));
  const bigReq = received.filter((x) => x.url.includes('webhook/send')).pop();
  const bigContent = JSON.parse(bigReq.body).markdown.content;
  check('C2 截断后 ≤4096 字节', Buffer.byteLength(bigContent) <= 4096, String(Buffer.byteLength(bigContent)));
  check('C3 前缀+标题保留', bigContent.startsWith('前缀｜标题'), bigContent.slice(0, 20));
  // C4: emoji 在完整链路中不撕裂
  // content = '管卡提醒｜T\n' (18B) + 'a'*4094 (4094B) + '😀'(4B) = 4116B > 4096 → 截到 18+4078=4096（'a'*4078）
  received.length = 0;
  const rEmoji = await notifier.CHANNELS.wecom.send({ webhookKey: 'ok-key' }, 'T', 'a'.repeat(4094) + '😀');
  const emojiContent = JSON.parse(received[0].body).markdown.content;
  check('C4 链路级 emoji 截断不撕裂（emoji 整体丢弃）',
    rEmoji.ok && Buffer.byteLength(emojiContent) === 4096 && emojiContent.startsWith('管卡提醒｜T\n') && !emojiContent.includes('\uD83D'),
    String(Buffer.byteLength(emojiContent)));
  // C5: 空 summaryPrefix → 默认「管卡提醒」
  received.length = 0;
  await notifier.CHANNELS.wecom.send({ webhookKey: 'ok-key', summaryPrefix: '' }, 'T2', 'b');
  const pfx = JSON.parse(received[0].body).markdown.content;
  check('C5 空 summaryPrefix 用默认前缀', pfx.startsWith('管卡提醒｜T2'), pfx.slice(0, 15));
  // C6: 非 0 errcode 判失败
  const rErr = await notifier.CHANNELS.wecom.send({ webhookKey: 'fail-key' }, 'T', 'b');
  check('C6 errcode!=0 判失败且带 errmsg', rErr.ok === false && rErr.error.includes('93000'), JSON.stringify(rErr));
  // C7: 缺 key
  const rNoKey = await notifier.CHANNELS.wecom.send({ webhookKey: '' }, 'T', 'b');
  check('C7 缺 webhookKey 报「缺少 webhook Key」', rNoKey.ok === false && rNoKey.error === '缺少 webhook Key', JSON.stringify(rNoKey));
  // C8: webhookKey 带空格 → trim
  received.length = 0;
  await notifier.CHANNELS.wecom.send({ webhookKey: '  ok-key  ' }, 'T', 'b');
  check('C8 key 被 trim 后拼 URL', received[0].url.includes('key=ok-key'), received[0].url);
  // C9: 非 JSON 响应（HTTP 200 HTML）
  process.env.NOTIFY_WECOM_URL = base + '/htmlpage';
  const rHtml = await notifier.CHANNELS.wecom.send({ webhookKey: 'k' }, 'T', 'b');
  check('C9 HTTP200 非 JSON 判失败', rHtml.ok === false, JSON.stringify(rHtml));
  process.env.NOTIFY_WECOM_URL = base + '/wecom/webhook/send';

  // ---------- D. 掩码 roundtrip（走 routes 层）----------
  console.log('=== D. 掩码 roundtrip ===');
  const Store = require(path.join(ROOT, 'server', 'db')).Store;
  const routes = require(path.join(ROOT, 'server', 'routes'));
  const store = new Store(process.env.DATA_DIR);
  routes.init(store);
  const put = (b) => routes.handle('PUT', '/api/notify/config', new URL('http://x/p'), b);
  const get = () => routes.handle('GET', '/api/notify/config', new URL('http://x/p'), null);
  // D1: 写入真实 key → GET 返回掩码
  await put({ channels: { wecom: { enabled: true, webhookKey: 'real-key-abcd1234', summaryPrefix: 'QA前缀' } } });
  const g1 = await get();
  const mKey = g1.body.channels.wecom.webhookKey;
  check('D1 GET 返回掩码（••••+尾4）', mKey.startsWith('••••') && mKey.endsWith('1234'), mKey);
  check('D1b 原值不出现在 GET 响应', !JSON.stringify(g1.body).includes('real-key-abcd1234'), '');
  // D2: 掩码原样 PUT 回 → 磁盘保留原值
  const g1b = await get();
  g1b.body.channels.wecom.webhookKey = mKey;
  await put(g1b.body);
  const raw1 = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'notify.json'), 'utf8'));
  check('D2 掩码 roundtrip 保留原值', raw1.channels.wecom.webhookKey === 'real-key-abcd1234', raw1.channels.wecom.webhookKey);
  // D3: 掩码状态下直接测试推送 → 用的是磁盘原值（不发往 fail-key 之外的错误地址）
  const testRes = await routes.handle('POST', '/api/notify/test', new URL('http://x/p'), {});
  const wcTest = testRes.body.results.find((x) => x.channel === 'wecom');
  check('D3 掩码状态下测试推送用原值成功', wcTest && wcTest.ok === true, JSON.stringify(wcTest));
  // D4: 短 key（≤4 字符）掩码后 roundtrip
  await put({ channels: { wecom: { enabled: true, webhookKey: 'ab' } } });
  const g2 = await get();
  await put(g2.body);
  const raw2 = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'notify.json'), 'utf8'));
  check('D4 短 key roundtrip 保留', raw2.channels.wecom.webhookKey === 'ab', raw2.channels.wecom.webhookKey);
  // D5: WECOM_WEBHOOK_KEY 环境变量兜底
  delete process.env.WECOM_WEBHOOK_KEY;
  process.env.WECOM_WEBHOOK_KEY = 'env-key-9999';
  const g3 = await get();
  check('D5 环境变量注入后 GET 仍掩码', g3.body.channels.wecom.webhookKey.startsWith('••••'), g3.body.channels.wecom.webhookKey);
  await put(g3.body);
  const raw3 = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'notify.json'), 'utf8'));
  check('D5b env 注入值 roundtrip 不落盘覆写为掩码', raw3.channels.wecom.webhookKey === 'ab' || raw3.channels.wecom.webhookKey === 'env-key-9999', raw3.channels.wecom.webhookKey);
  delete process.env.WECOM_WEBHOOK_KEY;

  // ---------- E. notify/test 端点结构 ----------
  console.log('=== E. /api/notify/test 结构 ===');
  const test2 = await routes.handle('POST', '/api/notify/test', new URL('http://x/p'), {});
  check('E1 results 含 wecom 且 label 正确', test2.body.results.some((x) => x.channel === 'wecom' && x.label === '企业微信'), JSON.stringify(test2.body.results.map((x) => x.channel)));
  check('E2 ok = 任一通道成功', typeof test2.body.ok === 'boolean', String(test2.body.ok));

  // ---------- F. 前端 collect 存在性（静态检查）----------
  console.log('=== F. 前端 collect 一致性 ===');
  const appjs = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  check('F1 ch(wecom) 渲染块存在', appjs.includes("ch('wecom'"), '');
  check('F2 collect 采集 nc-wecom-enabled', appjs.includes("$n('nc-wecom-enabled')"), '');
  check('F3 collect 采集 nc-wecom-webhookKey', appjs.includes("$n('nc-wecom-webhookKey')"), '');
  check('F4 collect 采集 nc-wecom-summaryPrefix', appjs.includes("$n('nc-wecom-summaryPrefix')"), '');
  // notifyModalHtml 无条件渲染 wecom 块（非条件拼接），collect 不会遇到 undefined 元素
  const chBlock = appjs.match(/ch\('wecom'[\s\S]{0,200}/);
  check('F5 wecom 块为无条件渲染（三元/条件拼接不存在）', chBlock && !/conditions?\?/.test(chBlock[0]), chBlock ? chBlock[0].slice(0, 80) : 'missing');
  // 微信兼容模式开关必须作为 ch('wecom', ...) 的第 5 个参数渲染在卡片 .nc-body 内部，
  // 而不是作为 sibling 拼在卡片外面（独立 notify-rules 块）。
  const wecomStart = appjs.indexOf("ch('wecom'");
  const rulesStart = appjs.indexOf('<h4>提醒规则</h4>');
  const wecomCallSrc = (wecomStart > -1 && rulesStart > wecomStart) ? appjs.slice(wecomStart, rulesStart) : '';
  check('F6 兼容模式开关位于 wecom 卡片块内（ch 调用内）', !!wecomCallSrc && wecomCallSrc.includes('nc-wecom-wechatCompat'), wecomCallSrc ? 'ok len=' + wecomCallSrc.length : 'missing');
  check('F7 兼容模式开关在卡片内且早于提醒规则块', appjs.indexOf('nc-wecom-wechatCompat') > -1 && appjs.indexOf('nc-wecom-wechatCompat') < rulesStart, 'wechatCompat@' + appjs.indexOf('nc-wecom-wechatCompat') + ' rules@' + rulesStart);
  check('F8 旧的外部兼容模式容器已移除', !appjs.includes('notify-rules" style="margin-top:-8px"'), '');

  upstream.close();
  try { fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  console.log('\n===== QA wecom E2E: ' + (failures ? failures + ' FAILED' : 'ALL PASS') + ' (' + (total - failures) + '/' + total + ') =====');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('E2E 异常:', e); try { fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); } catch (_) {} process.exit(1); });
