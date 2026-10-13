'use strict';

/* 还款 / 账单 / 年费日期引擎
 * 语义对齐金山文档「信用卡掌柜」：
 *   最后可还款日 = 银行到期日 + 宽限期
 *   宽限期参与「选期判断」——过了到期日但仍在宽限期内仍算本期，不跳下期
 *   主表「下次还款日」永远指向未来（过即跳下期）
 */

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); } // m: 1-12
function pad2(n) { return String(n).padStart(2, '0'); }

function dateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function atDay(y, m, d) { // m: 0-11，日超当月天数时钳到月末（防止 Date 静默滚月）
  const max = daysInMonth(y, m + 1);
  return new Date(y, m, Math.min(Math.max(1, Math.round(Number(d) || 1)), max));
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function diffDays(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }

/** 账单日：offset=0 本期（已出的最近一期）、+1 下期、-1 上期 */
function billDateOf(billingDay, now, offset) {
  const bd = Math.min(31, Math.max(1, Math.round(Number(billingDay) || 1)));
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1-12
  // 金山区判：今天是否还没到本月账单日
  if (now.getDate() <= bd) m -= 1; // 本期账单属上月
  m += (offset || 0);
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return atDay(y, m - 1, bd);
}

/**
 * 银行到期日（不含宽限期）
 * 还款方式：
 *   fixed     每月固定日：若固定日 > 账单日则同月，否则次月
 *   afterBill 账单日后 N 天
 */
function dueDateOf(card, billDate) {
  const mode = card.repayMode === 'afterBill' ? 'afterBill' : 'fixed';
  const v = Math.round(Number(card.repayValue) || 0);
  if (mode === 'afterBill') {
    return new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate() + Math.max(0, v));
  }
  const day = Math.min(31, Math.max(1, v || 1));
  const billDay = billDate.getDate();
  if (day > billDay) {
    return atDay(billDate.getFullYear(), billDate.getMonth(), day);
  }
  // 固定日不晚于账单日 → 落到次月
  let y = billDate.getFullYear();
  let m = billDate.getMonth() + 1; // 次月
  if (m > 11) { m = 0; y += 1; }
  return atDay(y, m, day);
}

function lastPayDateOf(dueDate, graceDays) {
  const g = Math.max(0, Math.round(Number(graceDays) || 0));
  return new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + g);
}

/** 还款预警分级（金山口径，基于「最后可还款日」剩余天数） */
function repayAlertOf(payDaysLeft) {
  if (payDaysLeft < 0) return '已逾期';
  if (payDaysLeft === 0) return '今日到期';
  if (payDaysLeft <= 3) return '3天内';
  if (payDaysLeft <= 7) return '本周内';
  return '正常';
}

/** 年费预警分级 */
function feeAlertOf(card, feeDaysLeft, feeWaived) {
  if (!(Number(card.annualFee) > 0)) return '无年费';
  if (feeWaived) return '本年豁免';
  if (feeDaysLeft < 0) return '已过日';
  if (feeDaysLeft <= 7) return '7天内';
  if (feeDaysLeft <= 30) return '本月内';
  return '正常';
}

/**
 * 综合计算一张卡的还款信息
 * @returns {billDate,dueDate,lastPayDate,nextPayDate,payDaysLeft,dueDaysLeft,isInGrace,repayAlert,bestSpendDate,maxInterestDays}
 */
function paymentInfo(card, now) {
  now = now || new Date();
  const grace = Math.max(0, Math.round(Number(card.graceDays) || 0));

  const billDate = billDateOf(card.billingDay, now, 0);
  const nextBillDate = billDateOf(card.billingDay, now, 1);

  const due0 = dueDateOf(card, billDate);
  const last0 = lastPayDateOf(due0, grace);
  const due1 = dueDateOf(card, nextBillDate);
  const last1 = lastPayDateOf(due1, grace);

  // 选期含宽限期：只要还在本期最后还款日（含宽限）之内就算本期
  const useNext = diffDays(now, last0) > 0;
  const dueDate = useNext ? due1 : due0;
  const lastPayDate = useNext ? last1 : last0;
  const usedBillDate = useNext ? nextBillDate : billDate;

  const payDaysLeft = diffDays(lastPayDate, now);
  const dueDaysLeft = diffDays(dueDate, now);

  // 最佳消费日：账单日次日消费计入下一期，免息期最长
  const bestSpendDate = new Date(nextBillDate.getFullYear(), nextBillDate.getMonth(), nextBillDate.getDate() + 1);
  // 最长免息期：账单日 → 对应到期日的天数（用户未填时自动推导）
  const maxInterestDays = Number(card.maxInterestDays) > 0
    ? Number(card.maxInterestDays)
    : diffDays(due1, nextBillDate);

  return {
    billDate: dateStr(usedBillDate),
    billMonth: dateStr(usedBillDate).slice(0, 7),
    dueDate: dateStr(dueDate),
    lastPayDate: dateStr(lastPayDate),
    nextPayDate: dateStr(lastPayDate),
    payDaysLeft,
    dueDaysLeft,
    isInGrace: dueDaysLeft < 0 && payDaysLeft >= 0,
    repayAlert: repayAlertOf(payDaysLeft),
    bestSpendDate: dateStr(bestSpendDate),
    maxInterestDays,
  };
}

module.exports = {
  daysInMonth, dateStr, atDay, startOfDay, diffDays,
  billDateOf, dueDateOf, lastPayDateOf, paymentInfo, repayAlertOf, feeAlertOf,
};
