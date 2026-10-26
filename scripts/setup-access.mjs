#!/usr/bin/env node
/**
 * 给已部署的 Worker 套上 Cloudflare Access（零信任），并把 ACCESS_TEAM_DOMAIN /
 * ACCESS_AUD 写进 wrangler.toml 的 [vars]，让 Worker 的「Access 信任模式」生效。
 *
 * 用法：
 *   export CLOUDFLARE_API_TOKEN=xxx   # 需要 Access: Apps and Policies (Edit)
 *                                     #      + Access: Organizations, IdPs, Groups (Read)
 *   export CLOUDFLARE_ACCOUNT_ID=f44f91bb44640d0565309ef3b8c0862e
 *   export APP_DOMAIN=card.agaj.eu.org
 *   export ACCESS_EMAILS="Jinglei1@msn.com"
 *   node scripts/setup-access.mjs
 *
 * 可选环境变量：
 *   ACCESS_APP_NAME   应用名，默认「管卡」
 *   ACCESS_SESSION    登录有效期，默认 168h（7 天）
 *   ACCESS_STRICT=1   不允许 One-time PIN（默认允许：邮箱收验证码即可登录）
 *   ACCESS_NO_WRITE=1 只建应用、不改 wrangler.toml
 *
 * 令牌权限最小化参考（Dashboard → My Profile → API Tokens → Create Token）：
 *   Account · Access: Apps and Policies · Edit
 *   Account · Access: Organizations, Identity Providers, and Groups · Read
 *   Account · Account Settings · Read（读 account id 用，可直接填环境变量跳过）
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const DOMAIN = (process.env.APP_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
const EMAILS = (process.env.ACCESS_EMAILS || '')
  .split(/[,;\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);
const APP_NAME = process.env.ACCESS_APP_NAME || '管卡';
const SESSION = process.env.ACCESS_SESSION || '168h';
const STRICT = process.env.ACCESS_STRICT === '1';
const NO_WRITE = process.env.ACCESS_NO_WRITE === '1';

const API = 'https://api.cloudflare.com/client/v4';

function fail(msg, detail) {
  console.error(`\n✖ ${msg}`);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  process.exit(1);
}

async function cf(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const err = new Error(`${init.method || 'GET'} ${path} → HTTP ${res.status}`);
    err.body = body;
    throw err;
  }
  return body.result;
}

/** 把两个键写进 [vars] 段（幂等；不会碰注释里的示例行） */
function upsertVars(toml, vars) {
  let out = toml;
  for (const k of Object.keys(vars)) {
    out = out.replace(new RegExp(`^${k}\\s*=.*\\n?`, 'gm'), '');
  }
  const lines = Object.keys(vars).map((k) => `${k} = "${vars[k]}"`).join('\n');
  if (/^\[vars\]\s*$/m.test(out)) {
    out = out.replace(/^\[vars\]\s*$/m, `[vars]\n${lines}`);
  } else {
    out = out.replace(/\s*$/, '\n') +
      '\n# ── Cloudflare Access 信任模式 ─────────────────────────────────\n' +
      '# 由 scripts/setup-access.mjs 写入；AUD 本来就写在每个签发的 JWT 里，不算机密。\n' +
      `[vars]\n${lines}\n`;
  }
  return out;
}

(async () => {
  if (!TOKEN) fail('缺少 CLOUDFLARE_API_TOKEN');
  if (!ACCOUNT) fail('缺少 CLOUDFLARE_ACCOUNT_ID');
  if (!DOMAIN) fail('缺少 APP_DOMAIN，例如 card.agaj.eu.org');
  if (!EMAILS.length) fail('缺少 ACCESS_EMAILS，用逗号分隔允许访问的邮箱');

  console.log(`账户 ${ACCOUNT}\n域名 ${DOMAIN}\n允许邮箱 ${EMAILS.join(', ')}\n会话时长 ${SESSION}\n`);

  // 1. Zero Trust 组织（team domain）必须已初始化
  let org = null;
  try {
    org = await cf(`/accounts/${ACCOUNT}/access/organizations`);
  } catch (e) {
    fail(
      'Zero Trust 组织尚未初始化',
      '请先打开 https://one.dash.cloudflare.com 完成初始化（设置 team domain，免费计划即可），然后重新运行本脚本。'
    );
  }
  const authDomain = String(org.auth_domain || '').replace(/\.cloudflareaccess\.com$/, '');
  if (!authDomain) fail('Zero Trust 组织缺少 auth_domain', org);
  console.log(`✓ Zero Trust 组织：${authDomain}.cloudflareaccess.com`);

  // 2. 登录方式（One-time PIN 是免费计划里最省事的：邮箱收码即可）
  const idps = await cf(`/accounts/${ACCOUNT}/access/identity_providers`);
  const otp = (idps || []).find((i) => i.type === 'onetimepin');
  if (!otp && !STRICT) {
    console.log('! 未找到 One-time PIN 登录方式 → 到 Zero Trust → Settings → Authentication 启用它，否则只能走已配置的 SSO');
  } else if (otp) {
    console.log('✓ 登录方式：One-time PIN（邮箱验证码）');
  }

  // 3. 应用（同域名已存在则复用并更新为 168h）
  const apps = await cf(`/accounts/${ACCOUNT}/access/apps?per_page=100`);
  let app = (apps || []).find((a) => a.domain === DOMAIN);
  if (app) {
    console.log(`✓ 已有 Access 应用：${app.name}（${app.id}），更新为 ${SESSION}`);
    app = await cf(`/accounts/${ACCOUNT}/access/apps/${app.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: app.name,
        domain: DOMAIN,
        type: 'self_hosted',
        session_duration: SESSION,
        app_launcher_visible: false,
        auto_redirect_to_identity: false,
        allowed_idps: otp && !STRICT ? [otp.id] : undefined,
      }),
    });
  } else {
    app = await cf(`/accounts/${ACCOUNT}/access/apps`, {
      method: 'POST',
      body: JSON.stringify({
        name: APP_NAME,
        domain: DOMAIN,
        type: 'self_hosted',
        session_duration: SESSION,
        app_launcher_visible: false,
        auto_redirect_to_identity: false,
        allowed_idps: otp && !STRICT ? [otp.id] : undefined,
      }),
    });
    console.log(`✓ 已创建 Access 应用：${app.name}（${app.id}）`);
  }

  // 4. 策略：只允许名单内邮箱
  const policies = await cf(`/accounts/${ACCOUNT}/access/apps/${app.id}/policies`);
  const wanted = {
    name: 'Only my emails',
    decision: 'allow',
    include: EMAILS.map((email) => ({ email: { email } })),
    require: [],
    exclude: [],
  };
  const existing = (policies || []).find((p) => p.name === wanted.name);
  if (existing) {
    await cf(`/accounts/${ACCOUNT}/access/apps/${app.id}/policies/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(wanted),
    });
    console.log(`✓ 已更新策略（${EMAILS.length} 个邮箱）`);
  } else {
    await cf(`/accounts/${ACCOUNT}/access/apps/${app.id}/policies`, {
      method: 'POST',
      body: JSON.stringify(wanted),
    });
    console.log(`✓ 已创建策略（${EMAILS.length} 个邮箱）`);
  }

  // 5. 日历订阅路径例外：日历客户端（Apple/Google 日历）过不了 Access 登录，
  //    这条路径必须 bypass，改由应用自己的 HMAC 派生只读令牌把关。
  const ICS_DOMAIN = `${DOMAIN}/api/calendar.ics`;
  let icsApp = (apps || []).find((a) => a.domain === ICS_DOMAIN);
  if (!icsApp) {
    icsApp = await cf(`/accounts/${ACCOUNT}/access/apps`, {
      method: 'POST',
      body: JSON.stringify({
        name: `${APP_NAME} · 日历订阅（免 Access 登录）`,
        domain: ICS_DOMAIN,
        type: 'self_hosted',
        session_duration: '24h',
        app_launcher_visible: false,
      }),
    });
    console.log(`✓ 已创建日历路径例外：${ICS_DOMAIN}`);
  } else {
    console.log(`✓ 已有日历路径例外：${ICS_DOMAIN}`);
  }
  const icsPolicies = await cf(`/accounts/${ACCOUNT}/access/apps/${icsApp.id}/policies`);
  const icsWanted = { name: 'Bypass (calendar clients)', decision: 'bypass', include: [{ everyone: {} }], require: [], exclude: [] };
  const icsExisting = (icsPolicies || []).find((p) => p.name === icsWanted.name);
  if (icsExisting) {
    await cf(`/accounts/${ACCOUNT}/access/apps/${icsApp.id}/policies/${icsExisting.id}`, { method: 'PUT', body: JSON.stringify(icsWanted) });
    console.log('✓ 已更新日历例外策略（bypass）');
  } else {
    await cf(`/accounts/${ACCOUNT}/access/apps/${icsApp.id}/policies`, { method: 'POST', body: JSON.stringify(icsWanted) });
    console.log('✓ 已创建日历例外策略（bypass）');
  }

  // 6. 写回 wrangler.toml（Worker 靠这两个值验 Cf-Access-Jwt-Assertion）
  const aud = app.aud;
  const teamDomain = `${authDomain}.cloudflareaccess.com`;
  if (!aud) fail('应用没有返回 AUD，无法配置 Worker 的 Access 信任模式', app);
  if (NO_WRITE) {
    console.log(`\nACCESS_TEAM_DOMAIN=${teamDomain}\nACCESS_AUD=${aud}`);
  } else {
    const p = resolve(ROOT, 'wrangler.toml');
    if (!existsSync(p)) fail('找不到 wrangler.toml');
    const before = readFileSync(p, 'utf8');
    const after = upsertVars(before, { ACCESS_TEAM_DOMAIN: teamDomain, ACCESS_AUD: aud });
    writeFileSync(p, after, 'utf8');
    console.log(`✓ 已写入 wrangler.toml [vars]：ACCESS_TEAM_DOMAIN / ACCESS_AUD`);
  }

  console.log(`\n下一步：npm run deploy（把 vars 带上线）`);
  console.log(`完成后访问 https://${DOMAIN} 会先跳 Access 登录（会话 ${SESSION}），名单外邮箱一律拒绝。`);
  console.log('Worker 侧：验签通过即建会话，页面不再输 AUTH_TOKEN；AUTH_TOKEN 退化为纯 API / 日历用途。');
})().catch((e) => {
  if (e.body?.errors) fail(e.message, e.body.errors);
  fail(e.message);
});
