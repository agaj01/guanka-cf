'use strict';
/* 性能基准：对比索引优化前后的计算开销（直接驱动 routes 内部函数，不经 HTTP） */
const path = require('path');
const fs = require('fs');
const { Store } = require('../server/db');
const routes = require('../server/routes');

const DATA = path.join(__dirname, '.bench-data');
fs.rmSync(DATA, { recursive: true, force: true });
fs.mkdirSync(DATA, { recursive: true });

const store = new Store(DATA);
routes.init(store);

const CARDS_N = +(process.env.BENCH_CARDS || 50);   // 持卡数
const TX_N = +(process.env.BENCH_TX || 5000);       // 消费记录数
const BEN_N = +(process.env.BENCH_BEN || 800);      // 权益记录数

const cards = store.read('cards', []);
const myCards = [];
const consumptions = [];
const benefits = [];
for (let i = 0; i < CARDS_N; i++) {
  const c = cards[i % cards.length];
  const id = 'mc' + i;
  myCards.push({
    id, cardId: c.id, bank: c.bank, name: c.name, org: c.org, level: c.level,
    annualFee: c.annualFee, waiverType: c.waiverType, waiverCondition: c.waiverCondition, waiverPolicy: c.waiverPolicy,
    alias: '卡' + i, creditLimit: 50000, billingDay: 5, repaymentDay: 23,
    feeMonth: (i % 12) + 1, feeDay: 15, last4: '1234', monthlySpendTarget: 10000,
    benefits: [{ name: '权益A', total: 6, resetCycle: '自然年' }, { name: '权益B', total: 12, resetCycle: '自然月' }],
    pointsDeducted: false, assetWaived: false, createdAt: new Date().toISOString(),
  });
  for (let t = 0; t < TX_N / CARDS_N; t++) {
    consumptions.push({
      id: 'tx' + i + '_' + t, myCardId: id, type: 'amount',
      date: '2026-' + String((t % 9) + 1).padStart(2, '0') + '-' + String((t % 27) + 1).padStart(2, '0'),
      amount: 100 + (t % 500), channel: '微信支付', category: '餐饮', note: '', createdAt: '',
    });
  }
  for (let b = 0; b < BEN_N / CARDS_N; b++) {
    benefits.push({ id: 'bn' + i + '_' + b, myCardId: id, idx: b % 2, type: 'usage', date: '2026-03-10', note: '', createdAt: '' });
  }
}
store.write('mycards', myCards);
store.write('consumptions', consumptions);
store.write('benefits', benefits);

// 新实现：一次索引 + 全量计算（模拟 GET /api/mycards 真实路径）
const { computeMyCard, computeStats, buildIndexes } = routes._internals;
const t0 = process.hrtime.bigint();
const idx = buildIndexes();
const list = myCards.map((m) => computeMyCard(m, new Date(), idx));
const stats = computeStats(new Date(), idx);
const t1 = process.hrtime.bigint();
const msNew = Number(t1 - t0) / 1e6;

// 模拟旧实现的复杂度：每张卡全表 filter 消费+权益（computeMyCard 无索引版 + computeStats 再跑一遍）
function oldStyleCompute(mc, now) {
  const all = store.read('consumptions', []);
  const bens = store.read('benefits', []);
  let sink = 0;
  const recs = all.filter((r) => r.myCardId === mc.id && r.type === 'amount');
  for (const r of recs) sink += r.amount;
  for (const b of mc.benefits || []) {
    const rs = bens.filter((r) => r.myCardId === mc.id && r.idx === (mc.benefits || []).indexOf(b));
    sink += rs.length;
  }
  return sink;
}
const t2 = process.hrtime.bigint();
for (const m of myCards) oldStyleCompute(m, new Date());
for (const m of myCards) oldStyleCompute(m, new Date()); // computeStats 会再算一遍
const t3 = process.hrtime.bigint();
const msOld = Number(t3 - t2) / 1e6;

console.log('数据规模: %d 持卡 / %d 消费 / %d 权益记录', CARDS_N, TX_N, BEN_N);
console.log('旧实现（每卡全表 filter × 2 轮）: %.1f ms', msOld);
console.log('新实现（一次索引 + 分桶）:        %.1f ms', msNew);
console.log('提升: %.1fx', msOld / msNew);
console.log('校验: stats.totalCards=%d monthSpend=%d feeExpiring=%d', stats.totalCards, stats.monthSpend, stats.feeExpiring.length);
fs.rmSync(DATA, { recursive: true, force: true });
