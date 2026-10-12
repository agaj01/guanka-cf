'use strict';
/* UI 逻辑自动化验证（开发用，依赖 jsdom）：
 * node tools/ui-test.js
 * 前置：本地已启动服务（node server/index.js），并准备好测试数据。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || 3000);
const ROOT = path.join(__dirname, '..');

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra: extra || '' });
  console.log((cond ? '  ✅ ' : '  ❌ ') + name + (cond ? '' : '  → ' + extra));
}


async function fetchMyCards() {
  const r = await (await fetch(BASE + '/api/mycards')).json();
  return r.data || r;
}

// 测试目标卡 id（确保后的「笔数刷免」持卡），供后续按 id 精确定位行
let testCardId = null;

// 前置：确保库里有一张「笔数刷免」持卡且别名非空（供进度/编辑断言使用）
async function ensureTestCard() {
  const cards = await (await fetch(BASE + '/api/cards')).json();
  const target = cards.find((c) => c.waiverType === '笔数刷免');
  if (!target) return;
  const mine = await fetchMyCards();
  // 以别名为准做幂等（历史运行可能已把同名卡的别名改掉）
  const exist = mine.find((m) => m.alias === '测试卡');
  if (exist) {
    if (exist.cardId !== target.id) {
      await fetch(BASE + '/api/mycards/' + exist.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: target.id }),
      });
    }
    testCardId = exist.id;
    return;
  }
  const created = await (await fetch(BASE + '/api/mycards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId: target.id, alias: '测试卡', feeMonth: 3, feeDay: 15 }),
  })).json();
  testCardId = created.id;
  await fetch(BASE + '/api/mycards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId: target.id, alias: '测试卡', feeMonth: 3, feeDay: 15 }),
  });
}

async function main() {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');

  const dom = new JSDOM(html, { url: BASE + '/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  w.fetch = (p, opts) => fetch(p.startsWith('http') ? p : BASE + p, opts || {});
  w.alert = () => {};

  // 捕获页面脚本错误
  const pageErrors = [];
  w.addEventListener('error', (e) => pageErrors.push(e.message || String(e.error)));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, timeout = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (fn()) return true; } catch (e) { /* retry */ }
      await sleep(100);
    }
    return false;
  }

  await ensureTestCard();
  w.eval(appJs);
  const loaded = await waitFor(() => w.document.querySelector('.stats') && w.document.querySelector('.stat-card'));
  check('页面启动并渲染首页统计', loaded);

  const doc = w.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => Array.from(doc.querySelectorAll(s));
  const text = (s) => ($(s) ? $(s).textContent.trim() : '');

  // ---- 1. 统计卡 ----
  const statTexts = $$('.stat-card').map((el) => el.textContent.replace(/\s+/g, ' '));
  check('统计卡含持卡总数', statTexts.some((t) => t.includes('持卡总数')));
  check('统计卡含年费即将到期', statTexts.some((t) => t.includes('年费即将到期')));

  // ---- 2. 持卡行 ----
  const row = $('.card-row');
  check('持卡列表渲染出卡片行', !!row);
  if (row) {
    check('卡片行显示银行分组', !!row.closest('.bank-group'));
    check('年费徽章渲染', /年费还有 \d+ 天|年费已免|无年费|本年豁免/.test(text('.card-row .fee-cell')), text('.card-row .fee-cell'));
    // 精确定位 ensureTestCard 建的「测试卡」（笔数刷免）：用渲染后的别名全角引号包裹形式，避免命中「UI测试卡」
    const countRow = $$('.card-row').find((r) => r.textContent.includes('\u201c测试卡\u201d'));
    check('刷免进度渲染（笔数刷免）', !!countRow && /\/ \d+ 笔/.test(countRow.textContent) && (countRow.textContent.includes('剩余') || countRow.textContent.includes('已达标')), countRow ? countRow.textContent.slice(0, 120) : '未找到测试卡行');
  }

  // ---- 3. 详情抽屉 ----
  // 打开「测试卡」的抽屉（其权益为有限次，便于验证「次数用完」拦截）
  const targetRow = $$('.card-row').find((r) => r.dataset.id === testCardId) || $('.card-row');
  const detailBtn = $('[data-act="detail"]', targetRow);
  detailBtn.click();
  const drawerOpen = await waitFor(() => $('#drawer') && $('#drawer').querySelector('.drawer-body'));
  check('点击详情打开抽屉', drawerOpen);
  if (drawerOpen) {
    const dText = $('#drawer').textContent;
    check('抽屉含基础信息', dText.includes('基础信息') && dText.includes('授信额度'));
    check('抽屉含年费信息', dText.includes('年费信息') && dText.includes('下期年费日'));
    check('抽屉含每月刷卡任务', dText.includes('每月刷卡任务'));
    check('抽屉含消费记录区', dText.includes('消费记录') && dText.includes('记一笔'));
    check('抽屉含权益使用明细', $$('#drawer .benefit-block').length > 0, 'block 数=' + $$('#drawer .benefit-block').length);
    check('抽屉权益显示已用次数', /已用 \d+ \/ (\d+|不限)/.test(dText), dText.slice(0, 160));
  }

  // ---- 3.5 编辑持卡 ----
  const editBtn = $('#drawer [data-act="edit-mycard"]');
  if (editBtn) {
    editBtn.click();
    const editModal = await waitFor(() => $('#modal') && $('#f-alias'));
    check('打开编辑持卡弹窗', editModal);
    if (editModal) {
      check('编辑表单预填数据', $('#f-credit').value && Number($('#f-credit').value) > 0);
      $('#f-alias').value = 'UI编辑后的别名';
      $('#btn-save-mycard').click();
      const edited = await waitFor(async () => {
        const list = await fetchMyCards();
        return list.some((m) => m.alias === 'UI编辑后的别名');
      });
      check('编辑持卡保存成功', edited);
    }
  }

  // ---- 3.6 年费到期统计卡 ----
  // 有到期卡 → 弹窗列表；无到期卡 → toast 提示（两种均为正确行为）
  const feeCard = $('#stat-fee-expiring');
  if (feeCard) {
    feeCard.click();
    const feeOk = await waitFor(() => $('#modal') || $('#toast-root').textContent.includes('30 天内'));
    check('年费即将到期卡点击有响应（弹窗或提示）', feeOk);
    if ($('#modal')) $$('#modal [data-close]').forEach((b) => b.click());
  }

  // ---- 4. 记一笔消费 ----
  const recBtn = $('#drawer [data-act="record-consumption"]');
  recBtn.click();
  const modalOpen = await waitFor(() => $('#modal') && $('#c-amount'));
  check('打开「记一笔」弹窗', modalOpen);
  if (modalOpen) {
    const before = await fetchMyCards();
    const beforeCount = before[0].totalCount;
    $('#c-amount').value = '666';
    $('#c-note').value = 'UI测试';
    $('#btn-save-consumption').click();
    const saved = await waitFor(async () => {
      const after = await fetchMyCards();
      return after[0].totalCount === beforeCount + 1;
    });
    check('保存消费记录成功', saved);
    const closed = await waitFor(() => !$('#modal'));
    check('保存后弹窗关闭', closed);
  }

  // ---- 5. 补录消费笔数 ----
  const cntBtn = $('#drawer [data-act="count-topup"]');
  const baseCard = (await fetchMyCards())[0];
  const baseProgress = baseCard.waiver.kind === '笔数刷免' ? baseCard.waiver.progress : 0;
  $('#count-topup-input').value = '2';
  cntBtn.click();
  const cntOk = await waitFor(async () => {
    const m = (await fetchMyCards())[0];
    return m.waiver.kind === '笔数刷免' && m.waiver.progress >= baseProgress + 2;
  });
  check('补录消费笔数生效（进度 +2）', cntOk);

  // ---- 6. 权益超限拦截 ----
  // 先记一笔用满当前权益，再记一笔应被拒绝
  const benBtn = $('#drawer .benefit-block [data-act="record-benefit"]');
  if (benBtn) {
    benBtn.click();
    const benModal = await waitFor(() => $('#modal') && $('#b-date'));
    if (benModal) {
      $('#btn-save-benefit').click();
      const filled = await waitFor(async () => {
        const m = (await fetchMyCards())[0];
        const b = m.benefits && m.benefits[0];
        return b && b.used >= b.total;
      });
      check('权益记一笔用满次数', filled);
      // 再次记录应被拦截
      $('#drawer .benefit-block [data-act="record-benefit"]').click();
      const benModal2 = await waitFor(() => $('#modal') && $('#b-date'));
      if (benModal2) {
        $('#btn-save-benefit').click();
        const rejected = await waitFor(() => $('#toast-root').textContent.includes('次数已用完'));
        check('权益次数用完时拦截并提示', rejected);
        $$('#modal [data-close]').forEach((b) => b.click());
      }
    }
  } else {
    check('权益次数用完时拦截并提示', false, '未找到权益记录按钮');
  }

  // ---- 7. 消费明细弹窗 ----
  const detailRec = $('#drawer [data-act="detail-records"]');
  if (detailRec) {
    detailRec.click();
    const recModal = await waitFor(() => $('#modal') && $('#modal').querySelector('.scroll-y'));
    check('打开消费明细弹窗', recModal);
    if (recModal) {
      check('明细弹窗含记录表', !!$('#modal').querySelector('.record-table'));
      $$('#modal [data-close]').forEach((b) => b.click());
    }
  }

  // ---- 8. 银行折叠 ----
  const bankHeader = $('.bank-header');
  const wasCollapsed = $('.bank-group').classList.contains('collapsed');
  bankHeader.click();
  await sleep(150);
  const nowCollapsed = $('.bank-group').classList.contains('collapsed');
  check('银行分组折叠/展开切换', wasCollapsed !== nowCollapsed);

  // ---- 9. 切换到卡种数据库页 ----
  const navCards = $('.nav-item[data-page="cards"]');
  navCards.click();
  const dbLoaded = await waitFor(() => $('.db-table'));
  check('切换到卡种数据库页并渲染表格', dbLoaded);
  if (dbLoaded) {
    const rows = $$('.db-table tbody tr').length;
    check('卡种表格有数据行（83+ 张）', rows > 80, 'rows=' + rows);
    check('卡种按银行分组', $$('.bank-group').length > 5);
  }

  // ---- 10. 新增卡种弹窗 ----
  const newTypeBtn = $('#btn-new-card-type');
  newTypeBtn.click();
  const typeModal = await waitFor(() => $('#modal') && $('#t-bank'));
  check('打开新增卡种弹窗', typeModal);
  if (typeModal) {
    $('#t-bank').value = 'UI测试银行';
    $('#t-name').value = 'UI测试卡';
    $('#t-level').value = '金卡';
    $('#t-org').value = '银联';
    $('#t-fee').value = '200';
    $('#t-waivertype').value = '消费刷免';
    $('#t-condition').value = '5万';
    $('#t-benefits').value = '权益X|权益Y';
    $('#btn-save-cardtype').click();
    const added = await waitFor(async () => {
      const cards = await (await fetch(BASE + '/api/cards')).json();
      return cards.some((c) => c.name === 'UI测试卡');
    });
    check('新增卡种成功', added);
  }

  // ---- 11. 主题切换 ----
  const themeBefore = doc.documentElement.dataset.theme;
  $('#theme-toggle').click();
  await sleep(100);
  check('主题切换生效', doc.documentElement.dataset.theme !== themeBefore);
  $('#theme-toggle').click();
  await sleep(100);
  check('主题切回', doc.documentElement.dataset.theme === themeBefore);

  // ---- 12. 添加持卡流程（选卡） ----
  $('.nav-item[data-page="mycards"]').click();
  await waitFor(() => $('#btn-add-card'));
  const addBtnEl = $('#btn-add-card');
  addBtnEl.click();
  const pickModal = await waitFor(() => $('#modal') && $('#pick-list'));
  check('打开添加持卡弹窗', pickModal);
  if (pickModal) {
    $('#pick-search').value = 'UI测试';
    $('#pick-search').dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(150);
    const pickCard = $('#pick-list .pick-card');
    check('搜索命中测试卡并展示', !!pickCard);
    if (pickCard) {
      pickCard.click();
      const formShown = await waitFor(() => $('#pick-form') && $('#f-alias'));
      check('选卡后展示表单', formShown);
      if (formShown) {
        $('#f-alias').value = 'UI流程卡';
        $('#f-credit').value = '30000';
        $('#btn-save-mycard').click();
        const myAdded = await waitFor(async () => {
          const list = await fetchMyCards();
          return list.some((m) => m.alias === 'UI流程卡');
        });
        check('完整添加持卡流程成功', myAdded);
      }
    }
  }

  // ---- 13. 提醒设置 ----
  const notifyBtn = $('#btn-notify');
  if (notifyBtn) {
    notifyBtn.click();
    const nm = await waitFor(() => $('#modal') && $('#nc-wxpusher-enabled'));
    check('打开提醒设置弹窗', nm);
    if (nm) {
      check('三通道配置区块齐全', !!($('#nc-serverchan-sendkey') && $('#nc-bark-deviceKey') && $('#nc-wxpusher-appToken')));
      check('提醒规则字段齐全', !!($('#n-feeDays') && $('#n-repayDays') && $('#n-taskDays') && $('#n-interval')));
      $('#n-save').click();
      const saved = await waitFor(() => $('#n-result') && $('#n-result').textContent.includes('已保存'));
      check('提醒配置保存成功', saved);
      $('#n-check').click();
      const checked = await waitFor(() => $('#n-result') && /检查|跳过|没有已启用/.test($('#n-result').textContent));
      check('立即检查返回处理结果', checked, JSON.stringify($('#n-result') && $('#n-result').textContent));
      $$('#modal [data-close]').forEach((b) => b.click());
    }
  } else {
    check('打开提醒设置弹窗', false, '未找到提醒按钮');
  }

  // ---- 14. 账单流水（P0-3）----
  const billRow = $$('.card-row').find((r) => r.dataset.id === testCardId);
  if (billRow) {
    $('[data-act="detail"]', billRow).click();
    const hasBills = await waitFor(() => $('#drawer') && $('#drawer [data-act="bill-gen"]'));
    check('抽屉含账单流水区块', hasBills);
    if (hasBills) {
      $('#drawer [data-act="bill-gen"]').click();
      const created = await waitFor(() => $('#drawer tr[data-bill-id]'));
      check('生成本期账单成功', created);
      if (created) {
        const toggle = $('#drawer [data-act="bill-toggle"]');
        toggle.click();
        const paid = await waitFor(() => $('#drawer').textContent.includes('已还'));
        check('标记已还并自动填还款日期', paid);
      }
    }
    $$('#drawer [data-act="close"]').forEach((b) => b.click());
  } else {
    check('抽屉含账单流水区块', false, '未找到测试卡行');
  }

  // ---- 15. 筛选与排序（P2-2）----
  const filterSel = $('#filter-select');
  const sortSel = $('#sort-select');
  check('筛选与排序控件存在', !!filterSel && !!sortSel);
  if (filterSel && sortSel) {
    filterSel.value = 'unpaid';
    filterSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    await sleep(150);
    const okFilter = $$('.card-row').length > 0 || !!$('.empty-tip');
    check('切换筛选后页面正常渲染', okFilter);
    sortSel.value = 'fee';
    sortSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    await sleep(150);
    check('切换排序后页面正常渲染', $$('.card-row').length > 0 || !!$('.empty-tip'));
  }

  // ---- 16. 页面错误 ----
  check('运行期间无未捕获页面错误', pageErrors.length === 0, pageErrors.join('; '));

  // ---- 汇总 ----
  const failed = results.filter((r) => !r.ok);
  console.log('\n========== 结果：' + (results.length - failed.length) + '/' + results.length + ' 通过 ==========');
  w.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('测试执行异常:', e); process.exit(1); });
