'use strict';

const fs = require('fs');
const path = require('path');

/**
 * JSON 文件存储：内存缓存 + 临时文件原子写入，容器内配合 /app/data 卷持久化。
 *
 * 两个安全约束（第七轮复盘 R7-1 / R7-2）：
 *  1. 读到「合法 JSON 但不是数组」的数据集（例如被外部工具写成了 `{}`）时，
 *     绝不能把这种值交给业务层——`.map()` / `.push()` 会直接抛 TypeError，
 *     轻则接口 500、重则整个进程启动失败。readArray() 会归一为空数组。
 *  2. 文件内容损坏（JSON 语法错误）时**不再静默回退**：静默回退等于把用户全部
 *     数据当成空的，之后任意一次写入都会用空数据覆盖原文件、永久丢失。
 *     现在把坏文件改名隔离（`.bad-<时间戳>`）并告警，用户仍可手工抢救。
 */
class Store {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();
    this.warnings = [];      // 启动期数据异常告警（由 index.js 打印）
    this._quarantined = new Set();
  }

  _file(name) { return path.join(this.dir, name + '.json'); }

  /** 把无法安全使用的数据文件改名隔离，避免后续写入覆盖原内容 */
  _quarantine(name, reason) {
    if (this._quarantined.has(name)) return '';
    this._quarantined.add(name);
    const src = this._file(name);
    const dst = src + '.bad-' + Date.now();
    let moved = false;
    try {
      if (fs.existsSync(src)) { fs.renameSync(src, dst); moved = true; }
    } catch (e) { /* 改名失败：至少不阻断启动 */ }
    const msg = name + '.json ' + reason + (moved ? '，已隔离为 ' + path.basename(dst) : '') + '，本次以空数据继续';
    this.warnings.push(msg);
    console.error('[管卡] ' + msg);
    return moved ? dst : '';
  }

  read(name, fallback) {
    if (this.cache.has(name)) return this.cache.get(name);
    let data = fallback;
    let raw = null;
    try {
      raw = fs.readFileSync(this._file(name), 'utf8');
    } catch (e) { /* 文件不存在：首次启动的正常路径 */ }
    if (raw !== null) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        this._quarantine(name, '内容不是合法 JSON');
        data = fallback; // 保持调用方给的默认值
      }
    }
    this.cache.set(name, data);
    return data;
  }

  /**
   * 读取「必须是数组」的数据集（cards / mycards / consumptions / benefits / bills / billGroups）。
   * 类型不符时隔离原文件并回退空数组，保证调用方拿到的永远是数组。
   */
  readArray(name) {
    const cached = this.cache.get(name);
    if (Array.isArray(cached)) return cached;
    const v = this.read(name, []);
    if (Array.isArray(v)) return v;
    const kind = v === null ? 'null' : (Array.isArray(v) ? 'array' : typeof v);
    this._quarantine(name, '内容不是数组（实际为 ' + kind + '）');
    this.cache.set(name, []);
    return [];
  }

  /** 读取「必须是对象」的配置类数据；类型不符时回退默认值（不隔离文件，配置可重建） */
  readObject(name, fallback) {
    const v = this.read(name, fallback);
    const isPlain = v !== null && typeof v === 'object' && !Array.isArray(v);
    if (isPlain) return v;
    this.cache.set(name, fallback);
    return fallback;
  }

  write(name, data) {
    this.cache.set(name, data);
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = this._file(name) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, this._file(name));
  }
}

module.exports = { Store };
