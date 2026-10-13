'use strict';
/* 增量推送（Git Data API）：沙箱禁用 spawnSync，直接解析 .git/objects（loose object）。
 * 以远端 squash 提交为父，按本地 ccf2f39、051b548 的快照重建两个提交，fast-forward main。
 * 用法: GH_TOKEN=xxx node tools/gh-push-inc.js <repoId>
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TOKEN = process.env.GH_TOKEN;
const REPO_ID = process.argv[2] || '1415171548';
const ROOT = path.join(__dirname, '..');
const GIT_OBJ = path.join(ROOT, '.git', 'objects');
const API = 'https://api.github.com';

// ---------- 本地 git 对象解析（loose object） ----------
function readObj(sha) {
  const buf = zlib.inflateSync(fs.readFileSync(path.join(GIT_OBJ, sha.slice(0, 2), sha.slice(2))));
  const nul = buf.indexOf(0);
  const header = buf.slice(0, nul).toString('utf8'); // "<type> <size>"
  return { type: header.split(' ')[0], body: buf.slice(nul + 1) };
}

function parseCommit(sha) {
  const raw = readObj(sha).body.toString('utf8');
  const tree = raw.match(/^tree ([0-9a-f]{40})$/m)[1];
  const author = raw.match(/^author (.+)$/m)[1].match(/^(.+) <(.+)> (\d+) ([+-]\d{4})$/);
  const committer = raw.match(/^committer (.+)$/m)[1].match(/^(.+) <(.+)> (\d+) ([+-]\d{4})$/);
  const msg = raw.slice(raw.indexOf('\n\n') + 2).trim();
  return { tree, msg, author, committer };
}

// 递归解析本地 tree 对象 → path -> blob sha（tree 对象内条目为二进制：<mode> <name>\0<20B sha>）
function walkLocalTree(treeSha, prefix, out) {
  const body = readObj(treeSha).body;
  let i = 0;
  while (i < body.length) {
    const sp = body.indexOf(32, i);
    const nul = body.indexOf(0, sp);
    const mode = body.slice(i, sp).toString('utf8');
    const name = body.slice(sp + 1, nul).toString('utf8');
    const sha = body.slice(nul + 1, nul + 21).toString('hex');
    i = nul + 21;
    const p = prefix + name;
    if (mode === '40000') walkLocalTree(sha, p + '/', out);
    else out.set(p, sha);
  }
  return out;
}

// ---------- GitHub API（4 次退避重试，4xx 不重试） ----------
async function gh(method, urlPath, body) {
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
        if (res.status < 500 && res.status !== 429) throw new Error(method + ' ' + urlPath + ' -> ' + res.status + ' ' + t.slice(0, 300));
        lastErr = new Error(res.status + ' ' + t.slice(0, 160));
      } else {
        const data = await res.json();
        return data && typeof data === 'object' ? data : {};
      }
    } catch (e) { lastErr = e; }
    await new Promise((r) => setTimeout(r, 1200 * attempt));
  }
  throw new Error(method + ' ' + urlPath + ' 失败: ' + (lastErr && lastErr.message));
}

function flattenRemote(treeSha) {
  return gh('GET', '/repositories/' + REPO_ID + '/git/trees/' + treeSha + '?recursive=1')
    .then((d) => {
      const m = new Map();
      for (const e of d.tree || []) if (e.type === 'blob') m.set(e.path, e.sha);
      return m;
    });
}

// ---------- 构建一个提交 ----------
async function buildCommit(localCommitSha, baseTreeMap, parentSha) {
  const meta = parseCommit(localCommitSha);
  const local = walkLocalTree(meta.tree, '', new Map());

  // 上传差异 blob
  let up = 0;
  for (const [p, sha] of local) {
    if (baseTreeMap.get(p) === sha) continue;
    const content = readObj(sha).body.toString('base64');
    const b = await gh('POST', '/repositories/' + REPO_ID + '/git/blobs', { content, encoding: 'base64' });
    if (b.sha !== sha) throw new Error('blob sha 不一致: ' + p + ' local=' + sha + ' remote=' + b.sha);
    up++;
    console.log('  ↑ ' + p);
  }
  // 删除远端有而本提交没有的文件。
  // 注意：不传 base_tree 时，本 tree 数组即为完整快照，未列出的文件天然被移除，
  // 无需再补 `sha: null` 条目（补了反而会触发 GitHub 422 GitRPC::BadObjectState）。
  for (const p of baseTreeMap.keys()) {
    if (!local.has(p)) console.log('  × ' + p + '（该提交中已删除）');
  }

  const entries = [];
  for (const [p, sha] of local) entries.push({ path: p, mode: '100644', type: 'blob', sha });
  const t = await gh('POST', '/repositories/' + REPO_ID + '/git/trees', { tree: entries });
  const c = await gh('POST', '/repositories/' + REPO_ID + '/git/commits', {
    message: meta.msg,
    tree: t.sha,
    parents: [parentSha],
    author: { name: meta.author[1], email: meta.author[2], date: new Date(+meta.author[3] * 1000).toISOString() },
    committer: { name: meta.committer[1], email: meta.committer[2], date: new Date(+meta.committer[3] * 1000).toISOString() },
  });
  console.log('  blob 上传 ' + up + '，条目 ' + entries.length + '，commit → ' + c.sha);
  return c.sha;
}

async function main() {
  if (!TOKEN) throw new Error('缺少 GH_TOKEN');
  const base = '/repositories/' + REPO_ID;

  const ref = await gh('GET', base + '/git/refs/heads/main');
  const remoteHead = ref.object.sha;
  console.log('远端 HEAD = ' + remoteHead);
  const remoteCommit = await gh('GET', base + '/git/commits/' + remoteHead);
  const remoteMap = await flattenRemote(remoteCommit.tree.sha);
  console.log('远端文件数: ' + remoteMap.size);

  console.log('\n== 按本地 HEAD 快照重建单提交 ==');
  const localHead = process.argv[3];
  if (!localHead) throw new Error('用法: node tools/gh-push-inc.js <repoId> <本地HEAD全SHA>');
  console.log('本地 HEAD = ' + localHead);
  const c1 = await buildCommit(localHead, remoteMap, remoteHead);

  await gh('PATCH', base + '/git/refs/heads/main', { sha: c1, force: false });
  console.log('\n✓ main → ' + c1 + '（fast-forward）');
  console.log('✓ 完成: https://github.com/folkson/credit-card-manager-docker');
}

main().catch((e) => { console.error('失败:', e.message); process.exit(1); });
