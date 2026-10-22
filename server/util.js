'use strict';

// ---------- 金额解析：支持 50000 / 5万 / 1.5万 / 10,000 / 1亿 ----------
function parseAmount(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/,/g, '');
  if (!s) return 0;
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(亿|万|千|百)?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  switch (m[2]) {
    case '亿': n *= 1e8; break;
    case '万': n *= 1e4; break;
    case '千': n *= 1e3; break;
    case '百': n *= 1e2; break;
    default: break;
  }
  return Math.round(n * 100) / 100;
}

// ---------- 日期工具（本地时区，YYYY-MM-DD 字符串） ----------
function pad2(n) { return String(n).padStart(2, '0'); }

function toDateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function todayStr() { return toDateStr(new Date()); }

function parseDateStr(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const dt = new Date(y, mo - 1, d);
  // 严格校验真实性：Date 会把 2026-02-30 静默进位成 03-02、2026-13-01 进位到次年，
  // 只比对回读值才能识别出这类不存在的日期（否则脏日期入库并污染按月统计）
  if (isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function daysBetween(fromStr, to) {
  const a = parseDateStr(fromStr);
  if (!a) return 0;
  return Math.round((startOfDay(to) - startOfDay(a)) / 86400000);
}

// 按目标年份取年费日：日超当月天数时收到月末（如 2月29 在平年 → 2月28），避免 Date 静默滚月
function feeDateIn(year, feeMonth, feeDay) {
  const m = Math.min(12, Math.max(1, Math.round(Number(feeMonth) || 1)));
  const d = Math.min(daysInMonth(year, m), Math.max(1, Math.round(Number(feeDay) || 1)));
  return new Date(year, m - 1, d);
}

// 下一个年费收取日（>= 今天）
function nextFeeDate(feeMonth, feeDay, now) {
  const y = now.getFullYear();
  let d = feeDateIn(y, feeMonth, feeDay);
  if (startOfDay(d) < startOfDay(now)) d = feeDateIn(y + 1, feeMonth, feeDay);
  return d;
}

// 月份天数（month 1-12）
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// 年费月日钳制：日超出当月天数时收到月末（2 月 31 → 2 月 28/29），避免 Date 静默滚月
function clampFeeDate(month, day) {
  const y = new Date().getFullYear();
  const m = Math.min(12, Math.max(1, Math.round(Number(month) || 1)));
  const dMax = daysInMonth(y, m);
  const d = Math.min(dMax, Math.max(1, Math.round(Number(day) || 1)));
  return { m, d };
}

// 距下次年费日天数
function feeCountdown(feeMonth, feeDay, now) {
  return Math.round((nextFeeDate(feeMonth, feeDay, now) - startOfDay(now)) / 86400000);
}

// 卡年起点：最近一个已过去的年费日（用于刷免进度统计区间）
function cardYearStart(feeMonth, feeDay, now) {
  const y = now.getFullYear();
  let d = feeDateIn(y, feeMonth, feeDay);
  if (d > now) d = feeDateIn(y - 1, feeMonth, feeDay);
  return d;
}

// 权益周期起点（一次性/无固定：不重置，起点取纪元）
function cycleStart(resetCycle, feeMonth, feeDay, now) {
  if (resetCycle === '自然月') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (resetCycle === '自然年') return new Date(now.getFullYear(), 0, 1);
  if (resetCycle === '一次性' || resetCycle === '无固定') return new Date(1970, 0, 1);
  return cardYearStart(feeMonth, feeDay, now); // 年费日重置
}

// 记录所属周期 key（用于历史归档）
function cycleKeyOf(resetCycle, feeMonth, feeDay, dateStr) {
  if (resetCycle === '自然月') return dateStr.slice(0, 7);
  if (resetCycle === '自然年') return dateStr.slice(0, 4);
  if (resetCycle === '一次性' || resetCycle === '无固定') return resetCycle;
  const md = pad2(feeMonth) + '-' + pad2(feeDay);
  const y = +dateStr.slice(0, 4);
  return (dateStr.slice(5) >= md ? y : y - 1) + '-' + md + ' 起';
}

function cycleLabelOf(resetCycle, feeMonth, feeDay, dateStr) {
  if (resetCycle === '自然月') return dateStr.slice(0, 7);
  if (resetCycle === '自然年') return dateStr.slice(0, 4) + ' 年';
  return cycleKeyOf(resetCycle, feeMonth, feeDay, dateStr);
}

// ---------- CSV ----------
function parseCSV(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => String(f).trim() !== ''));
}

/* CSV 公式注入消毒：以 = + - @ 制表符 回车 开头的单元格会被 Excel/WPS 当公式执行
 * （如 =cmd|'/c calc'!A1）。字段来源含用户可控文本（银行/名称/别名/备注/权益名称），
 * 存在「导入恶意备份 → 导出 CSV → 客户机打开」的投毒链。前置单引号强制按文本处理。
 * 负号在列：单独的负数金额（-123）会被误伤成 '-123——但本表金额列不进 toCSV
 * （导出字段全是文本/枚举），且 Excel 对 '数字文本 仍可手动去除前缀，安全优先。 */
function sanitizeCell(f) {
  if (/^[=+\-@\t\r]/.test(f)) return "'" + f;
  return f;
}

function toCSV(rows) {
  const body = rows.map((r) => r.map((f) => {
    f = f == null ? '' : String(f);
    f = sanitizeCell(f);
    return /[",\n\r]/.test(f) ? '"' + f.replace(/"/g, '""') + '"' : f;
  }).join(',')).join('\r\n');
  return '\uFEFF' + body;
}

// ---------- 杂项 ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n) {
  return (Number(n) || 0).toLocaleString('zh-CN');
}

module.exports = {
  parseAmount, toDateStr, todayStr, parseDateStr, startOfDay, daysBetween,
  nextFeeDate, feeCountdown, daysInMonth, clampFeeDate, cardYearStart, cycleStart, cycleKeyOf, cycleLabelOf,
  parseCSV, toCSV, uid, fmtMoney, fmtInt,
};
