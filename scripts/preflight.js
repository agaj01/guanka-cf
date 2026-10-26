'use strict';

/* 部署前自检。
 *
 * 上游版本的 preflight 只用 grep 检查 wrangler.toml 里有没有 "AUTH_TOKEN" 这个词
 * （连注释都算命中），所以设成 1210 也会打印「全部通过，可以 deploy」。
 * 这里改成三项真检查：
 *   1. 配置文件结构（DO 绑定 / Assets / cron）
 *   2. 业务层冒烟测试（含账单模块已下线、只记笔数等定制点）
 *   3. 明确提示：主令牌是 secret，本地读不到 → 用 npm run check-token 单独体检
 *
 * 用法：node scripts/preflight.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = require('path').resolve(__dirname, '..');
let fail = 0;

function ok(cond, name, hint) {
  console.log((cond ? '  ✅ ' : '  ❌ ') + name);
  if (!cond) { fail++; if (hint) console.log('     → ' + hint); }
}
function info(msg) { console.log('  · ' + msg); }

console.log('[preflight] 部署前自检');

console.log('\n1) 配置结构');
const tomlPath = ROOT + '/wrangler.toml';
ok(fs.existsSync(tomlPath), 'wrangler.toml 存在');
const toml = fs.existsSync(tomlPath) ? fs.readFileSync(tomlPath, 'utf8') : '';
ok(/\[\[durable_objects\.bindings\]\]/.test(toml) && /name\s*=\s*"GUANKA_DO"/.test(toml),
  'Durable Object 绑定已声明（会话表依赖它）');
ok(/\[assets\]/.test(toml) && /directory\s*=\s*"\.\/public"/.test(toml), 'Assets 目录指向 ./public');
ok(/run_worker_first\s*=\s*true/.test(toml), 'run_worker_first=true（/api/* 必过鉴权守卫）');
ok(/crons\s*=/.test(toml), 'cron 触发器已声明（提醒调度）');

// 公网入口：workers.dev / 预览 URL 属于 Cloudflare 的 zone，Access 覆盖不到，
// 开着它们 = Access 之外还有一扇没锁的门。这里不 fail（本地开发无所谓），但要吼一声。
const devOn = !/workers_dev\s*=\s*false/.test(toml);
const previewOn = !/preview_urls\s*=\s*false/.test(toml);
// 只看未被注释掉的 routes = [...]
const routeLines = (toml.replace(/^\s*#.*$/gm, '').match(/routes\s*=\s*\[[^\]]*\]/g) || []).join(' ');
const routeHosts = (routeLines.match(/pattern\s*=\s*"([^"]+)"/g) || [])
  .map((x) => x.replace(/.*"([^"]+)"/, '$1'));
if (devOn || previewOn) {
  console.log('  ⚠️  ' + [devOn ? 'workers_dev' : '', previewOn ? 'preview_urls' : ''].filter(Boolean).join(' + ') +
    ' 未关闭 —— 这些域名 Access 保护不到，等于绕过鉴权的公开入口');
  console.log('     → 除非你只想先用 workers.dev 试用，否则请设为 false 并绑定自有域名');
} else {
  ok(true, 'workers_dev / preview_urls 已关闭（公网只有自定义域名一个入口）');
}

// 关了 workers.dev 又没配域名 = 部署成功但打不开，属于硬错误（建了连不上的东西）
const needRoute = !devOn && !previewOn;
if (routeHosts.length === 0) {
  ok(!needRoute, '已配置自定义域名入口',
    'workers_dev 与预览 URL 都关了却没有 routes —— 部署后没有任何入口可达');
} else {
  ok(routeHosts.every((h) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(h)),
    '自定义域名格式合法：' + routeHosts.join(', '));
  ok(!routeHosts.some((h) => /\.workers\.dev$/.test(h)),
    '自定义域名不是 workers.dev（Access 保护不到那类域名）');
}

console.log('\n2) 关键文件');
for (const f of ['src/worker.js', 'src/do.js', 'src/auth.js', 'src/session.js', 'src/access.js',
  'biz/routes.js', 'public/index.html', 'public/app.js']) {
  ok(fs.existsSync(ROOT + '/' + f), f + ' 存在');
}

console.log('\n3) 冒烟测试');
let smokeOut = '';
try {
  smokeOut = execSync('node test/smoke.js', { cwd: ROOT, encoding: 'utf8' });
} catch (e) {
  smokeOut = (e.stdout || '') + (e.stderr || '');
}
const m = smokeOut.match(/冒烟结果: (\d+) 通过 \/ (\d+) 失败/);
ok(m && m[2] === '0', '冒烟测试 ' + (m ? m[1] + ' 通过 / ' + m[2] + ' 失败' : '(无法解析输出)'), '单独运行 npm test 查看失败项');
if (m && m[2] !== '0') console.log(smokeOut.split('\n').filter((l) => l.includes('❌')).join('\n'));

console.log('\n4) 主令牌强度（本地无法读取 secret，需单独体检）');
info('主令牌是 Cloudflare secret，本地读不到，preflight 无法代替检查。');
info('部署/更换令牌后请执行：');
info('  echo -n "<你的令牌>" | node scripts/check-token.js');
info('或直接生成一个合格令牌：');
info('  openssl rand -base64 32 | wrangler secret put AUTH_TOKEN');
info('运行期兜底：令牌过弱时 Worker 日志会告警，登录后界面也会显示提示条。');

console.log('\n5) Cloudflare Access 信任模式（可选）');
// 配置优先级与运行时一致：secret/vars 注入的 env 看不到，只能从 .dev.vars / 环境变量 /
// wrangler.toml 的 [vars] 段里找。这里只做「一致性」检查，值本身不是机密。
function readDevVars() {
  const p = ROOT + '/.dev.vars';
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const mm = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (mm) out[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
function readTomlVars() {
  const out = {};
  const seg = toml.split(/^\s*\[vars\]\s*$/m)[1];
  if (!seg) return out;
  for (const line of seg.split(/^\s*\[/m)[0].split('\n')) {
    const mm = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/);
    if (mm) out[mm[1]] = mm[2];
  }
  return out;
}
const vars = Object.assign({}, readTomlVars(), readDevVars());
// 环境变量优先级最高，但只有真的设置了才覆盖（否则 undefined 会把读到的值抹掉）
if (process.env.ACCESS_TEAM_DOMAIN) vars.ACCESS_TEAM_DOMAIN = process.env.ACCESS_TEAM_DOMAIN;
if (process.env.ACCESS_AUD) vars.ACCESS_AUD = process.env.ACCESS_AUD;
const teamCfg = String(vars.ACCESS_TEAM_DOMAIN || '').trim();
const audCfg = String(vars.ACCESS_AUD || '').trim();

if (!teamCfg && !audCfg) {
  info('未启用 —— 打开页面时输入 AUTH_TOKEN 登录（应用内会话，30 天有效）');
} else if (teamCfg && !audCfg) {
  ok(false, '只配了 ACCESS_TEAM_DOMAIN，缺 ACCESS_AUD',
    '两者必须同时设置，否则运行时整段禁用，你会以为开了 Access 模式其实没开');
} else if (!teamCfg && audCfg) {
  ok(false, '只配了 ACCESS_AUD，缺 ACCESS_TEAM_DOMAIN',
    '两者必须同时设置，否则运行时整段禁用');
} else {
  const team = teamCfg.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  ok(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(team),
    'ACCESS_TEAM_DOMAIN 格式合法（' + team + '）',
    '应形如 yourteam.cloudflareaccess.com，不要带 https:// 或路径');
  ok(/^[0-9a-f]{64}$/i.test(audCfg), 'ACCESS_AUD 形如 64 位十六进制',
    '在 Access → Access → 你的应用 → Overview 里找 Application Audience (AUD) Tag');
  ok(!/^https?:\/\//.test(teamCfg), 'team 域名未带协议前缀（代码会容错，但配置应干净）');
  info('已启用：浏览器请求验 Cf-Access-Jwt-Assertion（RS256 + aud + exp）通过即登入，不再弹令牌框');
  info('AUTH_TOKEN 如仍保留，则退化为纯 API / 日历订阅用途；建议保留（workers.dev 那类入口只能靠它）');
}

if (fail) { console.log('\n[preflight] 未通过（' + fail + ' 项失败），终止部署'); process.exit(1); }
console.log('\n[preflight] 全部通过，可以 deploy');
