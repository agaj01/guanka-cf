'use strict';

/* 会话表与登录限流（持久化在 Durable Object Storage）。
 *
 * 为什么放在 DO Storage 而不是内存：
 * - 上游版本把会话凭证直接写进 Cookie（Cookie 值 == AUTH_TOKEN），因此无需服务端状态，
 *   代价是无法单独吊销、主令牌泄露即永久泄露。这里改成真正的服务端会话表。
 * - 登录失败计数同样落盘：Workers 的 isolate 随时可能被回收，内存态限流会被重启清零，
 *   攻击者只要等到实例回收就能重置爆破预算。
 *
 * 时间戳说明：本模块只用绝对纪元毫秒（Date.now()），因为这些值只做比较、不参与
 * 任何面向用户的日期展示，不需要 UTC+8 锚定（业务层的 NOW() 是另一套语义）。
 */

const SESSION_PREFIX = 'sess:';
const RATE_PREFIX = 'rate:';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 绝对有效期 30 天
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;      // lastSeen 最多 5 分钟写一次，省写放大
const MAX_FAILS = 5;                          // 连续失败阈值
const MAX_LOCK_S = 3600;                      // 锁定时长上限 1 小时

class SessionStore {
  constructor(state) {
    this.storage = state.storage;
  }

  /* ---------------- 会话 ---------------- */

  async create(sid, ip, ua) {
    const now = Date.now();
    const rec = { createdAt: now, lastSeen: now, ip: String(ip || ''), ua: String(ua || '').slice(0, 180) };
    await this.storage.put(SESSION_PREFIX + sid, rec);
    return rec;
  }

  /** 取有效会话；过期/不存在返回 null（顺手清理过期项） */
  async get(sid) {
    if (!sid) return null;
    const key = SESSION_PREFIX + sid;
    const rec = await this.storage.get(key);
    if (!rec) return null;
    const now = Date.now();
    if (!rec.createdAt || now - rec.createdAt > SESSION_TTL_MS) {
      await this.storage.delete(key);
      return null;
    }
    // 滑动续期：仅记录活跃时间，不延长绝对有效期（避免会话永不失效）
    if (!rec.lastSeen || now - rec.lastSeen > TOUCH_INTERVAL_MS) {
      rec.lastSeen = now;
      await this.storage.put(key, rec);
    }
    return rec;
  }

  async revoke(sid) {
    if (!sid) return false;
    await this.storage.delete(SESSION_PREFIX + sid);
    return true;
  }

  /** 吊销全部会话（keepSid 指定保留当前会话）；返回吊销数量 */
  async revokeAll(keepSid) {
    const map = await this.storage.list({ prefix: SESSION_PREFIX });
    let n = 0;
    for (const key of map.keys()) {
      if (keepSid && key === SESSION_PREFIX + keepSid) continue;
      await this.storage.delete(key);
      n++;
    }
    return n;
  }

  /** 会话列表（不含 id 明文，只给短指纹，够用户辨认设备） */
  async list(currentSid) {
    const map = await this.storage.list({ prefix: SESSION_PREFIX });
    const now = Date.now();
    const out = [];
    for (const [key, rec] of map) {
      const sid = key.slice(SESSION_PREFIX.length);
      if (!rec || !rec.createdAt || now - rec.createdAt > SESSION_TTL_MS) continue;
      out.push({
        id: sid.slice(0, 8),
        current: sid === currentSid,
        createdAt: new Date(rec.createdAt).toISOString(),
        lastSeen: new Date(rec.lastSeen || rec.createdAt).toISOString(),
        ip: rec.ip || '',
        ua: rec.ua || '',
      });
    }
    return out.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  }

  /** 按短指纹吊销（用户从列表里点「下线」） */
  async revokeByPrefix(prefix) {
    if (!prefix || prefix.length < 6) return false;
    const map = await this.storage.list({ prefix: SESSION_PREFIX });
    for (const key of map.keys()) {
      if (key.slice(SESSION_PREFIX.length).startsWith(prefix)) {
        await this.storage.delete(key);
        return true;
      }
    }
    return false;
  }

  /* ---------------- 登录限流（指数退避） ---------------- */

  /** 是否处于锁定期：{ locked, wait } */
  async gate(ip) {
    const rec = await this.storage.get(RATE_PREFIX + ip);
    if (!rec || !rec.until) return { locked: false, wait: 0, strikes: (rec && rec.strikes) || 0 };
    const left = rec.until - Date.now();
    if (left > 0) return { locked: true, wait: Math.ceil(left / 1000), strikes: rec.strikes || 0 };
    // 锁已过期：保留 strikes（继续升级退避），清零计数
    rec.until = 0;
    rec.fails = 0;
    await this.storage.put(RATE_PREFIX + ip, rec);
    return { locked: false, wait: 0, strikes: rec.strikes || 0 };
  }

  /** 记一次失败：第 5 次起按 60s → 120s → ... → 1h 递增锁定 */
  async fail(ip) {
    const key = RATE_PREFIX + ip;
    const rec = (await this.storage.get(key)) || { fails: 0, strikes: 0, until: 0 };
    rec.fails = (rec.fails || 0) + 1;
    if (rec.fails >= MAX_FAILS) {
      rec.strikes = Math.min(8, (rec.strikes || 0) + 1);
      const lockS = Math.min(MAX_LOCK_S, 60 * Math.pow(2, rec.strikes - 1));
      rec.until = Date.now() + lockS * 1000;
      rec.fails = 0;
    }
    await this.storage.put(key, rec);
    return { strikes: rec.strikes || 0, until: rec.until || 0 };
  }

  /** 登录成功：清空该 IP 的失败记录 */
  async reset(ip) {
    await this.storage.delete(RATE_PREFIX + ip);
  }
}

module.exports = { SessionStore, SESSION_TTL_MS, MAX_FAILS, MAX_LOCK_S };
