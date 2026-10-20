'use strict';
/* QA 端到端验证：账单→消费联动（刷免达标）修复
 * 独立临时 DATA_DIR 起真实服务器，验证清单 a-f + 备份链路。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3777;
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-qa-'));

let passed = 0, failed = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; failures.push(msg); console.error('  FAIL ' + msg); }
}
function eq(actual, expect, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expect);
  ok(a === e, msg + (a === e ? '' : '（actual=' + a + ' expect=' + e + '）'));
}

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : Buffer.from(JSON.stringify(body));
    const r = http.request(BASE + p, {
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {},
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(buf); } catch (_) { /* 非 JSON */ }
        resolve({ status: res.statusCode, body: j, raw: buf });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // ---- 启动服务器（独立数据目录）----
  const srv = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    env: { ...process.env, DATA_DIR, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', () => {});
  srv.stderr.on('data', (c) => process.stderr.write('[srv] ' + c));
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    await sleep(200);
    try { await req('GET', '/api/health'); up = true; } catch (_) { /* retry */ }
  }
  if (!up) throw new Error('服务器启动失败');
  console.log('服务器已启动（DATA_DIR=' + DATA_DIR + '）');

  try {
    const Y = new Date().getFullYear();

    // ---- 准备卡种 + 持卡 ----
    // 卡A：消费刷免 3万，feeMonth/feeDay 设为当前月之前（卡年窗口覆盖今天 2026-10-20）
    // 卡B：消费刷免 3万，feeMonth=1/feeDay=1（跨年边界用：账单月份设为去年）
    const card = await req('POST', '/api/cards', {
      bank: '测试银行', name: '联动测试卡', level: '金卡', org: '银联',
      annualFee: 300, waiverType: '消费刷免', waiverCondition: '3万',
    });
    eq(card.status, 201, '准备：创建卡种');
    const cardIdA = card.body.id;

    const cardB = await req('POST', '/api/cards', {
      bank: '测试银行', name: '跨年测试卡', level: '金卡', org: '银联',
      annualFee: 300, waiverType: '消费刷免', waiverCondition: '3万',
    });
    eq(cardB.status, 201, '准备：创建跨年卡种');
    const cardIdB = cardB.body.id;

    const mcA = await req('POST', '/api/mycards', { cardId: cardIdA, feeMonth: 3, feeDay: 1, alias: '卡A' });
    eq(mcA.status, 201, '准备：创建持卡A（feeMonth=3，卡年起点 2026-03-01，覆盖今天）');
    const idA = mcA.body.id;

    const mcB = await req('POST', '/api/mycards', { cardId: cardIdB, feeMonth: 1, feeDay: 1, alias: '卡B' });
    eq(mcB.status, 201, '准备：创建持卡B（feeMonth=1，卡年起点 2026-01-01）');
    const idB = mcB.body.id;

    // ---- 场景 a：基础联动 ----
    console.log('\n== 场景 a：POST /api/bills 带 countAsSpend → 镜像消费 + 达标 ==');
    let r = await req('POST', '/api/bills', {
      myCardId: idA, month: '2026-10', amount: 30000, countAsSpend: true,
    });
    eq(r.status, 201, 'a1: 创建账单带 countAsSpend');
    const billA = r.body;
    let mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.met, true, 'a2: waiver.met=true');
    eq(mc.waiver.progress, 30000, 'a3: progress=30000');
    eq(mc.feeStatus, '已达标(自动)', 'a4: feeStatus=已达标(自动)');
    const cons = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    const mirror = cons.filter((x) => x.fromBill === billA.id);
    eq(mirror.length, 1, 'a5: 恰好 1 条镜像消费');
    if (mirror.length === 1) {
      eq(mirror[0].amount, 30000, 'a6: 镜像金额=30000');
      eq(mirror[0].date, '2026-10-31', 'a7: 镜像 date=账单月末 2026-10-31');
      eq(mirror[0].channel, '其他', 'a8: channel=其他');
      eq(mirror[0].category, '其他', 'a9: category=其他');
      ok(mirror[0].countAsSpend === undefined || mirror[0].countAsSpend == null || mirror[0].countAsSpend === true,
        'a10: 镜像消费无非法 countAsSpend 值');
    }

    // ---- 场景 b：跨年边界 ----
    console.log('\n== 场景 b：跨年边界（账单月份落在上一卡年）==');
    // 卡B feeMonth=1/feeDay=1 → 本卡年起点 2026-01-01。去年账单 2025-12 → 镜像 date=2025-12-31，属上一卡年。
    r = await req('POST', '/api/bills', {
      myCardId: idB, month: '2025-12', amount: 30000, countAsSpend: true,
    });
    eq(r.status, 201, 'b1: 创建去年账单带 countAsSpend');
    const billB = r.body;
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idB);
    eq(mc.waiver.progress, 0, 'b2: 本卡年进度不受去年账单影响（progress=0）');
    eq(mc.waiver.met, false, 'b3: 本卡年未达标');
    let consB = (await req('GET', '/api/mycards/' + idB + '/consumptions')).body.records;
    const mirrorB = consB.filter((x) => x.fromBill === billB.id);
    eq(mirrorB.length, 1, 'b4: 去年账单镜像存在');
    if (mirrorB.length === 1) eq(mirrorB[0].date, '2025-12-31', 'b5: 镜像 date=2025-12-31（上一卡年窗口内）');

    // 反向边界：本卡年内 1 月账单 → 计入
    r = await req('POST', '/api/bills', {
      myCardId: idB, month: '2026-01', amount: 30000, countAsSpend: true,
    });
    eq(r.status, 201, 'b6: 创建本卡年 1 月账单');
    const billB2 = r.body;
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idB);
    eq(mc.waiver.progress, 30000, 'b7: 本卡年 1 月账单计入（progress=30000）');
    eq(mc.waiver.met, true, 'b8: 本卡年达标');

    // ---- 场景 c：重复 PUT 相同金额 → 镜像不重复累计 ----
    console.log('\n== 场景 c：同一账单重复 PUT ==');
    for (let k = 0; k < 3; k++) {
      r = await req('PUT', '/api/bills/' + billA.id, { amount: 30000 });
      eq(r.status, 200, 'c' + (k + 1) + ': PUT 相同金额 30000');
    }
    let consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA.id).length, 1, 'c4: 镜像仍为 1 条');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 30000, 'c5: progress 仍=30000（不重复累计）');

    // 改额：30000 → 20000 → 镜像同步
    r = await req('PUT', '/api/bills/' + billA.id, { amount: 20000 });
    eq(r.status, 200, 'c6: 改额 20000');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    const mA = consA.filter((x) => x.fromBill === billA.id);
    eq(mA.length, 1, 'c7: 改额后镜像仍 1 条');
    if (mA.length === 1) eq(mA[0].amount, 20000, 'c8: 镜像金额同步为 20000');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 20000, 'c9: progress 同步 20000');

    // ---- 场景 d：多账单独立 + 删除不误删 ----
    console.log('\n== 场景 d：多月多账单联动独立性 ==');
    r = await req('POST', '/api/bills', { myCardId: idA, month: '2026-09', amount: 5000, countAsSpend: true });
    eq(r.status, 201, 'd1: 创建第二张账单 2026-09');
    const billA2 = r.body;
    r = await req('POST', '/api/bills', { myCardId: idA, month: '2026-08', amount: 6000, countAsSpend: true });
    eq(r.status, 201, 'd2: 创建第三张账单 2026-08');
    const billA3 = r.body;
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA.id).length, 1, 'd3: 账单1镜像独立');
    eq(consA.filter((x) => x.fromBill === billA2.id).length, 1, 'd4: 账单2镜像独立');
    eq(consA.filter((x) => x.fromBill === billA3.id).length, 1, 'd5: 账单3镜像独立');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 20000 + 5000 + 6000, 'd6: progress=三张账单合计 31000');
    // 删除 2026-09（5000），其余不动
    r = await req('DELETE', '/api/bills/' + billA2.id);
    eq(r.status, 200, 'd7: 删除 2026-09 账单');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA2.id).length, 0, 'd8: 被删账单镜像已清');
    eq(consA.filter((x) => x.fromBill === billA.id).length, 1, 'd9: 账单1镜像保留');
    eq(consA.filter((x) => x.fromBill === billA3.id).length, 1, 'd10: 账单3镜像保留');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 20000 + 6000, 'd11: progress=26000');

    // ---- 场景 e：POST 不带 countAsSpend → 无镜像 ----
    console.log('\n== 场景 e：不传 countAsSpend（旧调用兼容）==');
    r = await req('POST', '/api/bills', { myCardId: idA, month: '2026-07', amount: 9999 });
    eq(r.status, 201, 'e1: 不带 countAsSpend 创建成功');
    const billA4 = r.body;
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA4.id).length, 0, 'e2: 无镜像');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 26000, 'e3: 进度不变');

    // e4: countAsSpend 显式 false 也不建镜像
    r = await req('POST', '/api/bills', { myCardId: idA, month: '2026-06', amount: 1, countAsSpend: false });
    eq(r.status, 201, 'e4: 显式 countAsSpend=false 创建成功');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === r.body.id).length, 0, 'e5: countAsSpend=false 无镜像');

    // e6: PUT 显式开启联动（旧账单补联动）
    r = await req('PUT', '/api/bills/' + billA4.id, { countAsSpend: true });
    eq(r.status, 200, 'e6: PUT 开启联动');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA4.id).length, 1, 'e7: 补联动后镜像出现');

    // e8: PUT 关联动 → 镜像移除
    r = await req('PUT', '/api/bills/' + billA4.id, { countAsSpend: false });
    eq(r.status, 200, 'e8: PUT 关联动');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    eq(consA.filter((x) => x.fromBill === billA4.id).length, 0, 'e9: 关联动镜像移除');

    // ---- 场景 f：金额 0 → 镜像移除且 met=false ----
    console.log('\n== 场景 f：联动后金额改 0 ==');
    // 用卡B的 2026-01 账单（当前已达标）改额为 0
    r = await req('PUT', '/api/bills/' + billB2.id, { amount: 0 });
    eq(r.status, 200, 'f1: 改额为 0');
    consB = (await req('GET', '/api/mycards/' + idB + '/consumptions')).body.records;
    eq(consB.filter((x) => x.fromBill === billB2.id).length, 0, 'f2: 镜像移除');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idB);
    eq(mc.waiver.met, false, 'f3: met=false');
    eq(mc.waiver.progress, 0, 'f4: progress=0');

    // f5: 归零后再次 PUT 加回金额（联动标记仍保留）→ 镜像重建
    r = await req('PUT', '/api/bills/' + billB2.id, { amount: 30000 });
    eq(r.status, 200, 'f5: 归零后加回 30000');
    consB = (await req('GET', '/api/mycards/' + idB + '/consumptions')).body.records;
    eq(consB.filter((x) => x.fromBill === billB2.id).length, 1, 'f6: 镜像重建');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idB);
    eq(mc.waiver.met, true, 'f7: 重新达标');

    // ---- 场景 g（补充）：消费手动记账与账单联动并存（进度口径）----
    console.log('\n== 场景 g：手动消费 + 账单联动并存 ==');
    // 卡A已有 26000 联动进度；手动记一笔 10000 → 36000 达标
    r = await req('POST', '/api/mycards/' + idA + '/consumptions', { type: 'amount', date: '2026-10-01', amount: 10000, channel: 'POS机刷卡', category: '购物' });
    ok(r.status === 201 || r.status === 200, 'g1: 手动记消费 10000');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 36000, 'g2: 手动+联动合计 36000');
    eq(mc.yearSpend, 36000, 'g3: yearSpend 口径一致');

    // ---- 场景 h：备份 roundtrip（fromBill/countAsSpend 不丢）----
    console.log('\n== 场景 h：备份导出/merge 导入 roundtrip ==');
    const exp = await req('GET', '/api/mycards/export');
    eq(exp.status, 200, 'h1: 导出成功');
    const backup = JSON.parse(exp.raw);
    const srcMirror = backup.consumptions.filter((x) => x.fromBill);
    ok(srcMirror.length >= 3, 'h2: 导出含镜像消费（fromBill 标记在）');
    ok(srcMirror.every((x) => typeof x.fromBill === 'string' && x.fromBill), 'h3: 镜像 fromBill 均有效');
    const srcBills = backup.bills.filter((x) => x.countAsSpend);
    ok(srcBills.length >= 3, 'h4: 导出含联动账单（countAsSpend 标记在）');

    // merge 导入（同实例）：幂等应全部跳过，不产生重复镜像
    const allConsA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    const allConsB = (await req('GET', '/api/mycards/' + idB + '/consumptions')).body.records;
    const beforeCons = allConsA.length + allConsB.length;
    r = await req('POST', '/api/mycards/import', { data: backup, mode: 'merge' });
    eq(r.status, 200, 'h5: merge 导入成功');
    const afterConsA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records.length;
    const afterConsB = (await req('GET', '/api/mycards/' + idB + '/consumptions')).body.records.length;
    eq(afterConsA + afterConsB, beforeCons, 'h6: merge 幂等，无重复镜像');
    mc = (await req('GET', '/api/mycards')).body.data.find((x) => x.id === idA);
    eq(mc.waiver.progress, 36000, 'h7: 导入后进度不变');

    // replace 导入到全新数据线（新起一个临时 DATA_DIR 服务器）验证跨实例标记保留
    const DATA_DIR2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-qa2-'));
    const PORT2 = PORT + 1;
    const srv2 = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
      env: { ...process.env, DATA_DIR: DATA_DIR2, PORT: String(PORT2), HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const BASE2 = 'http://127.0.0.1:' + PORT2;
    const req2 = (method, p, body) => new Promise((resolve, reject) => {
      const data = body == null ? null : Buffer.from(JSON.stringify(body));
      const rq = http.request(BASE2 + p, {
        method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {},
      }, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => { let j = null; try { j = JSON.parse(buf); } catch (_) {} resolve({ status: res.statusCode, body: j, raw: buf }); });
      });
      rq.on('error', reject);
      if (data) rq.write(data);
      rq.end();
    });
    let up2 = false;
    for (let i = 0; i < 50 && !up2; i++) { await sleep(200); try { await req2('GET', '/api/health'); up2 = true; } catch (_) {} }
    if (!up2) throw new Error('第二服务器启动失败');
    try {
      // replace 导入
      const imp = await req2('POST', '/api/mycards/import', { data: backup, mode: 'replace' });
      eq(imp.status, 200, 'h8: 全新实例 replace 导入成功');
      // 期望值从备份内容推导：卡A 在导出时刻的消费记录数（含镜像）
      const srcCardA = backup.myCards.find((x) => x.alias === '卡A');
      const expectConsA = backup.consumptions.filter((x) => x.myCardId === srcCardA.id).length;
      const mcList2 = (await req2('GET', '/api/mycards')).body.data;
      const a2 = mcList2.find((x) => x.alias === '卡A');
      ok(!!a2 && a2.totalCount === expectConsA, 'h9: 导入实例消费记录数与备份一致（' + expectConsA + '）');
      // 联动关系可用：对新实例中联动账单改额 → 镜像同步
      const bills2 = (await req2('GET', '/api/bills')).body;
      console.log('  [debug] 导入实例账单: ' + bills2.map((b) => b.month + '(' + b.amount + (b.countAsSpend ? ',联动)' : ')')).join(' '));
      const linkBill = bills2.find((x) => x.countAsSpend);
      ok(!!linkBill, 'h10: 联动账单 countAsSpend 保留');
      if (linkBill) {
        const oldAmount = linkBill.amount;
        r = await req2('PUT', '/api/bills/' + linkBill.id, { amount: oldAmount + 111 });
        eq(r.status, 200, 'h11: 新实例改联动账单金额（' + linkBill.month + ' ' + oldAmount + '→' + (oldAmount + 111) + '）');
        const recs3 = (await req2('GET', '/api/mycards/' + linkBill.myCardId + '/consumptions')).body.records;
        const m3 = recs3.find((x) => x.fromBill === linkBill.id);
        ok(!!m3 && m3.amount === Math.round((oldAmount + 111) * 100) / 100, 'h12: 镜像随改额同步（联动关系在导入后仍工作）');
      }
      // 进度复核：卡A 预期进度 = 备份中其卡年窗口内记录合计（billA 20000 + billA3 6000 + 手动 10000 = 36000）
      ok(!!a2 && a2.waiver.progress === 36000, 'h13: 导入实例进度正确（36000）');
    } finally {
      srv2.kill();
      try { fs.rmSync(DATA_DIR2, { recursive: true, force: true }); } catch (_) {}
    }

    // ---- 边界补充：账单月无 31 日（2 月月末钳制）----
    console.log('\n== 场景 i：2 月账单月末钳制 ==');
    r = await req('POST', '/api/bills', { myCardId: idA, month: '2025-02', amount: 500, countAsSpend: true });
    eq(r.status, 201, 'i1: 创建 2025-02 账单');
    consA = (await req('GET', '/api/mycards/' + idA + '/consumptions')).body.records;
    const mFeb = consA.find((x) => x.fromBill === r.body.id);
    ok(!!mFeb && mFeb.date === '2025-02-28', 'i2: 镜像 date=2025-02-28（无 2/31，正确钳制）');

    // ---- 汇总 ----
    console.log('\n========== 端到端结果 ==========');
    console.log('PASS: ' + passed + '  FAIL: ' + failed);
    if (failed) { console.log('失败项：\n - ' + failures.join('\n - ')); process.exitCode = 1; }
  } finally {
    srv.kill();
    await sleep(300);
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) {}
    console.log('临时数据目录已清理');
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
