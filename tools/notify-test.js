'use strict';
/* 提醒功能验证：本地 mock 服务接收三通道请求，校验 payload；再验证提醒规则与去重
 * 用法: node tools/notify-test.js
 */
const http = require('http');
const notifier = require('../server/notifier');
const reminder = require('../server/reminder');

const received = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    received.push({ url: req.url, method: req.method, ctype: req.headers['content-type'], body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url.includes('wxpusher')) res.end(JSON.stringify({ code: 1000, msg: '成功', success: true }));
    else if (req.url.includes('.send')) res.end(JSON.stringify({ code: 0, message: '', data: {} }));
    else if (req.url.includes('/push')) res.end(JSON.stringify({ code: 200, message: 'success' }));
    else res.end('{}');
  });
});

let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? '  ✅ ' : '  ❌ ') + name + (cond ? '' : '  → ' + extra));
  if (!cond) failures++;
}

async function main() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  process.env.NOTIFY_WXPUSHER_URL = base + '/wxpusher/message';
  process.env.NOTIFY_SCT_URL = base + '/sct';
  process.env.NOTIFY_BARK_URL = base + '/bark';

  const cfg = reminder.normalizeConfig({
    enabled: true,
    channels: {
      wxpusher: { enabled: true, appToken: 'AT_test', uids: 'UID_a, UID_b', topicIds: '', summaryPrefix: '管卡提醒' },
      serverchan: { enabled: true, sendkey: 'SCT_test' },
      bark: { enabled: true, deviceKey: 'bkkey', server: 'https://api.day.app', level: 'timeSensitive', group: '管卡' },
    },
  });

  console.log('=== 1. 三通道发送 ===');
  const res = await notifier.notifyAll(cfg, '年费提醒：测试卡 还有 7 天', '- 银行：测试银行\n- 年费：¥3600');
  check('三个通道均返回结果', res.length === 3, JSON.stringify(res));
  check('三通道全部成功', res.every((r) => r.ok), JSON.stringify(res.filter((r) => !r.ok)));
  check('mock 收到 3 个请求', received.length === 3, '实际 ' + received.length);

  const wx = received.find((r) => r.url.includes('wxpusher'));
  const sct = received.find((r) => r.url.includes('.send'));
  const bk = received.find((r) => r.url.includes('/push'));
  if (wx) {
    const p = JSON.parse(wx.body);
    check('wxpusher: appToken 正确', p.appToken === 'AT_test', p.appToken);
    check('wxpusher: uids 解析为数组且去空格', JSON.stringify(p.uids) === '["UID_a","UID_b"]', JSON.stringify(p.uids));
    check('wxpusher: summary 含前缀与标题', p.summary === '管卡提醒｜年费提醒：测试卡 还有 7 天', p.summary);
    check('wxpusher: contentType=3(markdown)', p.contentType === 3, String(p.contentType));
    check('wxpusher: content 含正文', p.content.includes('测试银行'));
  } else check('wxpusher 请求到达', false);
  if (sct) {
    check('Server酱: URL 含 SendKey', sct.url === '/sct/SCT_test.send', sct.url);
    check('Server酱: form 编码', String(sct.ctype).includes('x-www-form-urlencoded'), String(sct.ctype));
    check('Server酱: 含 title/desp', sct.body.includes('title=') && sct.body.includes('desp='), sct.body.slice(0, 120));
  } else check('Server酱请求到达', false);
  if (bk) {
    const p = JSON.parse(bk.body);
    check('Bark: device_key 正确', p.device_key === 'bkkey', p.device_key);
    check('Bark: title 正确', p.title.includes('年费提醒'), p.title);
    check('Bark: level/group 透传', p.level === 'timeSensitive' && p.group === '管卡', p.level + '/' + p.group);
  } else check('Bark 请求到达', false);

  console.log();
  console.log('=== 2. 单通道失败不影响其余通道 ===');
  const badCfg = reminder.normalizeConfig({
    channels: {
      wxpusher: { enabled: true, appToken: '', uids: 'UID_a' }, // 缺 token
      serverchan: { enabled: true, sendkey: 'SCT_test' },
    },
  });
  const r2 = await notifier.notifyAll(badCfg, 't', 'b');
  check('wxpusher 因缺 appToken 失败', r2.find((x) => x.channel === 'wxpusher').ok === false);
  check('serverchan 仍成功', r2.find((x) => x.channel === 'serverchan').ok === true);

  console.log();
  console.log('=== 3. 提醒规则 ===');
  const now = new Date(2026, 9, 12); // 2026-10-12
  const cards = [
    { id: 'c1', bank: '招商银行', name: '经典白金卡', alias: '大白', annualFee: 3600, feeDays: 5, nextFeeDate: '2027-03-15', waiver: { needsPayment: true, kind: '消费刷免', progress: 3000, target: 100000, remaining: 97000 }, repaymentDay: 15, billingDay: 5, creditLimit: 80000, monthlySpendTarget: 10000, monthSpend: 5000 },
    { id: 'c2', bank: '农业银行', name: '悦卡', alias: '', annualFee: 160, feeDays: 60, nextFeeDate: '2026-12-11', waiver: { needsPayment: true, kind: '刚性' }, repaymentDay: 1, billingDay: 10, creditLimit: 10000, monthlySpendTarget: 0, monthSpend: 0 },
    { id: 'c3', bank: '交通银行', name: '标准白金卡', alias: '', annualFee: 1000, feeDays: 0, nextFeeDate: '2026-10-12', waiver: { needsPayment: false, kind: '免年费' }, repaymentDay: 20, billingDay: 1, creditLimit: 50000, monthlySpendTarget: 0, monthSpend: 0 },
  ];
  const items = reminder.collectReminders(cards, cfg, now);
  const feeItem = items.find((i) => i.type === 'fee');
  check('年费提醒：命中最近阈值（5天→7档）', !!feeItem && feeItem.key.endsWith(':7'), JSON.stringify(items.map((i) => i.key)));
  check('年费提醒：60 天的卡不提醒（阈值最大 30）', !items.some((i) => i.type === 'fee' && i.key.includes(':c2')), '');
  check('年费提醒：已免年费的卡不提醒', !items.some((i) => i.type === 'fee' && i.key.includes(':c3')), '');
  const repay = items.find((i) => i.type === 'repay');
  check('还款提醒：15 日（距今 3 天）命中', !!repay && repay.key.includes(':c1'), JSON.stringify(items.map((i) => i.type + i.key)));
  check('还款提醒：1 日已过、20 日未到都不提醒', items.filter((i) => i.type === 'repay').length === 1, '');
  check('月任务：月中不提醒', !items.some((i) => i.type === 'task'), '');

  const endMonth = new Date(2026, 9, 29); // 剩 2 天
  const items2 = reminder.collectReminders(cards, cfg, endMonth);
  const task = items2.find((i) => i.type === 'task');
  check('月任务：月末未达标提醒', !!task && task.title.includes('还差 ¥5,000'), task ? task.title : '无');

  console.log();
  console.log('=== 4. 去重与推送记录 ===');
  const cfg2 = reminder.normalizeConfig({ enabled: true, channels: { bark: { enabled: true, deviceKey: 'bkkey', server: base + '/bark' } } });
  const out1 = await reminder.runChecks(cards, cfg2, notifier, now);
  check('首次检查推送了提醒', out1.sent > 0, JSON.stringify(out1));
  check('sentLog 已记录', Object.keys(cfg2.sentLog).length === out1.sent, JSON.stringify(cfg2.sentLog));
  const out2 = await reminder.runChecks(cards, cfg2, notifier, now);
  check('重复检查不再推送（去重生效）', out2.sent === 0, JSON.stringify(out2));
  check('历史记录保留', cfg2.history.length >= out1.sent, String(cfg2.history.length));

  console.log();
  console.log('=== 5. 无启用通道时的行为 ===');
  const cfg3 = reminder.normalizeConfig({ enabled: true, channels: {} });
  const out3 = await reminder.runChecks(cards, cfg3, notifier, now);
  check('无通道时标记为失败而非崩溃', out3.results.every((r) => r.ok === false && /没有已启用/.test(r.error)), JSON.stringify(out3.results));

  server.close();
  console.log();
  console.log(failures === 0 ? '========== 提醒功能测试全部通过 ==========' : '========== 失败 ' + failures + ' 项 ==========');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('测试异常:', e); process.exit(1); });
