'use strict';

const fs = require('fs');
const path = require('path');

// JSON 文件存储：内存缓存 + 临时文件原子写入，容器内配合 /app/data 卷持久化
class Store {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();
  }

  _file(name) { return path.join(this.dir, name + '.json'); }

  read(name, fallback) {
    if (this.cache.has(name)) return this.cache.get(name);
    let data = fallback;
    try {
      data = JSON.parse(fs.readFileSync(this._file(name), 'utf8'));
    } catch (e) { /* 文件不存在或损坏时用默认值 */ }
    this.cache.set(name, data);
    return data;
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
