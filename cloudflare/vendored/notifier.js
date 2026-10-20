'use strict';
// Workers 垫片：对外暴露 Node 版签名（routes.js / reminder.js 的既有调用点零改动）
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
