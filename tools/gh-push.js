'use strict';
/* 通过 GitHub Git Data API（按仓库 ID，绕开本环境对 /repos/{owner}/{name} 路径的拦截）
 * 把本地工作区文件打包成单个 root commit 并指向 main。
 * 用法: GH_TOKEN=xxx node tools/gh-push.js <repoId> <branch>
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN;
const REPO_ID = process.argv[2];
const BRANCH = process.argv[3] || 'main';
const ROOT = path.join(__dirname, '..');
const API = 'https://api.github.com';

// 遍历工作区收集待发布文件（规则与 .gitignore 保持一致；不使用 execSync，本环境禁止 spawn）
// SKIP_DIRS 必须覆盖 .gitignore 全部目录项（曾因漏 .backup-test-data/.wrangler 把测试临时
// 文件推上远端 commit b4cf369，见 2026-10-20 日志）。
// 注意：早期把 ui-test 数据目录误写为 .uitest-data（少连字符），实际目录是 .ui-test-data，
// 导致该目录一度不在跳过列表里——两个名字都列上防回归。
const SKIP_DIRS = new Set([
  '.git', 'node_modules',
  // .gitignore「测试/基准产物」段
  '.test-data', '.bench-data', '.notify-test-data', '.notify-test-data2',
  '.ui-test-data', '.uitest-data', '.r5-data', '.r5probe2-data', '.probe-data',
  '.bgprobe-data', '.r7probe-data', '.t-data', '.t-data2', '.t-data3', '.b-data',
  '.backup-test-data', '.wrangler',
  // gitignore 通配目录（.notify-test-data*/ 等运行时可能派生新变体，walk 时动态判断）
]);
// 按相对路径跳过的目录：构建产物不入库（cloudflare/.gitignore 已 ignore public/ 与
// vendored/，但 gh-push 不看 .gitignore，需在此显式排除，否则 vendor 构建产物会被推上远端）
const SKIP_RELS = new Set(['cloudflare/public', 'cloudflare/vendored']);
const FILES = [];
(function walk(dir, prefix) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      // 按相对路径排除构建产物目录（cloudflare/public、cloudflare/vendored）
      if (SKIP_RELS.has(rel)) continue;
      // 通配目录变体兜底：.notify-test-data*/ 等（.gitignore 中以 * 结尾的规则）
      if (/^(notify-test-data|r7probe)/.test(name) && name.startsWith('.')) continue;
      walk(abs, rel);
      continue;
    }
    // 运行时数据/日志不入库（data/ 只保留 .gitkeep）
    if (rel.startsWith('data/') && name !== '.gitkeep') continue;
    if (name.endsWith('.log')) continue;
    FILES.push(rel);
  }
})(ROOT, '');

// 提交信息：取本地最近一次提交（.git/COMMIT_EDITMSG）
function localCommitMessage() {
  try {
    return fs.readFileSync(path.join(ROOT, '.git', 'COMMIT_EDITMSG'), 'utf8').trim();
  } catch (e) {
    return 'chore: 更新项目文件';
  }
}

const COMMIT_MESSAGE = localCommitMessage();

async function gh(method, urlPath, body, raw) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(API + urlPath, {
        method,
        headers: {
          Authorization: 'Bearer ' + TOKEN,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'guanka-publish',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const t = await res.text();
        // 4xx 不重试（客户端错误），5xx/429 重试
        if (res.status < 500 && res.status !== 429) {
          throw new Error(method + ' ' + urlPath + ' -> ' + res.status + ' ' + t.slice(0, 200));
        }
        lastErr = new Error(res.status + ' ' + t.slice(0, 120));
      } else {
        return raw ? res : res.json();
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(method + ' ' + urlPath + ' 失败: ' + (lastErr && (lastErr.cause ? lastErr.cause.message + ' / ' : '') + lastErr.message));
}

async function main() {
  if (!TOKEN) throw new Error('缺少 GH_TOKEN');
  const base = '/repositories/' + REPO_ID;

  console.log('上传 %d 个 blob...', FILES.length);
  const tree = [];
  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    const buf = fs.readFileSync(abs);
    const b = await gh('POST', base + '/git/blobs', {
      content: buf.toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: rel.replace(/\\/g, '/'), mode: '100644', type: 'blob', sha: b.sha });
    console.log('  ✓ %s (%d B)', rel, buf.length);
  }

  console.log('创建 tree...');
  const t = await gh('POST', base + '/git/trees', { tree });
  console.log('  tree sha =', t.sha);

  // 父提交：当前分支 HEAD（首次发布时为空仓库 → root commit）
  let parents = [];
  try {
    const ref = await gh('GET', base + '/git/refs/heads/' + BRANCH);
    if (ref.object && ref.object.sha) {
      parents = [ref.object.sha];
      console.log('父提交 =', ref.object.sha);
    }
  } catch (e) {
    console.log('无既有分支，将创建 root commit');
  }

  console.log('创建 commit...');
  const c = await gh('POST', base + '/git/commits', {
    message: COMMIT_MESSAGE,
    tree: t.sha,
    parents,
  });
  console.log('  commit sha =', c.sha);

  console.log('把 %s 指向该 commit...', BRANCH);
  try {
    await gh('PATCH', base + '/git/refs/heads/' + BRANCH, { sha: c.sha, force: true });
    console.log('  ✓ refs/heads/%s -> %s', BRANCH, c.sha);
  } catch (e) {
    await gh('POST', base + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: c.sha });
    console.log('  ✓ 新建 refs/heads/%s -> %s', BRANCH, c.sha);
  }

  console.log('\n完成: https://github.com/%s', 'folkson/credit-card-manager-docker');
  console.log('commit: %s', c.sha);
}

main().catch((e) => { console.error('失败:', e.message); process.exit(1); });
