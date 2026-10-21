'use strict';
/* 提醒功能验证：本地 mock 服务接收五通道请求，校验 payload；再验证提醒规则与去重
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
    else if (req.url.includes('webhook/send')) res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
    else if (req.url.includes('/gettoken')) res.end(JSON.stringify({ errcode: 0, errmsg: 'ok', access_token: 'MOCK_TOKEN_1', expires_in: 7200 }));
    else if (req.url.includes('/message/send')) res.end(JSON.stringify({ errcode: 0, errmsg: 'ok', invaliduser: '' }));
    else if (req.url.includes('.send')) res.end(JSON.stringify({ code: 0, message: '', data: {} }));
    else if (req.url.includes('/push')) res.end(JSON.stringify({ code: 200, message: 'success' }));
    else res.end('{}');
  });
});

let failures = 0;
let total = 0;
function check(name, cond, extra) {
  total++;
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
  process.env.NOTIFY_WECOM_URL = base + '/wecom/webhook/send';
  process.env.NOTIFY_WECOM_APP_TOKEN_URL = base + '/wecomapp/gettoken';
  process.env.NOTIFY_WECOM_APP_SEND_URL = base + '/wecomapp/message/send';

  const cfg = reminder.normalizeConfig({
    enabled: true,
    channels: {
      wxpusher: { enabled: true, appToken: 'AT_test', uids: 'UID_a, UID_b', topicIds: '', summaryPrefix: '管卡提醒' },
      serverchan: { enabled: true, sendkey: 'SCT_test' },
      bark: { enabled: true, deviceKey: 'bkkey', server: 'https://api.day.app', level: 'timeSensitive', group: '管卡' },
      wecom: { enabled: true, webhookKey: 'WC_test', summaryPrefix: '管卡提醒' },
      wecomapp: { enabled: true, corpid: 'CORP_test', corpsecret: 'SEC_test', agentid: '1000002', touser: 'user_a|user_b', summaryPrefix: '管卡提醒' },
    },
  });

  console.log('=== 1. 五通道发送 ===');
  const res = await notifier.notifyAll(cfg, '年费提醒：测试卡 还有 7 天', '- 银行：测试银行\n- 年费：¥3600');
  check('五个通道均返回结果', res.length === 5, JSON.stringify(res));
  check('四通道全部成功', res.every((r) => r.ok), JSON.stringify(res.filter((r) => !r.ok)));
  // wecomapp 是两段式（gettoken + message/send）→ 5 通道共 6 个请求
  check('mock 收到 6 个请求', received.length === 6, '实际 ' + received.length);

  const wx = received.find((r) => r.url.includes('wxpusher'));
  const sct = received.find((r) => r.url.includes('.send'));
  const bk = received.find((r) => r.url.includes('/push'));
  const wc = received.find((r) => r.url.includes('webhook/send'));
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
  if (wc) {
    check('wecom: key 在 URL 上', wc.url.includes('key=WC_test'), wc.url);
    const p = JSON.parse(wc.body);
    check('wecom: msgtype=markdown', p.msgtype === 'markdown', p.msgtype);
    check('wecom: content 含前缀与标题', p.markdown.content.includes('管卡提醒｜年费提醒：测试卡 还有 7 天'), p.markdown && p.markdown.content);
    check('wecom: content 含正文', p.markdown.content.includes('测试银行'), p.markdown && p.markdown.content);
  } else check('wecom 请求到达', false);
  const wca = received.find((r) => r.url.includes('/message/send'));
  const wcaTok = received.find((r) => r.url.includes('/gettoken'));
  if (wca) {
    check('wecomapp: gettoken 先于 message/send', !!wcaTok && received.indexOf(wcaTok) < received.indexOf(wca), JSON.stringify(received.map((x) => x.url)));
    check('wecomapp: gettoken 携带 corpid/corpsecret', !!wcaTok && wcaTok.url.includes('corpid=CORP_test') && wcaTok.url.includes('corpsecret=SEC_test'), wcaTok && wcaTok.url);
    check('wecomapp: access_token 在 URL 上', wca.url.includes('access_token=MOCK_TOKEN_1'), wca.url);
    const p = JSON.parse(wca.body);
    check('wecomapp: touser 原样透传（| 分隔）', p.touser === 'user_a|user_b', p.touser);
    check('wecomapp: agentid 数字化', p.agentid === 1000002, String(p.agentid));
    check('wecomapp: msgtype=markdown', p.msgtype === 'markdown', p.msgtype);
    check('wecomapp: content 含前缀与标题', p.markdown.content.includes('管卡提醒｜年费提醒：测试卡 还有 7 天'), p.markdown && p.markdown.content);
    check('wecomapp: content 含正文', p.markdown.content.includes('测试银行'), p.markdown && p.markdown.content);
  } else check('wecomapp 请求到达', false);

  console.log();
  console.log('=== 1.5 wecom content 超长截断（4096 字节上限）===');
  {
    const long = '长'.repeat(5000); // 5000 个中文 = 15000 字节 > 4096
    const rTrunc = await notifier.CHANNELS.wecom.send({ webhookKey: 'WC_test', summaryPrefix: '管卡提醒' }, '标题', long);
    const wcReq = received.filter((x) => x.url.includes('webhook/send')).pop();
    const p = JSON.parse(wcReq.body).markdown.content;
    const buf = Buffer.from(p, 'utf8');
    check('截断后 content ≤ 4096 字节', buf.length <= 4096, String(buf.length));
    check('截断落在字符边界（无乱码字节）', buf.length % 3 === 0 && buf[buf.length - 1] === 0x9f || buf.length === 4096, String(buf.length));
    check('截断后仍保留前缀与标题', p.startsWith('管卡提醒｜标题'), p.slice(0, 20));
    check('成功判定不受截断影响', rTrunc.ok === true, JSON.stringify(rTrunc));
  }

  console.log();
  console.log('=== 1.6 wecomapp：2048 字节截断 + token 缓存 + 失效重取 ===');
  {
    // a) 2048 字节截断（自建应用上限比 webhook 的 4096 小一档）
    const long = '长'.repeat(3000); // 9000 字节 > 2048
    const rTr = await notifier.CHANNELS.wecomapp.send(
      { corpid: 'CORP_test', corpsecret: 'SEC_test', agentid: '1000002', touser: '@all', summaryPrefix: '管卡提醒' }, '标题', long);
    const sendReq = received.filter((x) => x.url.includes('/message/send')).pop();
    const trunc = JSON.parse(sendReq.body).markdown.content;
    const buf = Buffer.from(trunc, 'utf8');
    check('wecomapp: 截断后 content ≤ 2048 字节', buf.length <= 2048, String(buf.length));
    // 前缀+标题 22B + n×3B ≤ 2048 → n=675 → 2047B：最后一个中文字符装不下即整体丢弃，落在字符边界
    check('wecomapp: 截断落在字符边界（2047 = 22 + 675×3）', buf.length === 2047 && (buf.length - 22) % 3 === 0, String(buf.length));
    check('wecomapp: 截断后仍保留前缀与标题', trunc.startsWith('管卡提醒｜标题'), trunc.slice(0, 20));
    check('wecomapp: @all 透传', JSON.parse(sendReq.body).touser === '@all', sendReq.body.slice(0, 60));
    check('wecomapp: 截断不影响成功判定', rTr.ok === true, JSON.stringify(rTr));

    // b) token 缓存复用：上面第 1 节 + 截断共发了 2 次消息，gettoken 只应有 1 次
    const tokCount = received.filter((x) => x.url.includes('/gettoken')).length;
    check('wecomapp: token 缓存复用（2 次发送仅 1 次取凭证）', tokCount === 1, String(tokCount));

    // c) token 失效重取：mock 下一次 send 返回 42001，再之后恢复正常
    let badOnce = true;
    const saved = received.length;
    server.listeners('request'); // noop（保持引用语义清晰）
    const origEmit = server.emit.bind(server);
    server.emit = function (ev, req, res) {
      if (ev === 'request' && req.url.includes('/message/send') && badOnce) {
        badOnce = false;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ errcode: 42001, errmsg: 'access_token expired' }));
        return true;
      }
      return origEmit.apply(server, arguments);
    };
    const rRetry = await notifier.CHANNELS.wecomapp.send(
      { corpid: 'CORP_test', corpsecret: 'SEC_test', agentid: '1000002', touser: 'user_a' }, '重取', '正文');
    server.emit = origEmit;
    check('wecomapp: token 过期(42001)重取后发送成功', rRetry.ok === true, JSON.stringify(rRetry));
    const newTokReqs = received.slice(saved).filter((x) => x.url.includes('/gettoken'));
    check('wecomapp: 失效后重新 gettoken 恰好 1 次', newTokReqs.length === 1, String(newTokReqs.length));

    // d) 缺字段自检：四字段逐一缺失时错误文案正确且不发起任何请求
    const tokBeforeMissing = received.filter((x) => x.url.includes('/gettoken')).length;
    const base4 = { corpid: 'C', corpsecret: 'S', agentid: '1', touser: 'u' };
    const missingCases = [['corpid', '缺少 corpid'], ['corpsecret', '缺少 corpsecret'], ['agentid', '缺少 agentid'], ['touser', '缺少 touser']];
    for (const [f, want] of missingCases) {
      const c = Object.assign({}, base4); delete c[f];
      const r = await notifier.CHANNELS.wecomapp.send(c, 't', 'b');
      check('wecomapp: 缺 ' + f + ' 报「' + want + '」', r.ok === false && r.error === want, JSON.stringify(r));
    }
    const tokAfter = received.filter((x) => x.url.includes('/gettoken')).length;
    check('wecomapp: 缺字段不发起任何网络请求', tokAfter === tokBeforeMissing, tokBeforeMissing + ' -> ' + tokAfter);
  }

  console.log();
  console.log('=== 2. 单通道失败不影响其余通道 ===');
  const badCfg = reminder.normalizeConfig({
    channels: {
      wxpusher: { enabled: true, appToken: '', uids: 'UID_a' }, // 缺 token
      serverchan: { enabled: true, sendkey: 'SCT_test' },
      wecom: { enabled: true, webhookKey: '' }, // 缺 webhook Key
      wecomapp: { enabled: true, corpid: '', corpsecret: '', agentid: '', touser: '' }, // 缺全部四字段
    },
  });
  const r2 = await notifier.notifyAll(badCfg, 't', 'b');
  check('wxpusher 因缺 appToken 失败', r2.find((x) => x.channel === 'wxpusher').ok === false);
  check('serverchan 仍成功', r2.find((x) => x.channel === 'serverchan').ok === true);
  check('wecom 因缺 webhook Key 失败且报错文案正确', (() => { const w = r2.find((x) => x.channel === 'wecom'); return w && w.ok === false && w.error === '缺少 webhook Key'; })(), JSON.stringify(r2.find((x) => x.channel === 'wecom')));
  check('wecomapp 因缺 corpid 失败且报错文案正确', (() => { const w = r2.find((x) => x.channel === 'wecomapp'); return w && w.ok === false && w.error === '缺少 corpid'; })(), JSON.stringify(r2.find((x) => x.channel === 'wecomapp')));

  console.log();
  console.log('=== 2.5 notifyAll 并行 + 输出顺序稳定（PERF-1 回归）===');
  {
    // 用「不同延迟的通道」证明并行：串行实现总耗时 ≈ 各延迟之和，并行 ≈ 最大延迟
    const slowSrv = http.createServer((req, res) => {
      const delay = req.url.includes('slow') ? 300 : (req.url.includes('mid') ? 150 : 10);
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url.includes('webhook/send')) res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
        else res.end(JSON.stringify({ code: 200, message: 'success' }));
      }, delay);
    });
    await new Promise((r) => slowSrv.listen(0, '127.0.0.1', r));
    const sPort = slowSrv.address().port;
    const sBase = 'http://127.0.0.1:' + sPort;
    process.env.NOTIFY_BARK_URL = sBase + '/bark';
    process.env.NOTIFY_WECOM_URL = sBase + '/wecom/webhook/send';
    const pCfg = reminder.normalizeConfig({ channels: { bark: { enabled: true, deviceKey: 'k' }, wecom: { enabled: true, webhookKey: 'w' } } });
    const t0 = Date.now();
    const pRes = await notifier.notifyAll(pCfg, 't', 'b');
    const cost = Date.now() - t0;
    check('并行发送耗时 ≈ 最慢通道（<450ms，串行需 450ms+）', cost < 450, String(cost) + 'ms');
    check('输出顺序与 CHANNELS 注册顺序一致（bark 在 wecom 前）',
      JSON.stringify(pRes.map((x) => x.channel)) === '["bark","wecom"]',
      JSON.stringify(pRes.map((x) => x.channel)));
    check('结果结构完整（channel/label/ok/error）', pRes.every((x) => 'channel' in x && 'label' in x && 'ok' in x && 'error' in x), JSON.stringify(pRes));
    slowSrv.close();
    process.env.NOTIFY_BARK_URL = base + '/bark';
    process.env.NOTIFY_WECOM_URL = base + '/wecom/webhook/send';
  }

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
  const U = require('../server/util');
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
  // 先清目录：上一次运行若被中断会留下脏数据，导致「消费表为空」等断言误报
  fs.rmSync('.notify-test-data2', { recursive: true, force: true });
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
  console.log('=== 5.7 消费记录删除（R3-F1 回归）===');
  // 先清目录：同上，避免残留记录导致「删除后消费表为空」误报
  fs.rmSync('.notify-test-data4', { recursive: true, force: true });
  const store4 = new Store('.notify-test-data4');
  routes.init(store4);
  const seed4 = store4.read('cards', [])[0];
  const mcDel = {
    id: 'mc_deltest', cardId: seed4.id, bank: seed4.bank, name: seed4.name, org: seed4.org, level: seed4.level,
    annualFee: 0, waiverType: '消费刷免', waiverCondition: '1000', waiverPolicy: '',
    alias: '删除测试', creditLimit: 10000, billingDay: 1, repaymentDay: 20, repayMode: 'fixed', repayValue: 20,
    graceDays: 0, waivedYear: 0, countPeriodYear: 0, maxInterestDays: 0,
    feeMonth: 1, feeDay: 1, last4: '', monthlySpendTarget: 0,
    benefits: [], pointsDeducted: false, pointsDeductDate: null, assetWaived: false, assetWaivedDate: null, createdAt: new Date().toISOString(),
  };
  store4.write('mycards', [mcDel]);
  const postCons = await routes.handle('POST', '/api/mycards/mc_deltest/consumptions', new URL('http://x/p'), { date: U.todayStr(), amount: 300, channel: '微信支付', category: '餐饮' });
  check('记一笔 300 元成功', postCons && postCons.status === 201 && postCons.body.amount === 300, JSON.stringify(postCons));
  const delId = postCons.body.id;
  const delRes = await routes.handle('DELETE', '/api/mycards/mc_deltest/consumptions/' + delId, new URL('http://x/p'), {});
  check('删除该笔成功', delRes && delRes.status === 200 && delRes.body.ok, JSON.stringify(delRes));
  check('删除后消费表为空', store4.read('consumptions', []).length === 0, JSON.stringify(store4.read('consumptions')));
  const delAgain = await routes.handle('DELETE', '/api/mycards/mc_deltest/consumptions/' + delId, new URL('http://x/p'), {});
  check('重复删除返回 404', delAgain && delAgain.status === 404, JSON.stringify(delAgain));  // 笔数补录不支持删除
  await routes.handle('POST', '/api/mycards/mc_deltest/consumptions/count', new URL('http://x/p'), { date: U.todayStr(), count: 2 });
  const cntRec = store4.read('consumptions', [])[0];
  const delCnt = await routes.handle('DELETE', '/api/mycards/mc_deltest/consumptions/' + cntRec.id, new URL('http://x/p'), {});
  check('笔数补录拒绝删除', delCnt && delCnt.status === 400 && /不支持删除/.test(delCnt.body.error), JSON.stringify(delCnt));

  console.log();
  console.log('=== 5.7.1 账单月份合法性（BUG-1 回归：拒绝 2026-13 / 2026-00）===');
  {
    const badMonth1 = await routes.handle('POST', '/api/bills', new URL('http://x/p'), { myCardId: 'mc_deltest', month: '2026-13', amount: 100 });
    check('POST 账单 month=2026-13 → 400', badMonth1 && badMonth1.status === 400 && /YYYY-MM/.test(badMonth1.body.error), JSON.stringify(badMonth1.body));
    const badMonth2 = await routes.handle('POST', '/api/bills', new URL('http://x/p'), { myCardId: 'mc_deltest', month: '2026-00', amount: 100 });
    check('POST 账单 month=2026-00 → 400', badMonth2 && badMonth2.status === 400, JSON.stringify(badMonth2.body));
    // PUT 同样拦（显式传月时）
    const goodBill = await routes.handle('POST', '/api/bills', new URL('http://x/p'), { myCardId: 'mc_deltest', month: '2026-05', amount: 100 });
    check('合法月份 2026-05 仍可创建', goodBill && goodBill.status === 201, JSON.stringify(goodBill && goodBill.body));
    const putBad = await routes.handle('PUT', '/api/bills/' + goodBill.body.id, new URL('http://x/p'), { month: '2026-13' });
    check('PUT 账单 month=2026-13 → 400', putBad && putBad.status === 400 && /YYYY-MM/.test(putBad.body.error), JSON.stringify(putBad.body));
    const putOk = await routes.handle('PUT', '/api/bills/' + goodBill.body.id, new URL('http://x/p'), { month: '2026-12' });
    check('PUT 改为合法 2026-12 成功', putOk && putOk.status === 200 && putOk.body.month === '2026-12', JSON.stringify(putOk && putOk.body));
    // 导入兜底：脏月份的备份账单被丢弃而不是落库
    // （持卡卡种匹配走 cardKey 四元组，需带上库内 seed4 的 bank/name/org/level）
    const importRes = await routes.handle('POST', '/api/mycards/import', new URL('http://x/p'), {
      mode: 'merge',
      data: { schema: 'guanka-backup',
        cardTypes: [{ id: 'src_seed', bank: seed4.bank, name: seed4.name, org: seed4.org, level: seed4.level, annualFee: 0 }],
        myCards: [{ id: 'mc_imp', cardId: 'src_seed', bank: seed4.bank, name: seed4.name, org: seed4.org, level: seed4.level, annualFee: 0, alias: '导入月测试' }],
        bills: [{ id: 'bill_imp1', myCardId: 'mc_imp', month: '2026-13', amount: 50 }, { id: 'bill_imp2', myCardId: 'mc_imp', month: '2026-06', amount: 60 }] },
    });
    check('备份导入合法月份账单成功', importRes && importRes.status === 200, JSON.stringify(importRes && importRes.body));
    const impBills = store4.read('bills', []).filter((b) => b.myCardId === 'mc_imp');
    check('导入脏月份 2026-13 被丢弃、合法 2026-06 保留', impBills.length === 1 && impBills[0].month === '2026-06', JSON.stringify(impBills.map((b) => b.month)));
    // bills/generate 显式传脏月份 → 回落引擎计算的合法月份
    const genBad = await routes.handle('POST', '/api/mycards/mc_deltest/bills/generate', new URL('http://x/p'), { month: '2026-13' });
    check('generate 脏月份被忽略并回落合法 billMonth', genBad && genBad.status === 201 && /^\d{4}-(0[1-9]|1[0-2])$/.test(genBad.body.month), JSON.stringify(genBad && genBad.body));
    store4.write('mycards', []);
    store4.write('bills', []);
  }

  store4.write('mycards', []);
  fs.rmSync('.notify-test-data4', { recursive: true, force: true });

  console.log();
  console.log('=== 5.8 提醒检查并发互斥（R3-2 回归）===');
  fs.rmSync('.notify-test-data5', { recursive: true, force: true });
  const store5 = new Store('.notify-test-data5');
  routes.init(store5);
  store5.write('notify', { enabled: true, intervalMinutes: 0, channels: { bark: { enabled: true, deviceKey: 'bkkey', server: base + '/bark' } } });
  const [c1, c2] = await Promise.all([routes.runNotifyChecks(true), routes.runNotifyChecks(true)]);
  const skippedOne = [c1, c2].filter((r) => r.skipped && /进行中/.test(r.reason || '')).length;
  check('并发两次检查恰有一次被互斥跳过', skippedOne === 1, JSON.stringify([c1, c2]));
  store5.write('notify', { enabled: false });
  fs.rmSync('.notify-test-data5', { recursive: true, force: true });

  console.log();
  console.log('=== 5.9 权益稳定 id（R5-5 回归：增删/重排不错位）===');
  fs.rmSync('.notify-test-data6', { recursive: true, force: true });
  const store6 = new Store('.notify-test-data6');
  routes.init(store6);
  const seed6 = store6.read('cards', [])[0];
  const post = (p, body) => routes.handle('POST', p, new URL('http://x/p'), body);
  const put = (p, body) => routes.handle('PUT', p, new URL('http://x/p'), body);
  const get = (p) => routes.handle('GET', p, new URL('http://x/p'), null);

  // 走真实 API 建档（权益经 normalizeBenefits 规范化、获得稳定 id）
  const mcId = (await post('/api/mycards', {
    cardId: seed6.id, alias: '权益id测试', annualFee: 0, waiverType: '免年费',
    benefits: [{ name: 'A贵宾厅', total: 2 }, { name: 'B代驾', total: 5 }],
  })).body.id;
  let m6 = (await get('/api/mycards')).body.data.find((x) => x.id === mcId);
  const bidA = m6.benefits[0].id, bidB = m6.benefits[1].id;
  check('权益自动获得稳定 id', !!(bidA && bidB && bidA !== bidB), JSON.stringify([bidA, bidB]));

  await post('/api/mycards/' + mcId + '/benefits/0/usage', { date: U.todayStr(), bid: bidA });
  await post('/api/mycards/' + mcId + '/benefits/0/usage', { date: U.todayStr(), bid: bidA });
  m6 = (await get('/api/mycards')).body.data.find((x) => x.id === mcId);
  check('A 累计使用 2 次', m6.benefits[0].used === 2, JSON.stringify(m6.benefits.map((b) => b.name + '=' + b.used)));

  // 删掉 A：修复前 B 会因索引前移而继承 A 的 2 次
  await put('/api/mycards/' + mcId, { benefits: [{ id: bidB, name: 'B代驾', total: 5 }] });
  m6 = (await get('/api/mycards')).body.data.find((x) => x.id === mcId);
  check('删除 A 后 B 使用次数为 0（不继承 A 的历史）', m6.benefits[0].used === 0, 'B.used=' + m6.benefits[0].used);

  // 重排：C 前置，各自记录必须跟随权益本身
  await put('/api/mycards/' + mcId, { benefits: [{ id: bidB, name: 'B代驾', total: 5 }, { name: 'C洗牙', total: 3 }] });
  m6 = (await get('/api/mycards')).body.data.find((x) => x.id === mcId);
  const bidC = m6.benefits[1].id;
  await post('/api/mycards/' + mcId + '/benefits/1/count', { count: 3, bid: bidC });
  await put('/api/mycards/' + mcId, { benefits: [{ id: bidC, name: 'C洗牙', total: 3 }, { id: bidB, name: 'B代驾', total: 5 }] });
  m6 = (await get('/api/mycards')).body.data.find((x) => x.id === mcId);
  check('重排后 C=3 / B=0（记录跟随权益）', m6.benefits[0].used === 3 && m6.benefits[1].used === 0,
    JSON.stringify(m6.benefits.map((b) => b.name + '=' + b.used)));

  console.log();
  console.log('=== 5.10 权益接口边界与日期真实性（R5-1/R5-2 回归）===');
  const oob = await post('/api/mycards/' + mcId + '/benefits/99/usage', { date: U.todayStr() });
  check('越界索引 usage → 404（不再写入垃圾记录）', oob.status === 404, JSON.stringify(oob));
  const oobC = await post('/api/mycards/' + mcId + '/benefits/99/count', { count: 1 });
  check('越界索引 count → 404', oobC.status === 404, JSON.stringify(oobC));
  const oobH = await get('/api/mycards/' + mcId + '/benefits/99/history');
  check('越界索引 history → 404', oobH.status === 404, JSON.stringify(oobH));
  const badBid = await post('/api/mycards/' + mcId + '/benefits/0/usage', { date: U.todayStr(), bid: 'nope' });
  check('未知 bid → 404', badBid.status === 404, JSON.stringify(badBid));
  check('越界请求未产生任何记录', store6.read('benefits', []).filter((r) => r.idx === 99).length === 0,
    JSON.stringify(store6.read('benefits', [])));

  // 日期真实性：2026-02-30 / 2026-13-01 均不存在，必须被拒（此前静默进位入库）
  check('parseDateStr 拒绝 2026-02-30', U.parseDateStr('2026-02-30') === null, String(U.parseDateStr('2026-02-30')));
  check('parseDateStr 拒绝 2026-13-01', U.parseDateStr('2026-13-01') === null, String(U.parseDateStr('2026-13-01')));
  check('parseDateStr 接受 2026-02-28', U.parseDateStr('2026-02-28') !== null, String(U.parseDateStr('2026-02-28')));
  const dirtyCons = await post('/api/mycards/' + mcId + '/consumptions', { date: '2026-02-30', amount: 10 });
  check('消费脏日期被回退为今天', dirtyCons.status === 201 && dirtyCons.body.date !== '2026-02-30', JSON.stringify(dirtyCons.body && dirtyCons.body.date));
  const dirtyBill = await post('/api/bills', { myCardId: mcId, month: '2099-01', amount: 100, dueDate: '2026-02-30' });
  check('账单脏 dueDate 被忽略', dirtyBill.status === 201 && dirtyBill.body.dueDate === '', JSON.stringify(dirtyBill.body && dirtyBill.body.dueDate));
  // PUT 也要拦脏日期（此前只做 String() 透传）
  const dirtyBillPut = await put('/api/bills/' + dirtyBill.body.id, { dueDate: '2026-13-01', paidDate: '2026-02-31' });
  check('账单 PUT 脏日期同样被拦', dirtyBillPut.status === 200 && dirtyBillPut.body.dueDate === '' && dirtyBillPut.body.paidDate === '',
    JSON.stringify({ dueDate: dirtyBillPut.body && dirtyBillPut.body.dueDate, paidDate: dirtyBillPut.body && dirtyBillPut.body.paidDate }));
  store6.write('mycards', []);
  store6.write('bills', []);
  fs.rmSync('.notify-test-data6', { recursive: true, force: true });

  console.log();
  console.log('=== 5.11 年费当天提醒去重键（R5-4 回归）===');
  {
    // feeDays 从 1 跨到 0 时必须产生不同的 key，否则「年费今日收取」被去重吞掉
    const c = { id: 'mc_x', name: 'X卡', annualFee: 3600, feeDays: 1, nextFeeDate: '2030-05-06',
      waiver: { needsPayment: true, kind: '刚性', statusText: '需缴费' } };
    const cfgT = reminder.normalizeConfig({ rules: { feeDays: [30, 7, 1] } });
    const it1 = reminder.collectReminders([c], cfgT, new Date(), []).find((x) => x.type === 'fee');
    const it0 = reminder.collectReminders([Object.assign({}, c, { feeDays: 0 })], cfgT, new Date(), []).find((x) => x.type === 'fee');
    check('feeDays=1 与 feeDays=0 的 key 不同', !!it1 && !!it0 && it1.key !== it0.key, (it1 && it1.key) + ' vs ' + (it0 && it0.key));
    check('feeDays=0 标题为「年费今日收取」', !!it0 && /年费今日收取/.test(it0.title), it0 && it0.title);
  }

  console.log();
  console.log('=== 5.12 权益生命周期边界（R5-6/R5-7/R5-8 回归）===');
  fs.rmSync('.notify-test-data7', { recursive: true, force: true });
  const store7 = new Store('.notify-test-data7');
  routes.init(store7);
  const seed7 = store7.read('cards', []).find((c) => c.annualFee === 0) || store7.read('cards', [])[0];
  const post7 = (p, b) => routes.handle('POST', p, new URL('http://x/p'), b);
  const put7 = (p, b) => routes.handle('PUT', p, new URL('http://x/p'), b);
  const get7 = (p) => routes.handle('GET', p, new URL('http://x/p'), null);

  // R5-8：显式提交空数组应真的清空，而不是回退到卡种默认权益
  const empty = (await post7('/api/mycards', { cardId: seed7.id, alias: '清空测试', annualFee: 0, waiverType: '免年费', benefits: [] })).body;
  check('显式提交 benefits:[] → 权益为空（不回填卡种默认）', (empty.benefits || []).length === 0,
    JSON.stringify((empty.benefits || []).map((b) => b.name)));
  const inherit = (await post7('/api/mycards', { cardId: seed7.id, alias: '继承测试', annualFee: 0, waiverType: '免年费' })).body;
  check('不传 benefits → 继承卡种默认权益', (inherit.benefits || []).length === (seed7.benefits || []).length,
    JSON.stringify((inherit.benefits || []).map((b) => b.name)));

  // R5-6：过期权益不得再写入/补录
  const mc7 = (await post7('/api/mycards', {
    cardId: seed7.id, alias: '过期测试', annualFee: 0, waiverType: '免年费',
    benefits: [{ name: '限时', total: 5, validUntil: '2020-01-01' }, { name: '长期', total: 5 }],
  })).body;
  const expB = (await get7('/api/mycards')).body.data.find((x) => x.id === mc7.id).benefits[0];
  check('过期权益 expired=true 且不计入 exhausted', expB.expired === true && expB.exhausted === false, JSON.stringify(expB));
  const expUse = await post7('/api/mycards/' + mc7.id + '/benefits/0/usage', { date: U.todayStr(), bid: expB.id });
  check('过期权益 usage → 400 拦截', expUse.status === 400 && /有效期/.test(expUse.body.error), JSON.stringify(expUse));
  const expCnt = await post7('/api/mycards/' + mc7.id + '/benefits/0/count', { count: 1, bid: expB.id });
  check('过期权益 count → 400 拦截', expCnt.status === 400 && /有效期/.test(expCnt.body.error), JSON.stringify(expCnt));

  // R5-7：删除权益应连带清理其使用记录，避免孤儿记录无限累积
  const liveB = (await get7('/api/mycards')).body.data.find((x) => x.id === mc7.id).benefits[1];
  await post7('/api/mycards/' + mc7.id + '/benefits/1/usage', { date: U.todayStr(), bid: liveB.id });
  await post7('/api/mycards/' + mc7.id + '/benefits/1/usage', { date: U.todayStr(), bid: liveB.id });
  const recsBefore = store7.read('benefits', []).length;
  await put7('/api/mycards/' + mc7.id, { benefits: [{ name: '长期', total: 5 }] }); // 换掉 id → 旧记录成孤儿
  const recsAfter = store7.read('benefits', []).length;
  check('移除权益后其使用记录被连带清理', recsAfter === 0, '清理前 ' + recsBefore + ' 条，清理后 ' + recsAfter + ' 条：' + JSON.stringify(store7.read('benefits', [])));

  store7.write('mycards', []); store7.write('benefits', []); store7.write('bills', []);
  fs.rmSync('.notify-test-data7', { recursive: true, force: true });

  console.log();
  console.log('=== 5.13 合并账单组（还款提醒按组合并为 1 条）===');
  fs.rmSync('.notify-test-data8', { recursive: true, force: true });
  const store8 = new Store('.notify-test-data8');
  routes.init(store8);
  const db8 = store8.read('cards', []);
  const post8 = (p, b) => routes.handle('POST', p, new URL('http://x/p'), b);
  const put8 = (p, b) => routes.handle('PUT', p, new URL('http://x/p'), b);
  const del8 = (p) => routes.handle('DELETE', p, new URL('http://x/p'), null);
  const get8 = (p) => routes.handle('GET', p, new URL('http://x/p'), null);
  const mk8 = (cardId, o) => post8('/api/mycards', Object.assign({
    cardId, alias: '', creditLimit: 50000, billingDay: 1, repayMode: 'fixed', repayValue: 20,
    graceDays: 3, feeMonth: 1, feeDay: 1, benefits: [],
  }, o || {}));
  const probeNow = new Date(2026, 9, 13); // 2026-10-13

  const gA = (await mk8(db8[0].id, { alias: '合并A' })).body;
  const gB = (await mk8(db8[1].id, { alias: '合并B' })).body;
  const gC = (await mk8(db8[2].id, { alias: '独立C' })).body;       // 不入组
  const gD = (await mk8(db8[3].id, { alias: '还款25' , repayValue: 25})).body; // 不同还款日

  // 组内必须同还款日（策略③）：先拒绝，再成功
  const badG = await post8('/api/billgroups', { name: '不一致组', memberIds: [gA.id, gD.id] });
  check('组内还款日不一致 → 拒绝建组', badG.status === 400 && /还款日不一致/.test(badG.body.error), JSON.stringify(badG.body));
  const only = await post8('/api/billgroups', { name: '单卡组', memberIds: [gA.id] });
  check('成员少于 2 张 → 拒绝', only.status === 400, JSON.stringify(only.body));

  const grp = (await post8('/api/billgroups', { name: '招行合并还款', memberIds: [gA.id, gB.id] })).body;
  check('同还款日可建组', !!grp.id, JSON.stringify(grp));

  const list8 = (await get8('/api/mycards')).body;
  const rA = list8.data.find((m) => m.id === gA.id);
  check('持卡回显 billGroupName', rA.billGroupName === '招行合并还款', rA.billGroupName);
  check('/api/mycards 返回 billGroups', Array.isArray(list8.billGroups) && list8.billGroups.length === 1, JSON.stringify(list8.billGroups));

  // 编辑持卡破坏一致性应被拦（改还款日 / 把不一致的卡挪进组）
  const breakIt = await put8('/api/mycards/' + gA.id, { repayValue: 25 });
  check('组内成员改还款日 → 拒绝', breakIt.status === 400 && /还款日不一致/.test(breakIt.body.error), JSON.stringify(breakIt.body));
  const moveIn = await put8('/api/mycards/' + gD.id, { billGroupId: grp.id });
  check('把还款日不同的卡挪进组 → 拒绝', moveIn.status === 400 && /还款日不一致/.test(moveIn.body.error), JSON.stringify(moveIn.body));
  const moveOut = await put8('/api/mycards/' + gB.id, { billGroupId: '' });
  check('可退出组', moveOut.status === 200 && moveOut.body.billGroupId === '');
  await put8('/api/mycards/' + gB.id, { billGroupId: grp.id });

  // 还款提醒：组内 2 张只产出 1 条，且 key 为组级
  const idx8 = routes._internals.buildIndexes();
  const comp8 = store8.read('mycards', []).map((m) => routes._internals.computeMyCard(m, probeNow, idx8));
  for (const m of comp8) m.payment = Object.assign({}, m.payment, { payDaysLeft: 3, lastPayDate: '2026-10-16' });
  const cfg8 = reminder.normalizeConfig({ rules: { repayBeforeDays: 3, taskRemainDays: 0, billBeforeDays: 0, billOverdueRemind: 0, feeDays: [] } });
  const rep8 = reminder.collectReminders(comp8, cfg8, probeNow, []).filter((x) => x.type === 'repay');
  const gItem8 = rep8.find((x) => x.key.indexOf('repay:group:') === 0);
  check('组内 2 张卡只产出 1 条还款提醒', rep8.filter((x) => /group/.test(x.key)).length === 1, JSON.stringify(rep8.map((x) => x.key)));
  check('合并提醒 key 前缀为 repay:group:', !!gItem8 && gItem8.key.indexOf('repay:group:' + grp.id) === 0, gItem8 && gItem8.key);
  check('合并提醒标题含「2 张卡合并」', !!gItem8 && /2 张卡合并/.test(gItem8.title), gItem8 && gItem8.title);
  check('合并提醒正文列出两张卡', !!gItem8 && /合并A/.test(gItem8.body) && /合并B/.test(gItem8.body), gItem8 && gItem8.body);
  check('未入组卡各自提醒（2 张 → 2 条）', rep8.filter((x) => !/group/.test(x.key)).length === 2, JSON.stringify(rep8.filter((x) => !/group/.test(x.key)).map((x) => x.key)));

  // 3 天 → 当天的 key 必须变化，否则当天提醒会被去重吞掉
  const comp0 = comp8.map((m) => (m.billGroupId === grp.id
    ? Object.assign({}, m, { payment: Object.assign({}, m.payment, { payDaysLeft: 0 }) }) : m));
  const rep0 = reminder.collectReminders(comp0, reminder.normalizeConfig({ rules: { repayBeforeDays: 3, feeDays: [] } }), probeNow, []).filter((x) => x.key.indexOf('repay:group:') === 0);
  check('3 天与当天 key 不同（当天提醒不被吞）', !!gItem8 && !!rep0[0] && gItem8.key !== rep0[0].key, (gItem8 && gItem8.key) + ' vs ' + (rep0[0] && rep0[0].key));
  check('当天提醒标题为「今日还款」', !!rep0[0] && /今日还款/.test(rep0[0].title), rep0[0] && rep0[0].title);

  // 账单流水：同组同月合并
  await post8('/api/bills', { myCardId: gA.id, month: '2026-10', amount: 12400, dueDate: '2026-10-16' });
  await post8('/api/bills', { myCardId: gB.id, month: '2026-10', amount: 3600, dueDate: '2026-10-16' });
  const cfgB8 = reminder.normalizeConfig({ rules: { repayBeforeDays: 0, taskRemainDays: 0, billBeforeDays: 3, billOverdueRemind: 1, feeDays: [] } });
  const bill8 = reminder.collectReminders(comp8, cfgB8, probeNow, store8.read('bills', [])).filter((x) => x.type === 'bill');
  check('同组同月账单合并为 1 条', bill8.length === 1, JSON.stringify(bill8.map((x) => x.key)));
  check('合并账单提醒金额为合计', bill8.length === 1 && /16,000/.test(bill8[0].body), bill8.length ? bill8[0].body : '');

  // 年费/刷卡任务不参与合并（每张卡独立）
  const compFee8 = comp8.map((m) => Object.assign({}, m, { feeDays: 7, waiver: { needsPayment: true, kind: '刚性' } }));
  const fee8 = reminder.collectReminders(compFee8, reminder.normalizeConfig({ rules: { feeDays: [30, 7, 1], repayBeforeDays: 0, taskRemainDays: 0 } }), probeNow, []);
  check('年费提醒仍按卡推送（4 张 → 4 条）', fee8.filter((x) => x.type === 'fee').length === 4, String(fee8.filter((x) => x.type === 'fee').length));

  // 改组 / 解散 / 删卡清理
  const putG = await put8('/api/billgroups/' + grp.id, { name: '改名后', memberIds: [gA.id, gB.id, gC.id] });
  check('可改组名与成员', putG.status === 200 && putG.body.name === '改名后', JSON.stringify(putG.body));
  const afterPut = (await get8('/api/billgroups')).body;
  check('成员数更新为 3', afterPut[0].memberCount === 3, JSON.stringify(afterPut[0]));
  check('新成员 billGroupId 已写入', (await get8('/api/mycards')).body.data.find((m) => m.id === gC.id).billGroupId === grp.id);

  const delG = await del8('/api/billgroups/' + grp.id);
  check('解散组成功', delG.status === 200 && delG.body.ok === true, JSON.stringify(delG.body));
  const afterDel = (await get8('/api/mycards')).body;
  check('解散后成员 billGroupId 全清空', afterDel.data.every((m) => m.billGroupId === '') && afterDel.billGroups.length === 0, JSON.stringify(afterDel.data.map((m) => m.billGroupId)));

  // 改组后只剩 1 张卡 → 拒绝（避免产生名存实亡的组），组状态保持不变
  const solo = (await post8('/api/billgroups', { name: '两卡组', memberIds: [gA.id, gB.id] })).body;
  check('解散后可重新建组', !!solo.id, JSON.stringify(solo));
  const shrinkToOne = await put8('/api/billgroups/' + solo.id, { name: '两卡组', memberIds: [gA.id] });
  check('改组后成员只剩 1 张 → 400 拒绝', shrinkToOne.status === 400 && /至少需要 2 张卡/.test(shrinkToOne.body.error), JSON.stringify(shrinkToOne.body));
  const stillThere = (await get8('/api/billgroups')).body.find((g) => g.id === solo.id);
  check('被拒绝的改组不改变原状态', !!stillThere && stillThere.memberCount === 2, JSON.stringify(stillThere));
  check('被拒绝的改组不落地成员变更', (await get8('/api/mycards')).body.data.filter((m) => m.billGroupId === solo.id).length === 2);
  await del8('/api/billgroups/' + solo.id);

  const grp2 = (await post8('/api/billgroups', { name: '临时组', memberIds: [gA.id, gB.id] })).body;
  await del8('/api/mycards/' + gA.id);
  await del8('/api/mycards/' + gB.id);
  check('成员删空后组自动解散（无僵尸组）', (await get8('/api/billgroups')).body.length === 0, JSON.stringify((await get8('/api/billgroups')).body));
  check('无悬空 billGroupId', (await get8('/api/mycards')).body.data.every((m) => !m.billGroupId));

  check('未知组 id → 404', (await put8('/api/billgroups/nope', { name: 'x' })).status === 404);
  check('删未知组 → 404', (await del8('/api/billgroups/nope')).status === 404);
  check('成员不存在 → 404', (await post8('/api/billgroups', { name: 'zz', memberIds: ['nope', gD.id] })).status === 404);

  // 还款节奏一致性判定：10 月恰好同日、换月会错开的组合必须判为不一致
  const S = routes._internals.sameRepaySchedule;
  const F = (v, g) => ({ billingDay: 1, repayMode: 'fixed', repayValue: v, graceDays: g == null ? 3 : g });
  const A = (n) => ({ billingDay: 1, repayMode: 'afterBill', repayValue: n, graceDays: 3 });
  check('fixed20 vs fixed20 → 一致', S(F(20), F(20), probeNow) === true);
  check('fixed20 vs fixed25 → 不一致', S(F(20), F(25), probeNow) === false);
  check('fixed20 vs afterBill20 → 不一致', S(F(20), A(20), probeNow) === false);
  check('当月恰好同日但换月错开 → 不一致', S(F(5, 0), A(4), probeNow) === false);
  check('同日期不同宽限期 → 不一致', S(F(20, 3), F(20, 5), probeNow) === false);

  store8.write('mycards', []); store8.write('bills', []); store8.write('billGroups', []);
  fs.rmSync('.notify-test-data8', { recursive: true, force: true });

  console.log();
  console.log('=== 5.14 提醒去重键的时间基准（R7 回归）===');
  {
    // repayItem / taskItem 的 key 必须用「传入的 now」，而非 new Date()。
    // 否则测试/回溯注入历史日期时，key 里的年月会是真实当前月份，去重行为不可复现。
    const pn = new Date(2026, 9, 31); // 2026-10-31（月末，落在任务提醒窗口内）

    // 还款：同一天同一张卡 key 相同；换月（下期最后还款日变化）key 必须变化
    const rc = { id: 'mc_r7', name: 'R7还款卡', alias: 'R7',
      payment: { lastPayDate: '2026-11-04', payDaysLeft: 4, billDate: '2026-10-10', dueDate: '2026-11-01' } };
    const cfgR = reminder.normalizeConfig({ rules: { repayBeforeDays: 7, taskRemainDays: 0, feeDays: [] } });
    const r1 = reminder.collectReminders([rc], cfgR, pn, []).find((x) => x.type === 'repay');
    const r2 = reminder.collectReminders([rc], cfgR, pn, []).find((x) => x.type === 'repay');
    check('还款提醒 key 含最后还款日', !!r1 && r1.key.includes('2026-11-04'), r1 && r1.key);
    check('同输入两次 key 相同（可复现）', !!r1 && !!r2 && r1.key === r2.key, (r1 && r1.key) + ' vs ' + (r2 && r2.key));
    const rc2 = Object.assign({}, rc, { payment: Object.assign({}, rc.payment, { lastPayDate: '2026-12-04', payDaysLeft: 4 }) });
    const r3 = reminder.collectReminders([rc2], cfgR, pn, []).find((x) => x.type === 'repay');
    check('换期后还款 key 变化（可再次提醒）', !!r1 && !!r3 && r1.key !== r3.key, (r1 && r1.key) + ' vs ' + (r3 && r3.key));

    // 刷卡任务：key 里的月份必须是传入 now 的月份，而非真实当前月份
    const tc = { id: 'mc_t7', name: 'R7任务卡', alias: 'T7',
      monthlySpendTarget: 10000, monthSpend: 1000, payment: {} };
    const cfgT = reminder.normalizeConfig({ rules: { repayBeforeDays: 0, taskRemainDays: 3, feeDays: [] } });
    const t1 = reminder.collectReminders([tc], cfgT, pn, []).find((x) => x.type === 'task');
    const ym = pn.getFullYear() + '-' + String(pn.getMonth() + 1).padStart(2, '0');
    check('刷卡任务 key 用传入 now 的年月 ' + ym, !!t1 && t1.key === 'task:mc_t7:' + ym, t1 && t1.key);
    // 换月（跨到 11 月）后 key 应变化，使新一月的任务可再提醒一次
    const t2 = reminder.collectReminders([tc], cfgT, new Date(2026, 10, 30), []).find((x) => x.type === 'task');
    check('跨月后刷卡任务 key 变化', !!t1 && !!t2 && t1.key !== t2.key, (t1 && t1.key) + ' vs ' + (t2 && t2.key));
  }

  console.log();
  console.log('=== 5.15 提醒检查回写不覆盖并发改动（R7 回归）===');
  fs.rmSync('.notify-test-data9', { recursive: true, force: true });
  {
    const store9 = new Store('.notify-test-data9');
    routes.init(store9);
    // 预置一份配置（bark 指向 mock，便于推送成功且不发起外网请求）
    store9.write('notify', reminder.normalizeConfig({
      enabled: true, intervalMinutes: 60,
      channels: { bark: { enabled: true, deviceKey: 'bkkey', server: base + '/bark' } },
      rules: { feeDays: [], repayBeforeDays: 0, taskRemainDays: 0, billBeforeDays: 0, billOverdueRemind: 1 },
    }));
    // 造一张卡 + 一条「已逾期」账单：逾期提醒与「当前真实日期」无关，保证一定产生提醒项
    const db9 = store9.read('cards', []);
    const mc9 = (await routes.handle('POST', '/api/mycards', new URL('http://x/p'), {
      cardId: db9[0].id, alias: 'R7配置卡', creditLimit: 50000, billingDay: 1,
      repayMode: 'fixed', repayValue: 21, graceDays: 3, feeMonth: 1, feeDay: 1, benefits: [],
    })).body;
    await routes.handle('POST', '/api/bills', new URL('http://x/p'), {
      myCardId: mc9.id, month: '2020-01', amount: 999, dueDate: '2020-01-31',
    });
    // 模拟「检查进行中」用户改了配置：在推送（网络操作）期间写入新的 deviceKey。
    // 若回写用检查开头读到的旧 cfg，用户的改动就会被抹掉 → 断言失败。
    // 注：Windows 下 undici 对 127.0.0.1 的 keep-alive 连接偶发抖动（R7 期间已知），
    // 桩内对瞬时 fetch failed 做一次重试，避免测试基建抖动误报 NOTE-1 语义。
    const origNotifyAll = notifier.notifyAll;
    notifier.notifyAll = async function (c, t, b) {
      const p = reminder.normalizeConfig(store9.read('notify', null));
      p.channels.bark.deviceKey = 'bkkey-用户新填的';
      store9.write('notify', p);
      const first = await origNotifyAll.call(notifier, c, t, b);
      if (first.some((x) => !x.ok && /fetch failed/i.test(x.error || ''))) {
        return origNotifyAll.call(notifier, c, t, b); // 重试一次：仅针对瞬时网络抖动
      }
      return first;
    };
    let after;
    try {
      await routes.runNotifyChecks(true);
      after = reminder.normalizeConfig(store9.read('notify', null));
    } finally {
      notifier.notifyAll = origNotifyAll;
    }
    check('检查回写后保留了用户的通道改动', after.channels.bark.deviceKey === 'bkkey-用户新填的', after.channels.bark.deviceKey);
    check('检查回写后 lastCheckAt 已更新', !!after.lastCheckAt, after.lastCheckAt);
    check('检查产生的 sentLog 已落盘', Object.keys(after.sentLog || {}).length > 0, JSON.stringify(after.sentLog));
    store9.write('mycards', []); store9.write('notify', {});
    fs.rmSync('.notify-test-data9', { recursive: true, force: true });
  }

  console.log();
  console.log('=== 5.16 数据文件类型安全与损坏隔离（R7 回归）===');
  fs.rmSync('.notify-test-dataA', { recursive: true, force: true });
  {
    const dirA = '.notify-test-dataA';
    fs.mkdirSync(dirA, { recursive: true });
    // R7-1：合法 JSON 但类型不对（对象/标量）→ 不抛错，回退为空数组/默认对象
    fs.writeFileSync(dirA + '/billGroups.json', '{"a":1}');
    fs.writeFileSync(dirA + '/mycards.json', 'null');
    fs.writeFileSync(dirA + '/settings.json', '[1,2]');
    const sA = new Store(dirA);
    check('对象型数组文件 → readArray 返回 []', Array.isArray(sA.readArray('billGroups')) && sA.readArray('billGroups').length === 0, JSON.stringify(sA.readArray('billGroups')));
    check('null 型数组文件 → readArray 返回 []', Array.isArray(sA.readArray('mycards')), JSON.stringify(sA.readArray('mycards')));
    check('数组型配置对象 → readObject 回退默认', JSON.stringify(sA.readObject('settings', {})) === '{}', JSON.stringify(sA.readObject('settings', {})));
    // 数组类文件（billGroups/mycards）类型不符会隔离并告警；配置类（settings）只回退不隔离（配置可重建）
    check('数组类类型异常会累计告警', sA.warnings.length >= 2, JSON.stringify(sA.warnings));
    check('配置类类型异常不隔离文件（可重建）', fs.existsSync(dirA + '/settings.json') && JSON.stringify(sA.readObject('settings', {})) === '{}', JSON.stringify(fs.readdirSync(dirA)));
    // R7-2：语法损坏的 JSON → 隔离为 .bad-* 而非静默回退（防后续写入永久覆盖）
    fs.writeFileSync(dirA + '/cards.json', '{ 坏掉的 JSON ');
    const sB = new Store(dirA);
    const arr = sB.readArray('cards');
    const isolated = fs.readdirSync(dirA).filter((f) => f.startsWith('cards.json.bad-'));
    check('语法损坏 → 回退空数组且不抛错', Array.isArray(arr) && arr.length === 0, JSON.stringify(arr));
    check('语法损坏 → 原文件被隔离为 .bad-*', isolated.length === 1, JSON.stringify(fs.readdirSync(dirA)));
    check('隔离后原文件名已被移走', !fs.existsSync(dirA + '/cards.json'));
    check('隔离会记录告警', sB.warnings.some((w) => /cards\.json/.test(w)), JSON.stringify(sB.warnings));
    fs.rmSync(dirA, { recursive: true, force: true });
  }

  console.log();
  console.log('=== 5.17 sentLog 淘汰（R7 回归）===');
  {
    const cfgS = reminder.normalizeConfig({ rules: { repayBeforeDays: 0, taskRemainDays: 0, feeDays: [] } });
    // 造 400 条 400 天前的旧记录 + 1 条近期记录；超过 200 条阈值才会触发清理
    const nowS = new Date(2027, 0, 1);
    const oldDay = new Date(nowS.getTime() - 400 * 86400000);
    const oldStr = oldDay.getFullYear() + '-' + String(oldDay.getMonth() + 1).padStart(2, '0') + '-' + String(oldDay.getDate()).padStart(2, '0');
    for (let i = 0; i < 400; i++) cfgS.sentLog['old:' + i] = oldStr;
    cfgS.sentLog['recent:1'] = '2027-01-01';
    await reminder.runChecks([], cfgS, notifier, nowS, []); // 无提醒项，但会执行 pruneSentLog
    const keys = Object.keys(cfgS.sentLog);
    check('400 天前的旧记录被清理', keys.filter((k) => /^old:/.test(k)).length === 0, '剩余 ' + keys.length);
    check('近期记录被保留', keys.includes('recent:1'), JSON.stringify(keys));
    // 阈值以下（<=200）不做全量扫描，记录原样保留
    const cfgSm = reminder.normalizeConfig({ rules: { repayBeforeDays: 0, taskRemainDays: 0, feeDays: [] } });
    for (let i = 0; i < 50; i++) cfgSm.sentLog['k:' + i] = oldStr;
    await reminder.runChecks([], cfgSm, notifier, nowS, []);
    check('小规模 sentLog 不做清理（跳过全量扫描）', Object.keys(cfgSm.sentLog).length === 50, String(Object.keys(cfgSm.sentLog).length));
    // 值格式异常（非日期）也会被清掉
    const cfgBad = reminder.normalizeConfig({ rules: { repayBeforeDays: 0, taskRemainDays: 0, feeDays: [] } });
    for (let i = 0; i < 250; i++) cfgBad.sentLog['x:' + i] = oldStr;
    cfgBad.sentLog['weird'] = 'not-a-date';
    await reminder.runChecks([], cfgBad, notifier, nowS, []);
    check('格式异常的 sentLog 值被清理', !('weird' in cfgBad.sentLog), JSON.stringify(Object.keys(cfgBad.sentLog).slice(0, 5)));
  }

  console.log();
  console.log('=== 5.18 全通道失败不写 sentLog + 连续失败计数（NOTE-1 回归）===');
  {
    // 失败手段：把 wecom 的端点 env 指到一个不存在的端口（连接拒绝 → 确定失败）。
    // 不能用 bark 的 server 字段——NOTIFY_BARK_URL env 优先级高于 cfg.server，会被主 mock 压制。
    const savedWecomUrl = process.env.NOTIFY_WECOM_URL;
    process.env.NOTIFY_WECOM_URL = 'http://127.0.0.1:1/wecom/webhook/send'; // port 1 必拒
    const failCfg = reminder.normalizeConfig({ enabled: true, channels: { wecom: { enabled: true, webhookKey: 'k' } } });
    const failCard = { id: 'mc_fail', bank: '测试', name: '失败卡', annualFee: 3600, feeDays: 5, nextFeeDate: '2027-03-15', waiver: { needsPayment: true, kind: '刚性' } };
    const failNow = new Date(2026, 9, 12);
    const failD = require('../server/dates');
    failCard.payment = failD.paymentInfo(Object.assign({}, failCard, { billingDay: 1, repayMode: 'fixed', repayValue: 20, graceDays: 0, monthlySpendTarget: 0 }), failNow);

    const r1 = await reminder.runChecks([failCard], failCfg, notifier, failNow, []);
    check('第 1 轮全失败：推送 0 项', r1.sent === 0, JSON.stringify(r1.results));
    check('第 1 轮：不写 sentLog', !('fee:mc_fail:2027-03-15:7' in failCfg.sentLog), JSON.stringify(failCfg.sentLog));
    check('第 1 轮：失败计数 = 1', failCfg.sentFail['fee:mc_fail:2027-03-15:7'] === 1, JSON.stringify(failCfg.sentFail));

    const r2f = await reminder.runChecks([failCard], failCfg, notifier, failNow, []);
    check('第 2 轮：失败项仍重试（未写 sentLog）', r2f.checked > 0 && r2f.sent === 0, JSON.stringify(r2f.results));
    check('第 2 轮：失败计数 = 2', failCfg.sentFail['fee:mc_fail:2027-03-15:7'] === 2, JSON.stringify(failCfg.sentFail));

    const r3f = await reminder.runChecks([failCard], failCfg, notifier, failNow, []);
    check('第 3 轮：达上限后写 sentLog 停止重发', 'fee:mc_fail:2027-03-15:7' in failCfg.sentLog, JSON.stringify(failCfg.sentLog));
    check('第 3 轮：计数清零', !('fee:mc_fail:2027-03-15:7' in failCfg.sentFail), JSON.stringify(failCfg.sentFail));

    const r4f = await reminder.runChecks([failCard], failCfg, notifier, failNow, []);
    check('第 4 轮：已标记不再推送', r4f.sent === 0 && !r4f.results.some((x) => x.key === 'fee:mc_fail:2027-03-15:7'), JSON.stringify(r4f.results));

    // 恢复路径：端点修好（指回成功 mock），预置脏计数 → 推送成功即清计数
    process.env.NOTIFY_WECOM_URL = savedWecomUrl;
    const okCfg = reminder.normalizeConfig({ enabled: true, channels: { wecom: { enabled: true, webhookKey: 'k' } } });
    okCfg.sentFail['fee:mc_fail:2027-03-15:7'] = 2;
    const rOk = await reminder.runChecks([failCard], okCfg, notifier, failNow, []);
    check('通道恢复后推送成功', rOk.sent > 0, JSON.stringify(rOk.results));
    check('成功后计数被清零', !('fee:mc_fail:2027-03-15:7' in okCfg.sentFail), JSON.stringify(okCfg.sentFail));
  }

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
  const passed = total - failures;
  console.log(failures === 0
    ? '========== 提醒功能测试全部通过（' + passed + '/' + total + ' 项）=========='
    : '========== 失败 ' + failures + ' 项（通过 ' + passed + '/' + total + '）==========');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('测试异常:', e); process.exit(1); });
