'use strict';

/* Workers 垫片：对外保持 Node 版签名 (cfg, title, content)，
 * 内部把 globalThis.ENV（DO 在每个请求入口写入）传给 Workers 版实现。
 * 这样 biz/routes.js 与 biz/reminder.js 的既有调用点无需改动。
 */

const W = require('../src/notifier.js');

module.exports = {
  CHANNELS: W.CHANNELS,
  enabledChannels: W.enabledChannels,
  assertSafeBarkServer: W.assertSafeBarkServer,
  isBlockedIp: W.isBlockedIp,
  notifyAll(cfg, title, content) {
    return W.notifyAll((typeof ENV !== 'undefined' && ENV) || globalThis.ENV || {}, cfg, title, content);
  },
};
