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
  // payment 由日期引擎计算（computeMyCard 输出）；mock 卡用 D.paymentInfo 现算，保证与真实链路一致
  const D = require('../server/dates');
  const mkCard = (base) => Object.assign({}, base, { payment: D.paymentInfo(base, now) });
  const cards = [
    // c1：账单日 5 → 本期账单 2026-10-05，固定 25 日还款（fixed > 账单日，同月），宽限 0 → 最后还款 10-25，距今 13 天
    mkCard({ id: 'c1', bank: '招商银行', name: '经典白金卡', alias: '大白', annualFee: 3600, feeDays: 5, nextFeeDate: '2027-03-15', billingDay: 5, repayMode: 'fixed', repayValue: 25, graceDays: 0, waiver: { needsPayment: true, kind: '消费刷免', progress: 3000, target: 100000, remaining: 97000 }, repaymentDay: 25, creditLimit: 80000, monthlySpendTarget: 10000, monthSpend: 5000 }),
    // c2：账单日 10 → 本期 2026-09-10，固定 1 日 ≤ 账单日 → 次月 11-01，宽限 3 → 最后 11-04，距今 23 天
    mkCard({ id: 'c2', bank: '农业银行', name: '悦卡', alias: '', annualFee: 160, feeDays: 60, nextFeeDate: '2026-12-11', billingDay: 10, repayMode: 'fixed', repayValue: 1, graceDays: 3, waiver: { needsPayment: true, kind: '刚性' }, repaymentDay: 1, creditLimit: 10000, monthlySpendTarget: 0, monthSpend: 0 }),
    // c3：免年费卡，账单日 1 → 本期 2026-10-01，固定 20 日 → 10-20，距今 8 天（不进 3 天窗口）
    mkCard({ id: 'c3', bank: '交通银行', name: '标准白金卡', alias: '', annualFee: 1000, feeDays: 0, nextFeeDate: '2026-10-12', billingDay: 1, repayMode: 'fixed', repayValue: 20, graceDays: 0, waiver: { needsPayment: false, kind: '免年费' }, repaymentDay: 20, creditLimit: 50000, monthlySpendTarget: 0, monthSpend: 0 }),
  ];
  const items = reminder.collectReminders(cards, cfg, now);
  const feeItem = items.find((i) => i.type === 'fee');
  check('年费提醒：命中最近阈值（5天→7档）', !!feeItem && feeItem.key.endsWith(':7'), JSON.stringify(items.map((i) => i.key)));
  check('年费提醒：60 天的卡不提醒（阈值最大 30）', !items.some((i) => i.type === 'fee' && i.key.includes(':c2')), '');
  check('年费提醒：已免年费的卡不提醒', !items.some((i) => i.type === 'fee' && i.key.includes(':c3')), '');
  const repay = items.find((i) => i.type === 'repay');
  check('还款提醒：无卡进入 3 天窗口（13/23/8 天均 > 3）', !repay, JSON.stringify(items.map((i) => i.type + ':' + i.key)));
  check('还款提醒：payDaysLeft 均 >= 0（主表还款日永远指向未来）', cards.every((m) => m.payment.payDaysLeft >= 0), JSON.stringify(cards.map((m) => m.payment.payDaysLeft)));
  check('月任务：月中不提醒', !items.some((i) => i.type === 'task'), '');

  // 宽限期参与选期：c1 加宽限 3 天、模拟 10-28（到期 10-25 已过、宽限内）→ 仍算本期，剩 0 天命中提醒
  const inGrace = D.paymentInfo(Object.assign({}, cards[0], { graceDays: 3 }), new Date(2026, 9, 28));
  const graceCard = Object.assign({}, cards[0], { payment: inGrace });
  const graceItems = reminder.collectReminders([graceCard], cfg, new Date(2026, 9, 28));
  const graceRepay = graceItems.find((i) => i.type === 'repay');
  check('宽限期内剩余 0 天 → 还款提醒命中（旧逻辑按 15 日会漏）', !!graceRepay && graceRepay.title.includes('今日还款'), graceRepay ? graceRepay.title : '无');
  check('宽限期提醒 body 含最后还款日与宽限标注', !!graceRepay && graceRepay.body.includes('最后还款日') && graceRepay.body.includes('宽限期内'), graceRepay ? graceRepay.body : '无');
  // afterBill 模式：账单 10-05 + 20 天 → 10-25，与 fixed 25 日结果一致（旧逻辑 repaymentDay 填错就全错）
  const afterBill = D.paymentInfo({ billingDay: 5, repayMode: 'afterBill', repayValue: 20, graceDays: 0 }, now);
  check('afterBill 模式 payDaysLeft 与 fixed 等价场景一致', afterBill.payDaysLeft === cards[0].payment.payDaysLeft, String(afterBill.payDaysLeft));

  const endMonth = new Date(2026, 9, 29); // 剩 2 天
  const items2 = reminder.collectReminders(cards, cfg, endMonth);
  const task = items2.find((i) => i.type === 'task');
  check('月任务：月末未达标提醒', !!task && task.title.includes('还差 ¥5,000'), task ? task.title : '无');

  console.log();
  console.log('=== 4. 账单提醒与逾期 ===');
  const bills = [
    { myCardId: 'c1', month: '2026-09', amount: 3200, dueDate: '2026-10-20', paid: '未还' },
    { myCardId: 'c2', month: '2026-08', amount: 800, dueDate: '2026-10-01', paid: '未还' },
    { myCardId: 'c3', month: '2026-09', amount: 500, dueDate: '2026-10-30', paid: '已还' },
  ];
  const billItems = reminder.collectReminders(cards, cfg, now, bills);
  check('到期前账单提醒（10-20 距今 8 天 > 3 不提醒）', !billItems.some((i) => i.type === 'bill' && i.key.includes('2026-09') && i.key.endsWith('due')), JSON.stringify(billItems.map((i) => i.key)));
  check('逾期账单提醒（10-01 已过 11 天）', billItems.some((i) => i.type === 'bill' && i.key.includes('2026-08:overdue')), JSON.stringify(billItems.map((i) => i.key)));
  check('已还账单不提醒', !billItems.some((i) => i.key.includes(':c3:')), JSON.stringify(billItems.map((i) => i.key)));

  console.log();
  console.log('=== 5. 不限次权益补录 ===');
  // 通过 routes 的内部函数验证：total=-1 时 count 接口不做上限拦截
  const routes = require('../server/routes');
  const { Store } = require('../server/db');
  const fs = require('fs');
  const tmpDir = '.notify-test-data';
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const store = new Store(tmpDir);
  routes.init(store);
  const seedCards = store.read('cards', []);
  const anyCard = seedCards[0];
  const myCards = store.read('mycards', []);
  const newMc = {
    id: 'mc_unlimited', cardId: anyCard.id, bank: anyCard.bank, name: anyCard.name, org: anyCard.org, level: anyCard.level,
    annualFee: 0, waiverType: '免年费', waiverCondition: '0', waiverPolicy: '',
    alias: '不限次测试', creditLimit: 10000, billingDay: 1, repaymentDay: 20, repayMode: 'fixed', repayValue: 20,
    graceDays: 0, waivedYear: 0, countPeriodYear: 0, maxInterestDays: 0,
    feeMonth: 1, feeDay: 1, last4: '', monthlySpendTarget: 0,
    benefits: [{ name: '无限贵宾厅', type: '其他', total: -1, resetCycle: '自然年', validUntil: '' }],
    pointsDeducted: false, pointsDeductDate: null, assetWaived: false, assetWaivedDate: null, createdAt: new Date().toISOString(),
  };
  myCards.push(newMc);
  store.write('mycards', myCards);
  // 直接调用内部 handle 模拟 POST count（routes.init 已注入 store，handle 可独立调用）
  const countRes = await routes.handle('POST', '/api/mycards/mc_unlimited/benefits/0/count', new URL('http://x/p'), { count: 3 });
  check('不限次权益补录 3 次成功（旧逻辑误拦）', countRes && countRes.status === 201, JSON.stringify(countRes));
  const st2 = routes._internals.benefitUsed(newMc, 0, new Date());
  check('不限次权益 used 累计为 3', st2.used === 3 && st2.unlimited === true, JSON.stringify(st2));
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log();
  console.log('=== 5.5 年费达标判定（feeStatusOf 回归）===');
  // computeMyCard 全链路：免年费卡此前误报「未达标」、feeAlert 恒「正常」
  const store2 = new Store('.notify-test-data2');
  routes.init(store2);
  const seedCards2 = store2.read('cards', []);
  const feeCardSeed = seedCards2.find((c) => c.annualFee > 0) || seedCards2[0];
  const myCards2 = store2.read('mycards', []);
  const feeMc = {
    id: 'mc_feestatus', cardId: feeCardSeed.id, bank: feeCardSeed.bank, name: feeCardSeed.name, org: feeCardSeed.org, level: feeCardSeed.level,
    annualFee: 3600, waiverType: '免年费', waiverCondition: '0', waiverPolicy: '',
    alias: '达标测试', creditLimit: 10000, billingDay: 1, repaymentDay: 20, repayMode: 'fixed', repayValue: 20,
    graceDays: 0, waivedYear: 0, countPeriodYear: 0, maxInterestDays: 0,
    feeMonth: 3, feeDay: 15, last4: '', monthlySpendTarget: 0,
    benefits: [], pointsDeducted: false, pointsDeductDate: null, assetWaived: false, assetWaivedDate: null, createdAt: new Date().toISOString(),
  };
  myCards2.push(feeMc);
  store2.write('mycards', myCards2);
  const computed = routes._internals.computeMyCard(feeMc, new Date());
  check('免年费卡 feeStatus = 已达标(自动)（旧逻辑恒「未达标」）', computed.feeStatus === '已达标(自动)', computed.feeStatus);
  check('达标卡 feeAlert = 本年豁免（旧逻辑恒「正常」）', computed.feeAlert === '本年豁免', String(computed.feeAlert));
  check('payment 含 payDaysLeft/dueDate（提醒引擎依赖）', Number.isFinite(computed.payment.payDaysLeft) && /^\d{4}-\d{2}-\d{2}$/.test(computed.payment.dueDate), JSON.stringify(computed.payment));
  // 刚性年费未达标卡（永不豁免）：预警应随倒计时分级 —— 年费日定在 5 天后 → 「7天内」
  const soonMc = Object.assign({}, feeMc, { id: 'mc_soon', waiverType: '刚性', feeMonth: 10, feeDay: new Date().getDate() + 5 });
  const soon = routes._internals.computeMyCard(soonMc, new Date());
  check('未达标卡 feeAlert 随倒计时分级（5 天 → 7天内）', soon.feeAlert === '7天内', String(soon.feeAlert) + ' feeDays=' + soon.feeDays);
  // 免年费卡无论倒计时多少都显示「本年豁免」（上一条已验证）；这里补验达标(手工)路径
  const manualMc = Object.assign({}, feeMc, { id: 'mc_manual', waiverType: '刚性', waivedYear: new Date().getFullYear() });
  const manual = routes._internals.computeMyCard(manualMc, new Date());
  check('手工声明当年豁免 → 已达标(手工) + 本年豁免', manual.feeStatus === '已达标(手工)' && manual.feeAlert === '本年豁免', manual.feeStatus + '/' + manual.feeAlert);
  store2.write('mycards', []); // 清理，避免污染
  fs.rmSync('.notify-test-data2', { recursive: true, force: true });

  console.log();
  console.log('=== 6. 去重与推送记录 ===');
  const cfg2 = reminder.normalizeConfig({ enabled: true, channels: { bark: { enabled: true, deviceKey: 'bkkey', server: base + '/bark' } } });
  const out1 = await reminder.runChecks(cards, cfg2, notifier, now);
  check('首次检查推送了提醒', out1.sent > 0, JSON.stringify(out1));
  check('sentLog 已记录', Object.keys(cfg2.sentLog).length === out1.sent, JSON.stringify(cfg2.sentLog));
  const out2 = await reminder.runChecks(cards, cfg2, notifier, now);
  check('重复检查不再推送（去重生效）', out2.sent === 0, JSON.stringify(out2));
  check('历史记录保留', cfg2.history.length >= out1.sent, String(cfg2.history.length));

  console.log();
  console.log('=== 7. 无启用通道时的行为 ===');
  const cfg3 = reminder.normalizeConfig({ enabled: true, channels: {} });
  const out3 = await reminder.runChecks(cards, cfg3, notifier, now);
  check('无通道时标记为失败而非崩溃', out3.results.every((r) => r.ok === false && /没有已启用/.test(r.error)), JSON.stringify(out3.results));

  server.close();
  console.log();
  console.log(failures === 0 ? '========== 提醒功能测试全部通过 ==========' : '========== 失败 ' + failures + ' 项 ==========');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('测试异常:', e); process.exit(1); });
