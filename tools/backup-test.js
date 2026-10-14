'use strict';
/* 持卡备份导入导出专项测试
 * 用法: node tools/backup-test.js
 * 覆盖：导出结构完整性 / merge 导入 / replace 导入 / 卡种自动建库 /
 *       id 撞车 / 非法字段防御 / 组还款节奏校验 / 账单去重 / 恶意输入
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3987;
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = path.join(__dirname, '..', '.backup-test-data');

let failures = 0;
let total = 0;
function check(name, cond, extra) {
  total++;
  console.log((cond ? '  ✅ ' : '  ❌ ') + name + (cond ? '' : '  → ' + String(extra).slice(0, 200)));
  if (!cond) failures++;
}

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request(BASE + p, {
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) {}
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    const child = spawn(process.execPath, ['server/index.js'], {
      env: { ...process.env, PORT: String(PORT), DATA_DIR, HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    const deadline = Date.now() + 10000;
    const poll = async () => {
      while (Date.now() < deadline) {
        try {
          await req('GET', '/api/health');
          return resolve(child);
        } catch (e) { await new Promise((r) => setTimeout(r, 200)); }
      }
      reject(new Error('服务启动超时: ' + out.slice(-500)));
    };
    poll();
    child.exitInfo = out;
    return;
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.on('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} resolve(); }, 2000);
  });
}

// —— 构造一份合理的备份 ——
function makeBackup(over) {
  return Object.assign({
    schema: 'guanka-backup',
    version: 1,
    exportedAt: '2026-10-14T08:00:00.000Z',
    cardTypes: [{
      id: 'ct-1', bank: '招商银行', name: '经典白', level: '白金卡', org: '银联',
      annualFee: 3600, waiverType: '扣年费', waiverCondition: '10000', waiverPolicy: '满额免',
      startCredit: 50000, benefits: ['机场贵宾厅', '酒店权益'], applyCondition: '', note: '',
    }],
    myCards: [{
      id: 'mc-1', cardId: 'ct-1', bank: '招商银行', name: '经典白', org: '银联', level: '白金卡',
      annualFee: 3600, waiverType: '扣年费', waiverCondition: '10000', waiverPolicy: '满额免',
      alias: '我的招行白', creditLimit: 80000, billingDay: 5, repaymentDay: 23, repayMode: 'fixed', repayValue: 23,
      graceDays: 3, waivedYear: 0, countPeriodYear: 0, maxInterestDays: 50,
      feeMonth: 3, feeDay: 15, last4: '1234', monthlySpendTarget: 10000,
      benefits: [{ id: 'ben-1', name: '机场贵宾厅', type: '次数', total: 6, resetCycle: '自然年', validUntil: '' }],
      pointsDeducted: false, pointsDeductDate: null,
      assetWaived: false, assetWaivedDate: null, billGroupId: '', createdAt: '2026-01-01T00:00:00.000Z',
    }],
    consumptions: [{
      id: 'cons-1', myCardId: 'mc-1', type: 'amount', date: '2026-10-01',
      amount: 1234.5, count: 0, channel: '微信支付', category: '餐饮', note: '测试', createdAt: '2026-10-01T00:00:00.000Z',
    }],
    benefitRecords: [{
      id: 'br-1', myCardId: 'mc-1', idx: 0, bid: 'ben-1', type: 'usage',
      date: '2026-10-02', count: 1, note: '', createdAt: '2026-10-02T00:00:00.000Z',
    }],
    billGroups: [],
    bills: [{
      id: 'bill-1', myCardId: 'mc-1', month: '2026-09', amount: 5000, dueDate: '2026-09-23',
      paid: '未还', paidDate: '', note: '', createdAt: '2026-09-23T00:00:00.000Z',
    }],
  }, over || {});
}

async function main() {
  console.log('=== 持卡备份导入导出专项测试 ===\n');
  const child = await startServer();

  try {
    // ---- 1. 空库导出 ----
    console.log('--- 1. 空库导出 ---');
    {
      const r = await req('GET', '/api/mycards/export');
      check('导出返回 200', r.status === 200, r.status + ' ' + r.text.slice(0, 120));
      check('Content-Disposition 带 guanka-backup 文件名', /guanka-backup-\d{4}-\d{2}-\d{2}\.json/.test(r.headers['content-disposition'] || ''), r.headers['content-disposition']);
      check('空库 schema 正确', r.json && r.json.schema === 'guanka-backup', JSON.stringify(r.json).slice(0, 100));
      check('空库 myCards 为数组', r.json && Array.isArray(r.json.myCards) && r.json.myCards.length === 0, JSON.stringify(r.json && r.json.myCards));
    }

    // ---- 2. 建一条真实数据再导出，验证结构完整 ----
    console.log('--- 2. 建卡→导出→结构校验 ---');
    let realBackup = null;
    {
      const cr = await req('POST', '/api/cards', { bank: '工商银行', name: '牡丹超惠', level: '金卡', org: '银联', annualFee: 200, waiverType: '刷满免', waiverCondition: '5万', startCredit: 30000, benefits: '加油返现|视频会员' });
      check('建卡种成功', (cr.status === 200 || cr.status === 201) && cr.json.id, cr.text.slice(0, 150));
      const mr = await req('POST', '/api/mycards', { cardId: cr.json.id, alias: '工行牡丹', creditLimit: '3万', billingDay: 1, repaymentDay: 25, feeMonth: 6, feeDay: 1, monthlySpendTarget: 5000, benefits: [{ name: '加油返现', type: '金额', total: 2400, resetCycle: '自然年' }] });
      check('添加持卡成功', (mr.status === 200 || mr.status === 201) && mr.json.id, mr.text.slice(0, 150));
      const myId = mr.json.id;
      // 记一笔消费 + 权益使用 + 账单（权益按索引走 /benefits/N/usage；账单走 /api/bills）
      await req('POST', '/api/mycards/' + myId + '/consumptions', { type: 'amount', date: '2026-10-10', amount: '888', channel: '支付宝支付', category: '购物' });
      await req('POST', '/api/mycards/' + myId + '/benefits/0/usage', { count: 1, note: '加油一次' });
      await req('POST', '/api/bills', { myCardId: myId, month: '2026-10', amount: '888' });

      const er = await req('GET', '/api/mycards/export');
      realBackup = er.json;
      check('导出含 1 张持卡', realBackup.myCards.length === 1, realBackup.myCards.length);
      check('导出含 1 条消费', realBackup.consumptions.length === 1, realBackup.consumptions.length);
      check('导出含 1 条权益记录', realBackup.benefitRecords.length === 1, realBackup.benefitRecords.length);
      check('导出含 1 条账单', realBackup.bills.length === 1, realBackup.bills.length);
      check('导出卡种被引用过滤（只含牡丹超惠）', realBackup.cardTypes.length === 1 && realBackup.cardTypes[0].name === '牡丹超惠', JSON.stringify(realBackup.cardTypes.map((c) => c.name)));
      check('权益有稳定 id', !!(realBackup.myCards[0].benefits[0] || {}).id, JSON.stringify(realBackup.myCards[0].benefits));
    }

    // ---- 3. merge 导入：幂等 ----
    console.log('--- 3. merge 模式：同份备份重复导入（幂等） ---');
    {
      const r = await req('POST', '/api/mycards/import', { data: realBackup, mode: 'merge' });
      check('导入返回 200', r.status === 200, r.text.slice(0, 200));
      check('同 id 持卡被去重跳过', r.json.dedupedCards === 1 && r.json.importedCards === 0, JSON.stringify(r.json));
      check('记录也全部跳过（消费/权益/账单=0）', r.json.consumptions === 0 && r.json.benefitRecords === 0 && r.json.bills === 0, JSON.stringify(r.json));
      const wrap = (await req('GET', '/api/mycards')).json;
      check('merge 后持卡仍 1 张（无重复）', wrap.data.length === 1, wrap.data.length);
      check('stats 接口正常（无 500）', !!wrap.stats, '');
    }

    // ---- 4. replace 导入到另一份备份（覆盖语义） ----
    console.log('--- 4. replace 模式：覆盖导入 ---');
    {
      const backup2 = makeBackup();
      const r = await req('POST', '/api/mycards/import', { data: backup2, mode: 'replace' });
      check('replace 返回 200', r.status === 200 && r.json.ok, r.text.slice(0, 200));
      check('自动建卡种 1 个', r.json.cardTypesAdded === 1, JSON.stringify(r.json));
      const wrap = (await req('GET', '/api/mycards')).json;
      check('replace 后恰好 1 张（旧数据清空）', wrap.data.length === 1, wrap.data.length);
      check('持卡别名正确', wrap.data[0].alias === '我的招行白', wrap.data[0].alias);
      check('额度数值正确（80000）', wrap.data[0].creditLimit === 80000, wrap.data[0].creditLimit);
      const cards = (await req('GET', '/api/cards')).json;
      check('卡种库自动补入经典白', (cards.data || cards).some((c) => c.name === '经典白'), JSON.stringify((cards.data || cards).map((c) => c.name)));
    }

    // ---- 5. 消费/权益/账单归属迁移 ----
    console.log('--- 5. 记录外键归属 ---');
    {
      const wrap = (await req('GET', '/api/mycards')).json;
      const mc = wrap.data[0];
      check('备份消费记录跟随迁移（本月消费 1234.5）', mc.monthSpend === 1234.5, mc.monthSpend);
      check('权益使用跟随迁移（已用 1 次）', (mc.benefits[0].used || 0) === 1, JSON.stringify(mc.benefits[0]));
    }

    // ---- 6. 防御性校验 ----
    console.log('--- 6. 防御性校验 ---');
    {
      let r = await req('POST', '/api/mycards/import', { data: { foo: 1 }, mode: 'merge' });
      check('缺 schema 拒绝', r.status === 400 && /schema/.test(r.json.error), r.text.slice(0, 100));
      r = await req('POST', '/api/mycards/import', { data: { schema: 'guanka-backup', myCards: 'not-array' }, mode: 'merge' });
      check('myCards 非数组拒绝', r.status === 400, r.text.slice(0, 100));
      r = await req('POST', '/api/mycards/import', { data: makeBackup({ myCards: [] }), mode: 'merge' });
      check('无可导入持卡拒绝', r.status === 400 && /可导入/.test(r.json.error), r.text.slice(0, 120));
      // 恶意字段注入：额度负数、billingDay 越界、last4 注入非数字、benefits 非法对象
      const evil = makeBackup({
        myCards: [{
          id: 'mc-evil', cardId: 'ct-1', bank: '招商银行', name: '经典白', org: '银联', level: '白金卡',
          annualFee: 3600, waiverType: '扣年费', waiverCondition: '10000', waiverPolicy: '',
          alias: '<script>alert(1)</script>', creditLimit: -5, billingDay: 99, repaymentDay: -3, repayMode: 'x',
          graceDays: 9999, maxInterestDays: -1, feeMonth: 13, feeDay: 32, last4: '<img src=x>', monthlySpendTarget: -100,
          benefits: [{ name: '<b>粗体</b>', type: '不存在类型', total: 'abc', resetCycle: '周' }],
          pointsDeducted: 'yes', assetWaived: 1,
        }],
      });
      r = await req('POST', '/api/mycards/import', { data: evil, mode: 'replace' });
      check('恶意备份仍可导入（防御归一）', r.status === 200, r.text.slice(0, 150));
      const wrap = (await req('GET', '/api/mycards')).json;
      const mc = wrap.data[0];
      check('负额度归一为默认值', mc.creditLimit >= 0, mc.creditLimit);
      check('billingDay 越界钳制', mc.billingDay >= 1 && mc.billingDay <= 31, mc.billingDay);
      check('repaymentDay 钳制', mc.repaymentDay >= 1 && mc.repaymentDay <= 31, mc.repaymentDay);
      check('feeMonth 钳制 12', mc.feeMonth === 12, mc.feeMonth);
      check('feeDay 钳制到月末', mc.feeDay >= 1 && mc.feeDay <= 31, mc.feeDay);
      check('last4 只留数字', /^\d{0,4}$/.test(mc.last4), mc.last4);
      check('graceDays 钳制 ≤30', mc.graceDays <= 30, mc.graceDays);
      check('布尔字段强制转换', typeof mc.pointsDeducted === 'boolean' && typeof mc.assetWaived === 'boolean', JSON.stringify([mc.pointsDeducted, mc.assetWaived]));
      // 卡种匹配失败
      const orphan = makeBackup({ myCards: [{ id: 'mc-x', cardId: 'not-exist', bank: ' nonexistent', name: '', org: '', level: '' }] });
      r = await req('POST', '/api/mycards/import', { data: orphan, mode: 'replace' });
      check('卡种全空的持卡被跳过/拒绝', r.status === 400 || r.json.skippedCards > 0, r.text.slice(0, 120));
    }

    // ---- 7. 账单组迁移 + 节奏校验 ----
    console.log('--- 7. 账单组 ---');
    {
      // 重建干净数据：两张同卡种（同还款日）+ 一张异卡种不同还款日
      const backup3 = makeBackup();
      backup3.myCards.push(Object.assign({}, backup3.myCards[0], { id: 'mc-2', alias: '附属卡', billGroupId: 'grp-1' }));
      backup3.myCards[0].billGroupId = 'grp-1';
      backup3.billGroups = [{ id: 'grp-1', name: '招行合并组', createdAt: '2026-01-01T00:00:00.000Z' }];
      let r = await req('POST', '/api/mycards/import', { data: backup3, mode: 'replace' });
      check('带组备份导入成功', r.status === 200 && r.json.billGroups === 1, r.text.slice(0, 200));
      let wrap = (await req('GET', '/api/mycards')).json;
      let list = wrap.data;
      check('两张卡都在同一组', list.every((m) => m.billGroupId), JSON.stringify(list.map((m) => [m.alias, m.billGroupId])));
      // 异节奏组员：fixed 模式还款节奏由 repayValue 驱动，改 repayValue=5（卡 A 是 23）
      const backup4 = makeBackup();
      backup4.myCards.push(Object.assign({}, backup4.myCards[0], { id: 'mc-3', alias: '节奏不同', repayValue: 5, billGroupId: 'grp-2' }));
      backup4.myCards[0].billGroupId = 'grp-2';
      backup4.billGroups = [{ id: 'grp-2', name: '混合组', createdAt: '2026-01-01T00:00:00.000Z' }];
      r = await req('POST', '/api/mycards/import', { data: backup4, mode: 'replace' });
      check('异节奏导入有告警', r.status === 200 && (r.json.groupWarnings || []).length === 1, JSON.stringify(r.json && r.json.groupWarnings));
      list = (await req('GET', '/api/mycards')).json.data;
      const odd = list.find((m) => m.alias === '节奏不同');
      check('异节奏成员已移出组', odd && !odd.billGroupId, odd && odd.billGroupId);
    }

    // ---- 8. 账单去重 + merge 新卡（不同 id 的新备份应正常追加） ----
    console.log('--- 8. 账单去重与 merge 追加 ---');
    {
      // 当前库：backup4 覆盖导入后 mc-1 有 2026-09 账单；再 merge 同份 again（mc-1 已存在 → 全跳过）
      const again = makeBackup();
      again.myCards[0].billGroupId = '';
      const r = await req('POST', '/api/mycards/import', { data: again, mode: 'merge' });
      check('merge 导入成功', r.status === 200 && r.json.importedCards === 0 && r.json.dedupedCards === 1, JSON.stringify(r.json));
      check('同月账单被跳过', r.json.bills === 0, r.json.bills);
      // 换新 id 的备份 → 应作为新卡追加，账单外键同步指向新 id
      const fresh = makeBackup();
      fresh.myCards[0].id = 'mc-fresh';
      fresh.myCards[0].alias = '新卡';
      fresh.bills[0].myCardId = 'mc-fresh';
      const r2 = await req('POST', '/api/mycards/import', { data: fresh, mode: 'merge' });
      check('新 id 卡正常追加', r2.status === 200 && r2.json.importedCards === 1, JSON.stringify(r2.json));
      check('新卡账单正常导入', r2.json.bills === 1, r2.json.bills);
      const wrap = (await req('GET', '/api/mycards')).json;
      check('merge 后共 3 张卡（backup4 两张 + 新卡）', wrap.data.length === 3, wrap.data.length);
    }

    // ---- 9. 回归补测：账单 id 撞车 / 0 元消费拦截 / 组解散 ----
    console.log('--- 9. 修复回归补测 ---');
    {
      // 9a. merge 新卡但备份账单 id 与库中已有账单相同 → 不产生重复主键
      const clash = makeBackup();
      clash.myCards[0].id = 'mc-clash';
      clash.bills[0].id = 'bill-1'; // 库中 mc-fresh 的账单已占用 bill-1
      clash.bills[0].myCardId = 'mc-clash';
      clash.bills[0].month = '2026-08'; // 避开 (卡,月) 去重，专测 id 撞车
      const r = await req('POST', '/api/mycards/import', { data: clash, mode: 'merge' });
      check('账单 id 撞车时 merge 导入成功', r.status === 200 && r.json.importedCards === 1 && r.json.bills === 1, JSON.stringify(r.json));
      // 全库账单 id 唯一
      const ex = await req('GET', '/api/mycards/export');
      const ids = ex.json.bills.map((x) => x.id);
      check('全库账单 id 无重复', new Set(ids).size === ids.length, JSON.stringify(ids));

      // 9b. amount 型 0 元/负数消费被拦截，count 型豁免
      const zero = makeBackup({ myCards: [Object.assign({}, makeBackup().myCards[0], { id: 'mc-zero', billGroupId: '' })] });
      zero.cardTypes = makeBackup().cardTypes;
      zero.consumptions = [
        { id: 'zc-1', myCardId: 'mc-zero', type: 'amount', date: '2026-10-01', amount: 0, channel: '微信支付', category: '餐饮' },
        { id: 'zc-2', myCardId: 'mc-zero', type: 'amount', date: '2026-10-02', amount: -5, channel: '微信支付', category: '餐饮' },
        { id: 'zc-3', myCardId: 'mc-zero', type: 'count', date: '2026-10-03', amount: 0, count: 3, channel: '微信支付', category: '餐饮' },
      ];
      const r2 = await req('POST', '/api/mycards/import', { data: zero, mode: 'replace' });
      check('0 元备份导入成功', r2.status === 200, r2.text.slice(0, 150));
      check('amount 型 0/负数消费被拦截（剩 count 1 条）', r2.json.consumptions === 1, r2.json.consumptions);

      // 9c. merge 后组只剩 1 个成员 → 组解散（不残留孤儿组）
      // 当前库：mc-zero 单卡无组。构造：mc-zero 与新卡 mc-grp 同组，导入后手动删掉一张卡再 merge 同组备份
      // 更直接：先 replace 两卡同组，再 delete 一张，验证 cleanBillGroups 已有逻辑不受影响；
      // 这里测导入场景：备份组里 2 张卡，其中 1 张卡种匹配失败被跳过 → 剩 1 张 → 组应解散
      const half = makeBackup();
      half.myCards = [
        Object.assign({}, makeBackup().myCards[0], { id: 'mc-h1', alias: '组员甲', billGroupId: 'grp-h' }),
        Object.assign({}, makeBackup().myCards[0], { id: 'mc-h2', alias: '组员乙', cardId: 'ghost-card', billGroupId: 'grp-h' }),
      ];
      half.bills = [];
      half.billGroups = [{ id: 'grp-h', name: '孤儿组', createdAt: '2026-01-01T00:00:00.000Z' }];
      const r3 = await req('POST', '/api/mycards/import', { data: half, mode: 'replace' });
      check('半数成员匹配失败仍导入 1 张', r3.status === 200 && r3.json.importedCards === 1, JSON.stringify(r3.json));
      const wrap3 = (await req('GET', '/api/mycards')).json;
      check('只剩 1 名成员的组已解散', wrap3.billGroups.length === 0, JSON.stringify(wrap3.billGroups));
      const h1 = wrap3.data.find((m) => m.id === 'mc-h1');
      check('组员甲组引用已清空', h1 && !h1.billGroupId, h1 && h1.billGroupId);
    }

  } finally {
    await stopServer(child);
  }

  console.log('\n=== 结果: ' + (total - failures) + '/' + total + ' 通过' + (failures ? ' ❌ ' + failures + ' 失败' : ' ✅') + ' ===');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('测试异常:', e); process.exit(1); });
