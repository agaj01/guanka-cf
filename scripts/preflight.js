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

console.log('\n2) 关键文件');
for (const f of ['src/worker.js', 'src/do.js', 'src/auth.js', 'src/session.js',
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

if (fail) { console.log('\n[preflight] 未通过（' + fail + ' 项失败），终止部署'); process.exit(1); }
console.log('\n[preflight] 全部通过，可以 deploy');
