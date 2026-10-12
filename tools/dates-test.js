'use strict';
/* 日期引擎验证：账单日/到期日/宽限期/跳期/预警分级/免息期
 * 用法: node tools/dates-test.js
 */
const D = require('../server/dates');

let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? '  ✅ ' : '  ❌ ') + name + (cond ? '' : '  → ' + extra));
  if (!cond) failures++;
}
function d(y, m, day) { return new Date(y, m - 1, day); } // m: 1-12

console.log('=== 1. 账单日（金山区判：今天是否已过本月账单日）===');
check('今天 12 > 账单日 5 → 本期账单属本月', D.dateStr(D.billDateOf(5, d(2026, 10, 12))) === '2026-10-05', D.dateStr(D.billDateOf(5, d(2026, 10, 12))));
check('今天 12 <= 账单日 20 → 本期账单属上月', D.dateStr(D.billDateOf(20, d(2026, 10, 12))) === '2026-09-20', D.dateStr(D.billDateOf(20, d(2026, 10, 12))));
check('今天正好等于账单日 → 仍属上月（<= 判据）', D.dateStr(D.billDateOf(12, d(2026, 10, 12))) === '2026-09-12', D.dateStr(D.billDateOf(12, d(2026, 10, 12))));
check('账单日 31 落到 1 月（上月有 31 天）', D.dateStr(D.billDateOf(31, d(2026, 2, 10))) === '2026-01-31', D.dateStr(D.billDateOf(31, d(2026, 2, 10))));
check('账单日 31 在平年 2 月被截断为 28', D.dateStr(D.billDateOf(31, d(2026, 3, 31))) === '2026-02-28', D.dateStr(D.billDateOf(31, d(2026, 3, 31))));
check('闰年：账单日 29，今天 3/29（=账单日）→ 上期为 2028-02-29', D.dateStr(D.billDateOf(29, d(2028, 3, 29))) === '2028-02-29', D.dateStr(D.billDateOf(29, d(2028, 3, 29))));
check('今天 31 > 账单日 29 → 本期账单就在本月', D.dateStr(D.billDateOf(29, d(2028, 3, 31))) === '2028-03-29', D.dateStr(D.billDateOf(29, d(2028, 3, 31))));
check('跨年：1 月的本期账单属去年 12 月', D.dateStr(D.billDateOf(5, d(2026, 1, 3))) === '2025-12-05', D.dateStr(D.billDateOf(5, d(2026, 1, 3))));

console.log();
console.log('=== 2. 银行到期日（两种还款方式）===');
const bill1005 = d(2026, 10, 5);
check('固定日 25 > 账单日 5 → 同月', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 25 }, bill1005)) === '2026-10-25', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 25 }, bill1005)));
check('固定日 3 <= 账单日 5 → 次月', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 3 }, bill1005)) === '2026-11-03', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 3 }, bill1005)));
check('固定日 31 在 1 月账单后 → 次月并截断 2/28', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 31 }, d(2026, 1, 31))) === '2026-02-28', D.dateStr(D.dueDateOf({ repayMode: 'fixed', repayValue: 31 }, d(2026, 1, 31))));
check('账单日后 20 天', D.dateStr(D.dueDateOf({ repayMode: 'afterBill', repayValue: 20 }, bill1005)) === '2026-10-25', D.dateStr(D.dueDateOf({ repayMode: 'afterBill', repayValue: 20 }, bill1005)));
check('账单日后 20 天跨年', D.dateStr(D.dueDateOf({ repayMode: 'afterBill', repayValue: 20 }, d(2026, 12, 20))) === '2027-01-09', D.dateStr(D.dueDateOf({ repayMode: 'afterBill', repayValue: 20 }, d(2026, 12, 20))));
check('缺 repayMode 时默认 fixed', D.dateStr(D.dueDateOf({ repayValue: 25 }, bill1005)) === '2026-10-25', '');

console.log();
console.log('=== 3. 宽限期 ===');
check('最后还款日 = 到期日 + 宽限期', D.dateStr(D.lastPayDateOf(d(2026, 10, 25), 3)) === '2026-10-28', D.dateStr(D.lastPayDateOf(d(2026, 10, 25), 3)));
check('宽限期 0 时等于到期日', D.dateStr(D.lastPayDateOf(d(2026, 10, 25), 0)) === '2026-10-25', '');
check('宽限期缺省按 0', D.dateStr(D.lastPayDateOf(d(2026, 10, 25))) === '2026-10-25', '');

console.log();
console.log('=== 4. 选期含宽限期（核心语义）===');
const card = { billingDay: 5, repayMode: 'fixed', repayValue: 25, graceDays: 3 };
let info = D.paymentInfo(card, d(2026, 10, 12));
check('常规日：本期 10/05 账单，到期 10/25，最后 10/28', info.billDate === '2026-10-05' && info.dueDate === '2026-10-25' && info.lastPayDate === '2026-10-28', JSON.stringify(info));
check('剩余天数正确（pay 16 / due 13）', info.payDaysLeft === 16 && info.dueDaysLeft === 13, JSON.stringify(info));
info = D.paymentInfo(card, d(2026, 10, 27));
check('已过到期日但在宽限期内 → 仍算本期', info.dueDate === '2026-10-25' && info.isInGrace === true && info.payDaysLeft === 1, JSON.stringify(info));
info = D.paymentInfo(card, d(2026, 10, 28));
check('宽限期最后一天 → 今日到期且仍本期', info.repayAlert === '今日到期' && info.isInGrace === true, JSON.stringify(info));
info = D.paymentInfo(card, d(2026, 10, 29));
check('超出宽限期 → 自动跳下期', info.billDate === '2026-11-05' && info.dueDate === '2026-11-25' && info.lastPayDate === '2026-11-28', JSON.stringify(info));

console.log();
console.log('=== 5. 还款预警分级 ===');
check('-1 → 已逾期', D.repayAlertOf(-1) === '已逾期');
check('0 → 今日到期', D.repayAlertOf(0) === '今日到期');
check('2 → 3天内', D.repayAlertOf(2) === '3天内');
check('3 → 3天内（含边界）', D.repayAlertOf(3) === '3天内');
check('5 → 本周内', D.repayAlertOf(5) === '本周内');
check('7 → 本周内（含边界）', D.repayAlertOf(7) === '本周内');
check('8 → 正常', D.repayAlertOf(8) === '正常');
check('年费：无年费', D.feeAlertOf({ annualFee: 0 }, 10, false) === '无年费');
check('年费：本年豁免', D.feeAlertOf({ annualFee: 3600 }, 10, true) === '本年豁免');
check('年费：-1 → 已过日', D.feeAlertOf({ annualFee: 3600 }, -1, false) === '已过日');
check('年费：5 → 7天内', D.feeAlertOf({ annualFee: 3600 }, 5, false) === '7天内');
check('年费：20 → 本月内', D.feeAlertOf({ annualFee: 3600 }, 20, false) === '本月内');
check('年费：40 → 正常', D.feeAlertOf({ annualFee: 3600 }, 40, false) === '正常');

console.log();
console.log('=== 6. 最佳消费日与最长免息期 ===');
info = D.paymentInfo(card, d(2026, 10, 12));
check('最佳消费日 = 下期账单日次日', info.bestSpendDate === '2026-11-06', info.bestSpendDate);
check('最长免息期 = 下期账单日→到期日 = 20 天', info.maxInterestDays === 20, String(info.maxInterestDays));
check('手工填 maxInterestDays 时以手工值为准', D.paymentInfo(Object.assign({}, card, { maxInterestDays: 56 }), d(2026, 10, 12)).maxInterestDays === 56);

console.log();
console.log('=== 7. 不变量：主表「下次还款日」永远指向未来 ===');
let minLeft = Infinity;
for (let i = 0; i < 120; i++) {
  const t = new Date(2026, 9, 1 + i);
  const s = D.paymentInfo(card, t);
  if (s.payDaysLeft < minLeft) minLeft = s.payDaysLeft;
}
check('连续 120 天 payDaysLeft 均 >= 0（永不逾期）', minLeft >= 0, 'min=' + minLeft);

server_done: {
  console.log();
  console.log(failures === 0 ? '========== 日期引擎测试全部通过 ==========' : '========== 失败 ' + failures + ' 项 ==========');
  process.exit(failures ? 1 : 0);
}
