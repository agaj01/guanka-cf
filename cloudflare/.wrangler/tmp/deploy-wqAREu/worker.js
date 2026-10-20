var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    if (!("__unenv__" in performance)) {
      const proto = Performance.prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !(key in performance)) {
          const desc = Object.getOwnPropertyDescriptor(proto, key);
          if (desc) {
            Object.defineProperty(performance, key, desc);
          }
        }
      }
    }
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, workerdProcess, unenvProcess, exit, features, platform, _channel, _debugEnd, _debugProcess, _disconnect, _events, _eventsCount, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _handleQueue, _kill, _linkedBinding, _maxListeners, _pendingMessage, _preload_modules, _rawDebug, _send, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, assert2, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, disconnect, dlopen, domain, emit, emitWarning, env, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, hrtime3, initgroups, kill, listenerCount, listeners, loadEnvFile, mainModule, memoryUsage, moduleLoadList, nextTick, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions, _process, process_default;
var init_process2 = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    workerdProcess = getBuiltinModule("node:process");
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess.nextTick
    });
    ({ exit, features, platform } = workerdProcess);
    ({
      _channel,
      _debugEnd,
      _debugProcess,
      _disconnect,
      _events,
      _eventsCount,
      _exiting,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _handleQueue,
      _kill,
      _linkedBinding,
      _maxListeners,
      _pendingMessage,
      _preload_modules,
      _rawDebug,
      _send,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      arch,
      argv,
      argv0,
      assert: assert2,
      availableMemory,
      binding,
      channel,
      chdir,
      config,
      connected,
      constrainedMemory,
      cpuUsage,
      cwd,
      debugPort,
      disconnect,
      dlopen,
      domain,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exitCode,
      finalization,
      getActiveResourcesInfo,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getMaxListeners,
      getuid,
      hasUncaughtExceptionCaptureCallback,
      hrtime: hrtime3,
      initgroups,
      kill,
      listenerCount,
      listeners,
      loadEnvFile,
      mainModule,
      memoryUsage,
      moduleLoadList,
      nextTick,
      off,
      on,
      once,
      openStdin,
      permission,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      reallyExit,
      ref,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      send,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setMaxListeners,
      setSourceMapsEnabled,
      setuid,
      setUncaughtExceptionCaptureCallback,
      sourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      throwDeprecation,
      title,
      traceDeprecation,
      umask,
      unref,
      uptime,
      version,
      versions
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// src/store.js
var require_store = __commonJS({
  "src/store.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var DATASETS = [
      "cards",
      "meta",
      "mycards",
      "consumptions",
      "benefits",
      "bills",
      "billGroups",
      "settings",
      "notify",
      "memberships",
      "vouchers",
      "voucherBrands",
      "knowledge"
    ];
    var OBJECT_DATASETS = /* @__PURE__ */ new Set(["meta", "settings", "notify"]);
    var Store2 = class {
      static {
        __name(this, "Store");
      }
      constructor(ctx) {
        this.ctx = ctx;
        this.cache = /* @__PURE__ */ new Map();
        this.warnings = [];
        this._quarantined = /* @__PURE__ */ new Set();
        this._pending = [];
        this._warmed = false;
      }
      _key(name) {
        return "ds:" + name;
      }
      /** 冷启动预热：await 拉全部已知数据集进缓存（含类型校验 + 坏值隔离）。
       *  必须在 routes.init/任何业务读之前完成（do.js 在 blockConcurrencyWhile 内调用）。
       *  幂等：重复调用直接返回。 */
      async warmup() {
        if (this._warmed) return;
        for (const name of DATASETS) {
          const raw = await this.ctx.storage.get(this._key(name));
          if (raw === void 0) continue;
          const typeOk = OBJECT_DATASETS.has(name) ? raw !== null && typeof raw === "object" && !Array.isArray(raw) : Array.isArray(raw);
          if (typeOk) {
            this.cache.set(name, raw);
            continue;
          }
          const expect = OBJECT_DATASETS.has(name) ? "\u5BF9\u8C61" : "\u6570\u7EC4";
          await this._quarantine(name, "\u5185\u5BB9\u4E0D\u662F" + expect + "\uFF08\u5B9E\u9645\u4E3A " + (raw === null ? "null" : typeof raw) + "\uFF09", raw);
        }
        this._warmed = true;
      }
      /** 同步读：仅操作缓存（warmup 后必命中；未预热场景回退默认值，不触持久层） */
      read(name, fallback) {
        if (this.cache.has(name)) return this.cache.get(name);
        this.cache.set(name, fallback);
        return fallback;
      }
      readArray(name) {
        const cached = this.cache.get(name);
        if (Array.isArray(cached)) return cached;
        const v = this.read(name, []);
        if (Array.isArray(v)) return v;
        const kind = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
        this._quarantine(name, "\u5185\u5BB9\u4E0D\u662F\u6570\u7EC4\uFF08\u5B9E\u9645\u4E3A " + kind + "\uFF09");
        this.cache.set(name, []);
        return [];
      }
      readObject(name, fallback) {
        const v = this.read(name, fallback);
        const isPlain = v !== null && typeof v === "object" && !Array.isArray(v);
        if (isPlain || v === fallback) return v;
        this.cache.set(name, fallback);
        return fallback;
      }
      /** 同步写：缓存即时生效，持久化入队（put 失败经 flush 在请求层抛出 → 500） */
      write(name, data) {
        this.cache.set(name, data);
        this._pending.push(this.ctx.storage.put(this._key(name), data));
      }
      /** 请求收尾：等待本请求排队的全部落盘写完成；任一失败即抛出（由 do.js 捕获返回 500）。
       *  DO 串行语义下无并发请求交叉，flush 后队列必空。 */
      async flush() {
        const pending = this._pending.splice(0);
        await Promise.all(pending);
      }
      /** 隔离坏值：挪到 bad:* 备份 key（异步入队），主数据回退默认值，用户数据可抢救。
       *  raw 提供时（warmup 路径）落备份；未提供（内存防御路径）仅告警。 */
      async _quarantine(name, reason, raw) {
        if (this._quarantined.has(name)) return;
        this._quarantined.add(name);
        if (raw !== void 0) {
          const dst = "bad:" + name + ":" + Date.now();
          try {
            this._pending.push(this.ctx.storage.put(dst, raw));
            this.warnings.push(name + " \u6570\u636E\u7C7B\u578B\u5F02\u5E38\uFF08" + reason + "\uFF09\uFF0C\u5DF2\u9694\u79BB\u4E3A " + dst + "\uFF0C\u672C\u6B21\u4EE5\u7A7A\u6570\u636E\u7EE7\u7EED");
          } catch (e) {
          }
        }
        this.warnings.push(name + " " + reason + "\uFF0C\u672C\u6B21\u4EE5\u7A7A\u6570\u636E\u7EE7\u7EED");
      }
    };
    module.exports = { Store: Store2 };
  }
});

// src/time.js
var require_time = __commonJS({
  "src/time.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var TZ_OFFSET_MS = 8 * 3600 * 1e3;
    function nowBJ2() {
      return new Date(Date.now() + TZ_OFFSET_MS);
    }
    __name(nowBJ2, "nowBJ");
    module.exports = { nowBJ: nowBJ2, TZ_OFFSET_MS };
  }
});

// node-built-in-modules:crypto
import libDefault from "crypto";
var require_crypto = __commonJS({
  "node-built-in-modules:crypto"(exports, module) {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault;
  }
});

// vendored/util.js
var require_util = __commonJS({
  "vendored/util.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function parseAmount(v) {
      if (v == null) return 0;
      if (typeof v === "number") return v;
      const s = String(v).trim().replace(/,/g, "");
      if (!s) return 0;
      const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(亿|万|千|百)?/);
      if (!m) return 0;
      let n = parseFloat(m[1]);
      switch (m[2]) {
        case "\u4EBF":
          n *= 1e8;
          break;
        case "\u4E07":
          n *= 1e4;
          break;
        case "\u5343":
          n *= 1e3;
          break;
        case "\u767E":
          n *= 100;
          break;
        default:
          break;
      }
      return Math.round(n * 100) / 100;
    }
    __name(parseAmount, "parseAmount");
    function pad2(n) {
      return String(n).padStart(2, "0");
    }
    __name(pad2, "pad2");
    function toDateStr(d) {
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }
    __name(toDateStr, "toDateStr");
    function todayStr() {
      return toDateStr(NOW());
    }
    __name(todayStr, "todayStr");
    function parseDateStr(s) {
      const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      const y = +m[1];
      const mo = +m[2];
      const d = +m[3];
      const dt = new Date(y, mo - 1, d);
      if (isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
      return dt;
    }
    __name(parseDateStr, "parseDateStr");
    function startOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    __name(startOfDay, "startOfDay");
    function daysBetween(fromStr, to) {
      const a = parseDateStr(fromStr);
      if (!a) return 0;
      return Math.round((startOfDay(to) - startOfDay(a)) / 864e5);
    }
    __name(daysBetween, "daysBetween");
    function feeDateIn(year, feeMonth, feeDay) {
      const m = Math.min(12, Math.max(1, Math.round(Number(feeMonth) || 1)));
      const d = Math.min(daysInMonth(year, m), Math.max(1, Math.round(Number(feeDay) || 1)));
      return new Date(year, m - 1, d);
    }
    __name(feeDateIn, "feeDateIn");
    function nextFeeDate(feeMonth, feeDay, now) {
      const y = now.getFullYear();
      let d = feeDateIn(y, feeMonth, feeDay);
      if (startOfDay(d) < startOfDay(now)) d = feeDateIn(y + 1, feeMonth, feeDay);
      return d;
    }
    __name(nextFeeDate, "nextFeeDate");
    function daysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }
    __name(daysInMonth, "daysInMonth");
    function clampFeeDate(month, day) {
      const y = NOW().getFullYear();
      const m = Math.min(12, Math.max(1, Math.round(Number(month) || 1)));
      const dMax = daysInMonth(y, m);
      const d = Math.min(dMax, Math.max(1, Math.round(Number(day) || 1)));
      return { m, d };
    }
    __name(clampFeeDate, "clampFeeDate");
    function feeCountdown(feeMonth, feeDay, now) {
      return Math.round((nextFeeDate(feeMonth, feeDay, now) - startOfDay(now)) / 864e5);
    }
    __name(feeCountdown, "feeCountdown");
    function cardYearStart(feeMonth, feeDay, now) {
      const y = now.getFullYear();
      let d = feeDateIn(y, feeMonth, feeDay);
      if (d > now) d = feeDateIn(y - 1, feeMonth, feeDay);
      return d;
    }
    __name(cardYearStart, "cardYearStart");
    function cycleStart(resetCycle, feeMonth, feeDay, now) {
      if (resetCycle === "\u81EA\u7136\u6708") return new Date(now.getFullYear(), now.getMonth(), 1);
      if (resetCycle === "\u81EA\u7136\u5E74") return new Date(now.getFullYear(), 0, 1);
      if (resetCycle === "\u4E00\u6B21\u6027" || resetCycle === "\u65E0\u56FA\u5B9A") return new Date(1970, 0, 1);
      return cardYearStart(feeMonth, feeDay, now);
    }
    __name(cycleStart, "cycleStart");
    function cycleKeyOf(resetCycle, feeMonth, feeDay, dateStr) {
      if (resetCycle === "\u81EA\u7136\u6708") return dateStr.slice(0, 7);
      if (resetCycle === "\u81EA\u7136\u5E74") return dateStr.slice(0, 4);
      if (resetCycle === "\u4E00\u6B21\u6027" || resetCycle === "\u65E0\u56FA\u5B9A") return resetCycle;
      const md = pad2(feeMonth) + "-" + pad2(feeDay);
      const y = +dateStr.slice(0, 4);
      return (dateStr.slice(5) >= md ? y : y - 1) + "-" + md + " \u8D77";
    }
    __name(cycleKeyOf, "cycleKeyOf");
    function cycleLabelOf(resetCycle, feeMonth, feeDay, dateStr) {
      if (resetCycle === "\u81EA\u7136\u6708") return dateStr.slice(0, 7);
      if (resetCycle === "\u81EA\u7136\u5E74") return dateStr.slice(0, 4) + " \u5E74";
      return cycleKeyOf(resetCycle, feeMonth, feeDay, dateStr);
    }
    __name(cycleLabelOf, "cycleLabelOf");
    function parseCSV(text) {
      text = String(text || "").replace(/^\uFEFF/, "");
      const rows = [];
      let row = [];
      let field = "";
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
          if (c === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i++;
            } else inQuotes = false;
          } else field += c;
        } else if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          row.push(field);
          field = "";
        } else if (c === "\n") {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        } else if (c !== "\r") {
          field += c;
        }
      }
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
      }
      return rows.filter((r) => r.some((f) => String(f).trim() !== ""));
    }
    __name(parseCSV, "parseCSV");
    function toCSV(rows) {
      const body = rows.map((r) => r.map((f) => {
        f = f == null ? "" : String(f);
        return /[",\n\r]/.test(f) ? '"' + f.replace(/"/g, '""') + '"' : f;
      }).join(",")).join("\r\n");
      return "\uFEFF" + body;
    }
    __name(toCSV, "toCSV");
    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
    __name(uid, "uid");
    function fmtMoney(n) {
      const v = Number(n) || 0;
      return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    __name(fmtMoney, "fmtMoney");
    function fmtInt(n) {
      return (Number(n) || 0).toLocaleString("zh-CN");
    }
    __name(fmtInt, "fmtInt");
    module.exports = {
      parseAmount,
      toDateStr,
      todayStr,
      parseDateStr,
      startOfDay,
      daysBetween,
      nextFeeDate,
      feeCountdown,
      daysInMonth,
      clampFeeDate,
      cardYearStart,
      cycleStart,
      cycleKeyOf,
      cycleLabelOf,
      parseCSV,
      toCSV,
      uid,
      fmtMoney,
      fmtInt
    };
  }
});

// vendored/seed.js
var require_seed = __commonJS({
  "vendored/seed.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var SEED_CARDS = [
      // ---------------- 招商银行 ----------------
      { bank: "\u62DB\u5546\u94F6\u884C", name: "\u7ECF\u5178\u767D\u91D1\u5361\uFF08\u8FD0\u901A\uFF09", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 3600, waiverType: "\u79EF\u5206\u62B5\u6263", waiverCondition: "10000", waiverPolicy: "10000\u6C38\u4E45\u79EF\u5206\u53EF\u62B5\u6B21\u5E743600\u5143\u5E74\u8D39\uFF1B\u9644\u5C5E\u53615000\u79EF\u5206\u62B5\u6263", startCredit: 5e4, benefits: ["\u5168\u7403\u673A\u573A\u8D35\u5BBE\u53856\u6B21/\u5E74", "\u79EF\u5206\u5151\u6362\u91CC\u7A0B", "\u822A\u73ED\u5EF6\u8BEF\u9669"], applyCondition: "\u62DB\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "\u62DB\u884C\u7ECF\u5178\u9AD8\u7AEF\u5361\uFF0C\u6743\u76CA\u7A33\u5B9A" },
      { bank: "\u62DB\u5546\u94F6\u884C", name: "Young\u5361\uFF08\u9752\u5E74\u7248\uFF09", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 300, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "6\u4E07", waiverPolicy: "\u9996\u5E74\u514D\u5E74\u8D39\uFF0C\u6B21\u5E74\u8D77\u5237\u6EE16\u4E07\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u6BCF\u6708\u9996\u7B14\u53D6\u73B0\u514D\u624B\u7EED\u8D39", "\u751F\u65E5\u6708\u53CC\u500D\u79EF\u5206"], applyCondition: "30\u5C81\u4EE5\u4E0B\u9752\u5E74\u7533\u8BF7", note: "\u5E74\u8F7B\u4EBA\u9996\u5361" },
      { bank: "\u62DB\u5546\u94F6\u884C", name: "\u5317\u6597\u53F8\u673A\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u52A0\u6CB9\u8FD4\u73B05%", "\u505C\u8F66\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u62DB\u5546\u94F6\u884C", name: "\u54D4\u54E9\u54D4\u54E9\u8054\u540D\u4FE1\u7528\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 300, waiverType: "\u7B14\u6570\u5237\u514D", waiverCondition: "6\u7B14", waiverPolicy: "\u9996\u5E74\u514D\u5E74\u8D39\uFF0C\u6B21\u5E74\u8D776\u7B14\u5237\u514D", startCredit: 1e4, benefits: ["B\u7AD9\u5927\u4F1A\u5458\u6743\u76CA", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u62DB\u5546\u54D4\u54E9\u54D4\u54E9\u8054\u540D\u4FE1\u7528\u5361" },
      { bank: "\u62DB\u5546\u94F6\u884C", name: "\u81EA\u7531\u4EBA\u751F\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "8\u4E07", waiverPolicy: "\u5237\u6EE18\u4E07\u621620\u7B14\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 3e4, benefits: ["\u97F3\u4E50\u4F1A\u5458", "\u89C6\u9891\u4F1A\u5458", "\u5065\u5EB7\u4F53\u68C0"], applyCondition: "\u62DB\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u62DB\u5546\u94F6\u884C", name: "\u767E\u592B\u957F\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 3600, waiverType: "\u521A\u6027", waiverCondition: "0", waiverPolicy: "\u521A\u6027\u5E74\u8D39", startCredit: 1e5, benefits: ["\u65E0\u9650\u6B21\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97\u7CBE\u82F1\u4F1A\u7C4D", "FHR\u9152\u5E97\u6743\u76CA"], applyCondition: "\u62DB\u884C\u9080\u8BF7\u6216\u9AD8\u8BC4\u5206\u5BA2\u6237", note: "\u62DB\u884C\u9876\u7EA7\u5361" },
      // ---------------- 交通银行 ----------------
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "\u6807\u51C6\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054/VISA", annualFee: 1e3, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "10\u4E07", waiverPolicy: "\u5237\u6EE1\u4E00\u5B9A\u91D1\u989D\u6216\u6B21\u6570\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u79EF\u5206\u5151\u6362\u91CC\u7A0B", "\u9053\u8DEF\u6551\u63F4"], applyCondition: "\u4EA4\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "\u4EA4\u884C\u7ECF\u5178\u767D\u91D1\u5361" },
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "Y-POWER\u4FE1\u7528\u5361", level: "\u666E\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u53D6\u73B0100%\u989D\u5EA6", "\u5883\u5916\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "35\u5C81\u4EE5\u4E0B\u5BA2\u6237", note: "\u4EA4\u884CY-POWER" },
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "\u4F18\u9038\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["3\u6B21\u673A\u573A\u8D35\u5BBE\u5385", "\u7F8E\u5143\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4EA4\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "\u4EA4\u901A\u4F18\u9038\u767D\u91D1\u5361" },
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "\u871C\u5361\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u95FA\u871C\u6743\u76CA\u5171\u4EAB", "\u9152\u5E97\u4F18\u60E0"], applyCondition: "\u5973\u6027\u5BA2\u6237", note: "" },
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "\u4EAC\u4E1CPLUS\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u4EAC\u4E1CPLUS\u4F1A\u5458", "\u8D2D\u7269\u7ACB\u51CF"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u4EA4\u901A\u94F6\u884C", name: "\u6D1B\u5929\u4F9D\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 农业银行 ----------------
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u4E07\u4E8B\u8FBE\u5168\u7403\u652F\u4ED8\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "Mastercard", annualFee: 580, waiverType: "\u7B14\u6570\u5237\u514D", waiverCondition: "10\u7B14", waiverPolicy: "\u9996\u5E74\u514D\u5E74\u8D39\uFF0C\u6B21\u5E74\u8D7710\u7B14\u5237\u514D", startCredit: 1e4, benefits: ["\u514D\u8D27\u5E01\u8F6C\u6362\u8D39", "\u5883\u5916\u6D88\u8D39\u7B14\u7B14\u8FD41%\u65E0\u4E0A\u9650"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u51FA\u56FD\u5361" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u60A6\u5361\xB7\u60A6\u4EAB\u751F\u6D3B", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 160, waiverType: "\u521A\u6027", waiverCondition: "0", waiverPolicy: "\u521A\u6027\u5E74\u8D39", startCredit: 1e4, benefits: ["\u6BCF\u67088\u79EF\u5206\u62A210+20\u5238", "\u6BCF\u67081\u5206\u62A220\u8336\u996E\u5238", "\u6BCF\u6708\u8FBE\u6807888\u62A210\u5238", "\u6BCF\u6708\u8FBE\u68071888\u62A220\u5238", "\u6BCF\u6708\u8FBE\u68078888\u62A250\u5238"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u519C\u884C\u5FC5\u5165\u5361\u4E4B\u4E00" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "VISA\u5168\u7403\u652F\u4ED8\u5C0A\u4EAB\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "VISA", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e4, benefits: ["\u65E0\u9650\u6B21\u5883\u5916\u673A\u573A\u9F99\u817E\u8D35\u5BBE\u5385"], applyCondition: "\u4F53\u5236\u518515\u4E07\u3001\u7855\u58EB20\u4E07\u3001\u5176\u4ED630\u4E07\u4E2A\u7A0E\u5E74\u6536\u5165\uFF0C\u62166\u4E2A\u670850\u4E07\u8D44\u4EA7", note: "\u519C\u884C\u5FC5\u5165\u5361\u4E4B\u4E00" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u60A0\u7136\u60A6\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u533B\u7597\u9884\u7EA6"], applyCondition: "\u519C\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u5C0A\u7136\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054/VISA", annualFee: 880, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "10\u4E07", waiverPolicy: "\u5237\u6EE110\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u65E0\u9650\u6B21\u673A\u573A\u8D35\u5BBE\u5385", "\u4EE3\u9A7E", "\u9152\u5E97"], applyCondition: "\u6211\u884C\u8D35\u5BBE\u5BA2\u6237", note: "" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u6F02\u4EAE\u5988\u5988\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u513F\u7AE5\u6743\u76CA", "\u8D2D\u7269\u4F18\u60E0"], applyCondition: "\u5973\u6027\u5BA2\u6237", note: "" },
      { bank: "\u519C\u4E1A\u94F6\u884C", name: "\u56FD\u5BB6\u5B9D\u85CF\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 平安银行 ----------------
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u94F6\u8054\u597D\u8F66\u4E3B\u5C0A\u4EAB\u7248", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 800, waiverType: "\u8D44\u4EA7\u5B58\u514D", waiverCondition: "500000", waiverPolicy: "\u6708\u65E5\u5747\u8D44\u4EA7\u6EE150\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 1e4, benefits: ["\u5F00\u5361\u6743\u76CA90\u5143\u5FAE\u4FE1\u7ACB\u51CF\u91D1", "\u6D88\u8D39\u4EFB\u52A1\u8FBE\u6807\u9886\u5238", "\u8D44\u4EA7\u4EFB\u52A1\u8FBE\u6807\u9886\u5238"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u8D44\u4EA7\u5B58\u514D\u793A\u4F8B\uFF08\u8FBE\u6807\u4E0E\u5426\u5728\u300C\u6211\u7684\u6301\u5361\u300D\u91CC\u70B9\u5F00\u5173\u6807\u8BB0\uFF09" },
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u5E73\u5B89\u60A6\u4EAB\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0", "\u89C6\u9891\u4F1A\u5458"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u5E73\u5B89\u795E\u5361" },
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u7531\u4F60\u4FE1\u7528\u5361", level: "\u666E\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u6D88\u8D39\u8FD4\u5229", "\u79EF\u5206"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u643A\u7A0B\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u9152\u5E97\u9884\u8BA2\u4F18\u60E0", "\u673A\u7968\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u5E73\u5B89\u767D\u91D1\u5361\uFF08\u7F8E\u56FD\u8FD0\u901A\uFF09", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 2800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "20\u4E07", waiverPolicy: "\u5237\u6EE120\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4EE3\u9A7E"], applyCondition: "\u6211\u884C\u8D35\u5BBE\u5BA2\u6237", note: "" },
      { bank: "\u5E73\u5B89\u94F6\u884C", name: "\u5E73\u5B89\u8FD0\u901ASafari\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 1800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "20\u4E07", waiverPolicy: "\u6D88\u8D39\u6EE120\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["2\u95F4\u591C\u9152\u5E97", "\u673A\u573A\u8D35\u5BBE\u5385", "\u9910\u996E\u4F18\u60E0"], applyCondition: "\u6211\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      // ---------------- 邮政储蓄银行 ----------------
      { bank: "\u90AE\u653F\u50A8\u84C4\u94F6\u884C", name: "\u9F0E\u81F4\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 2600, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "7\u4E07", waiverPolicy: "\u5237\u6EE17\u4E07\u621620\u7B14\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u4EE3\u9A7E", "\u4F53\u68C0"], applyCondition: "\u90AE\u50A8\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "\u90AE\u50A8\u9F0E\u81F4\u767D\u91D1\u5361" },
      { bank: "\u90AE\u653F\u50A8\u84C4\u94F6\u884C", name: "\u9752\u6625\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u65B0\u6237\u793C", "\u6821\u56ED\u6743\u76CA"], applyCondition: "\u5B66\u751F\u53CA\u5E74\u8F7B\u5BA2\u6237", note: "\u90AE\u50A8\u9752\u6625\u5361" },
      { bank: "\u90AE\u653F\u50A8\u84C4\u94F6\u884C", name: "\u8F66\u4E3B\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u9053\u8DEF\u6551\u63F4"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      { bank: "\u90AE\u653F\u50A8\u84C4\u94F6\u884C", name: "\u4E61\u6751\u632F\u5174\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u6D89\u519C\u6743\u76CA", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u519C\u6751\u5BA2\u6237\u4F18\u5148", note: "" },
      { bank: "\u90AE\u653F\u50A8\u84C4\u94F6\u884C", name: "EMS\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u5BC4\u4EF6\u4F18\u60E0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 华夏银行 ----------------
      { bank: "\u534E\u590F\u94F6\u884C", name: "\u7F8E\u8FD0Safari\u4FE1\u7528\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 1800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "20\u4E07", waiverPolicy: "\u6D88\u8D39\u6216\u8D44\u4EA7\u8FBE\u6807\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["3\u95F4\u591C\u9152\u5E97", "\u673A\u573A\u8D35\u5BBE\u5385", "\u5065\u5EB7\u4F53\u68C0"], applyCondition: "\u534E\u590F\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "\u534E\u590F\u7F8E\u8FD0Safari\u4FE1\u7528\u5361" },
      { bank: "\u534E\u590F\u94F6\u884C", name: "\u4E91\u95EA\u4ED8\u4E3B\u9898\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u4E91\u95EA\u4ED8\u4F18\u60E0", "62\u6D3B\u52A8\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u534E\u590F\u94F6\u884C", name: "\u534E\u590FSMART\u4FE1\u7528\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u65B0\u6237\u793C", "\u5206\u671F\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u534E\u590F\u94F6\u884C", name: "\u817E\u8BAF\u65B0\u95FB\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u4F1A\u5458\u6743\u76CA", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u534E\u590F\u94F6\u884C", name: "\u6613\u8FBE\u91D1\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u73B0\u91D1\u5206\u671F", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 工商银行 ----------------
      { bank: "\u5DE5\u5546\u94F6\u884C", name: "\u65B0\u9510\u672A\u6765\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u5E74\u8F7B\u5BA2\u6237", note: "\u5DE5\u5546\u65B0\u9510\u672A\u6765\u5361" },
      { bank: "\u5DE5\u5546\u94F6\u884C", name: "\u5FAE\u4FE1\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u5FAE\u4FE1\u652F\u4ED8\u4F18\u60E0", "\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5DE5\u5546\u94F6\u884C", name: "\u73AF\u7403\u65C5\u884C\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054/VISA/Mastercard", annualFee: 2e3, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "20\u4E07", waiverPolicy: "\u6D88\u8D39\u6EE120\u4E07\u6216\u7B49\u503C\u5916\u5E01\u514D\u5E74\u8D39", startCredit: 5e4, benefits: ["\u5883\u5916\u6D88\u8D39\u8FD4\u73B0", "\u673A\u573A\u8D35\u5BBE\u5385"], applyCondition: "\u6211\u884C\u8D35\u5BBE\u5BA2\u6237", note: "" },
      { bank: "\u5DE5\u5546\u94F6\u884C", name: "\u661F\u5EA7\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5DE5\u5546\u94F6\u884C", name: "\u7261\u4E39\u8D85\u60E0\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u6D88\u8D39\u4F18\u60E0", "\u5206\u671F\u624B\u7EED\u8D39\u6298\u6263"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 浦发银行 ----------------
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u4EAC\u4E1CPLUS\u8054\u540D\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u4EAC\u4E1CPLUS\u4F1A\u5458", "\u8D2D\u7269\u7ACB\u51CF"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u6D66\u53D1\u4EAC\u4E1CPLUS\u8054\u540D\u5361" },
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u7F8E\u56FD\u8FD0\u901A\u8F66\u4E3B\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 360, waiverType: "\u521A\u6027", waiverCondition: "0", waiverPolicy: "\u521A\u6027\u5E74\u8D39", startCredit: 2e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u9053\u8DEF\u6551\u63F4", "\u505C\u8F66\u6743\u76CA"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "\u6D66\u53D1\u7F8E\u56FD\u8FD0\u901A\u8F66\u4E3B\u5361" },
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u7F8E\u8FD0\u767D\u91D1\u5361\uFF08AE\u767D\uFF09", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 3600, waiverType: "\u79EF\u5206\u62B5\u6263", waiverCondition: "20\u4E07", waiverPolicy: "20\u4E07\u79EF\u5206\u62B5\u6B21\u5E743600\u5143\u5E74\u8D39", startCredit: 1e5, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4EB2\u5B50\u6743\u76CA"], applyCondition: "\u6D66\u53D1\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u9B54J\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u4E8C\u6B21\u5143\u6743\u76CA", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u6D66\u53D1\u68A6\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u65B0\u6237\u793C", "\u5206\u671F\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u6D66\u53D1\u94F6\u884C", name: "\u4ECA\u65E5\u5230\u5E97\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u5546\u6237\u4F18\u60E0", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 光大银行 ----------------
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u9633\u5149\u8F66\u4E3B\u7ECF\u5178\u767D\u91D1\u5361\uFF08\u5B58\u514D\u7248\uFF09", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 500, waiverType: "\u8D44\u4EA7\u5B58\u514D", waiverCondition: "3000", waiverPolicy: "\u8D44\u4EA7\u8FBE\u68073000\u5143\u5373\u53EF\u514D\u5E74\u8D39", startCredit: 3e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u9053\u8DEF\u6551\u63F4", "\u4EE3\u9A7E"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "\u5149\u5927\u5B58\u514D\u7248\u5361\uFF0C\u8D44\u4EA7\u8FBE\u6807\u540E\u5728\u300C\u6211\u7684\u6301\u5361\u300D\u70B9\u5F00\u5173\u6807\u8BB0" },
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u9633\u5149\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 1180, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "10\u4E07", waiverPolicy: "\u5237\u6EE110\u4E07\u621620\u7B14\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4F53\u68C0"], applyCondition: "\u5149\u5927\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u6296\u97F3\u8054\u540D\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u6296\u97F3\u6743\u76CA", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u643A\u7A0B\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u9152\u5E97\u9884\u8BA2\u4F18\u60E0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u798F\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 500, waiverType: "\u7B14\u6570\u5237\u514D", waiverCondition: "6\u7B14", waiverPolicy: "\u9996\u5E74\u514D\u5E74\u8D39\uFF0C\u6B21\u5E74\u8D776\u7B14\u5237\u514D", startCredit: 2e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5149\u5927\u94F6\u884C", name: "\u79FB\u52A8\u4E2D\u9752\u65C5\u8054\u540D\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u65C5\u6E38\u6743\u76CA", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 广州银行 ----------------
      { bank: "\u5E7F\u5DDE\u94F6\u884C", name: "\u996D\u5361\u767D\u91D1\u4FE1\u7528\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u9910\u996E5\u6298", "\u5F71\u9662\u4F18\u60E0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "\u5E7F\u5DDE\u94F6\u884C\u996D\u5361\u767D\u91D1\u4FE1\u7528\u5361" },
      { bank: "\u5E7F\u5DDE\u94F6\u884C", name: "\u5E7F\u94F6\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u6D88\u8D39\u8FD4\u73B0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E7F\u5DDE\u94F6\u884C", name: "\u5E7F\u94F6\u8F66\u4E3B\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u505C\u8F66\u4F18\u60E0"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      { bank: "\u5E7F\u5DDE\u94F6\u884C", name: "\u5357\u822A\u660E\u73E0\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u91CC\u7A0B\u7D2F\u79EF", "\u673A\u7968\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E7F\u5DDE\u94F6\u884C", name: "\u5E7F\u94F6\u4EAC\u4E1C\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u4EAC\u4E1C\u6743\u76CA", "\u8D2D\u7269\u7ACB\u51CF"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 中信银行 ----------------
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "\u989C\u5361\u4FE1\u7528\u5361\uFF08\u661F\u5EA7\uFF09", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u65B0\u6237\u793C", "9\u5206\u4EAB\u5151"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "i\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054/VISA", annualFee: 480, waiverType: "\u79EF\u5206\u62B5\u6263", waiverCondition: "6\u4E07", waiverPolicy: "6\u4E07\u79EF\u5206\u62B5\u6B21\u5E74480\u5143\u5E74\u8D39", startCredit: 2e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u53852\u6B21", "\u9152\u5E97", "\u822A\u73ED\u5EF6\u8BEF\u9669"], applyCondition: "\u4E2D\u4FE1\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "\u534E\u4E3ACard\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u534E\u4E3A\u751F\u6001\u6743\u76CA", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "\u4EAC\u4E1C\u767D\u6761\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u4EAC\u4E1C\u6743\u76CA", "\u767D\u6761\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "\u6807\u51C6\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 2e3, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "12\u4E07", waiverPolicy: "\u5237\u6EE112\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4EE3\u9A7E"], applyCondition: "\u6211\u884C\u8D35\u5BBE\u5BA2\u6237", note: "" },
      { bank: "\u4E2D\u4FE1\u94F6\u884C", name: "\u5C0F\u7C73\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u5C0F\u7C73\u751F\u6001\u6743\u76CA", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 民生银行 ----------------
      { bank: "\u6C11\u751F\u94F6\u884C", name: "\u94F6\u8054\u6807\u51C6\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u6C11\u751F\u94F6\u884C", name: "\u963F\u91CC88VIP\u8054\u540D\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["88VIP\u6743\u76CA", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u6C11\u751F\u94F6\u884C", name: "\u8F66\u8F66\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u9053\u8DEF\u6551\u63F4"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      { bank: "\u6C11\u751F\u94F6\u884C", name: "\u7CBE\u82F1\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 1800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "18\u4E07", waiverPolicy: "\u5237\u6EE118\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 1e5, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u533B\u7597"], applyCondition: "\u6211\u884C\u8D35\u5BBE\u5BA2\u6237", note: "" },
      { bank: "\u6C11\u751F\u94F6\u884C", name: "in\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u6D88\u8D39\u8FD4\u5229", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 兴业银行 ----------------
      { bank: "\u5174\u4E1A\u94F6\u884C", name: "\u884C\u5361\uFF08\u60A0\u7CFB\u5217\uFF09", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4EE3\u9A7E"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5174\u4E1A\u94F6\u884C", name: "\u4E1C\u822A\u8054\u540D\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u91CC\u7A0B\u7D2F\u79EF", "\u673A\u7968\u4F18\u60E0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5174\u4E1A\u94F6\u884C", name: "pass\u4FE1\u7528\u5361\uFF08\u840C\u5361\uFF09", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5174\u4E1A\u94F6\u884C", name: "\u5174\u4EAB\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 900, waiverType: "\u521A\u6027", waiverCondition: "0", waiverPolicy: "\u521A\u6027\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4F53\u68C0"], applyCondition: "\u5174\u4E1A\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u5174\u4E1A\u94F6\u884C", name: "\u6C7D\u8F66\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u505C\u8F66\u4F18\u60E0"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      // ---------------- 广发银行 ----------------
      { bank: "\u5E7F\u53D1\u94F6\u884C", name: "\u7280\u5229\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u6D88\u8D39\u8FD4\u73B0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E7F\u53D1\u94F6\u884C", name: "DIY\u4FE1\u7528\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u81EA\u9009\u5546\u62373\u500D\u79EF\u5206"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E7F\u53D1\u94F6\u884C", name: "\u7F8E\u56FD\u8FD0\u901A\u771F\u60C5\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u9152\u5E97\u6743\u76CA", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5E7F\u53D1\u94F6\u884C", name: "\u8F66\u4E3B\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u52A0\u6CB9\u8FD4\u73B0", "\u9053\u8DEF\u6551\u63F4"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      { bank: "\u5E7F\u53D1\u94F6\u884C", name: "\u643A\u7A0B\u8054\u540D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u9152\u5E97\u9884\u8BA2\u4F18\u60E0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      // ---------------- 建设银行 ----------------
      { bank: "\u5EFA\u8BBE\u94F6\u884C", name: "\u9F99\u5361\u5C0A\u4EAB\u767D\u91D1\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054/VISA/Mastercard", annualFee: 1800, waiverType: "\u6D88\u8D39\u5237\u514D", waiverCondition: "10\u4E07", waiverPolicy: "\u6D88\u8D39\u6EE110\u4E07\u514D\u6B21\u5E74\u5E74\u8D39", startCredit: 5e4, benefits: ["\u673A\u573A\u8D35\u5BBE\u5385", "\u9152\u5E97", "\u4EE3\u9A7E"], applyCondition: "\u5EFA\u884C\u7EFC\u5408\u8BC4\u5206\u8FBE\u6807", note: "" },
      { bank: "\u5EFA\u8BBE\u94F6\u884C", name: "\u9F99\u5361\u6C7D\u8F66\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u52A0\u6CB9\u4F18\u60E0", "\u6D17\u8F66\u6743\u76CA"], applyCondition: "\u6709\u8F66\u5BA2\u6237", note: "" },
      { bank: "\u5EFA\u8BBE\u94F6\u884C", name: "\u9F99\u5361MUSE\u5361", level: "\u767D\u91D1\u5361", org: "\u7F8E\u56FD\u8FD0\u901A/\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 2e4, benefits: ["\u5883\u5916\u6D88\u8D39\u8FD4\u73B0", "\u65B0\u6237\u793C"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5EFA\u8BBE\u94F6\u884C", name: "LINEFRIENDS\u7C89\u4E1D\u5361", level: "\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 5e3, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u5229"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" },
      { bank: "\u5EFA\u8BBE\u94F6\u884C", name: "joy\u4FE1\u7528\u5361", level: "\u767D\u91D1\u5361", org: "\u94F6\u8054", annualFee: 0, waiverType: "\u514D\u5E74\u8D39", waiverCondition: "0", waiverPolicy: "\u6709\u6548\u671F\u5185\u514D\u5E74\u8D39", startCredit: 1e4, benefits: ["\u65B0\u6237\u793C", "\u6D88\u8D39\u8FD4\u73B0"], applyCondition: "\u4FE1\u7528\u8BB0\u5F55\u826F\u597D\u5373\u53EF\u7533\u8BF7", note: "" }
    ];
    var SEED_VERSION = 2;
    module.exports = { SEED_CARDS, SEED_VERSION };
  }
});

// src/notifier.js
var require_notifier = __commonJS({
  "src/notifier.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var TIMEOUT_MS = 1e4;
    var DOH_URL = "https://cloudflare-dns.com/dns-query?name=<HOST>&type=A";
    function isBlockedIp(ip) {
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        const p = ip.split(".").map(Number);
        if (p[0] === 0 || p[0] === 127 || p[0] === 10) return true;
        if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
        if (p[0] === 192 && p[1] === 168) return true;
        if (p[0] === 169 && p[1] === 254) return true;
        if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
        if (p[0] >= 224) return true;
        return false;
      }
      const low = ip.toLowerCase();
      if (low === "::1" || low === "::") return true;
      if (/^f[cd][0-9a-f]{2}:/.test(low)) return true;
      if (/^fe[89ab][0-9a-f]:/.test(low)) return true;
      const m = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      if (m) return isBlockedIp(m[1]);
      return false;
    }
    __name(isBlockedIp, "isBlockedIp");
    async function resolveHost(host) {
      if (/^[\d.]+$/.test(host)) return [host];
      if (host.includes(":")) return [host.replace(/^\[|\]$/g, "")];
      try {
        const res = await fetch(DOH_URL.replace("<HOST>", encodeURIComponent(host)), {
          headers: { accept: "application/dns-json" },
          signal: AbortSignal.timeout(5e3)
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
      } catch (e) {
        return [];
      }
    }
    __name(resolveHost, "resolveHost");
    async function assertSafeBarkServer(raw) {
      const s = String(raw || "").trim();
      if (!s) return;
      let u;
      try {
        u = new URL(s);
      } catch (e) {
        throw new Error("Bark \u670D\u52A1\u5668\u5730\u5740\u683C\u5F0F\u975E\u6CD5\uFF1A" + s.slice(0, 60));
      }
      if (u.protocol !== "https:") throw new Error("Bark \u670D\u52A1\u5668\u5730\u5740\u5FC5\u987B\u4F7F\u7528 https\uFF08\u5F53\u524D\uFF1A" + u.protocol + "\uFF09");
      const host = u.hostname.replace(/^\[|\]$/g, "");
      const addrs = await resolveHost(host);
      if (!addrs.length) throw new Error("Bark \u670D\u52A1\u5668\u5730\u5740\u65E0\u6CD5\u89E3\u6790\uFF1A" + host);
      for (const a of addrs) {
        if (isBlockedIp(a)) {
          throw new Error("Bark \u670D\u52A1\u5668\u5730\u5740\u4E0D\u5141\u8BB8\u6307\u5411\u5185\u7F51/\u73AF\u56DE/\u94FE\u8DEF\u672C\u5730\u5730\u5740\uFF08\u89E3\u6790\u4E3A " + a + "\uFF09");
        }
      }
    }
    __name(assertSafeBarkServer, "assertSafeBarkServer");
    function verdict(r, expectedCode, label, msgField) {
      if (!r.data || typeof r.data !== "object") {
        return { ok: false, error: label + "\u8FD4\u56DE\u975E JSON \u54CD\u5E94\uFF08HTTP 200\uFF09\uFF1A" + String(r.raw || r.contentType || "").slice(0, 120) };
      }
      if (r.data.code === void 0 || r.data.code === null) {
        return { ok: false, error: label + "\u54CD\u5E94\u7F3A\u5C11 code \u5B57\u6BB5\uFF1A" + JSON.stringify(r.data).slice(0, 120) };
      }
      if (r.data.code !== expectedCode) {
        return { ok: false, error: label + "\u8FD4\u56DE " + r.data.code + ": " + (msgField && r.data[msgField] || "") };
      }
      return { ok: true, data: r.data };
    }
    __name(verdict, "verdict");
    function endpoint(env2, name, fallback) {
      return env2[name] || fallback;
    }
    __name(endpoint, "endpoint");
    async function postJson(url, body, headers) {
      const res = await fetch(url, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json", Accept: "application/json" }, headers || {}),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
      }
      if (!res.ok) return { ok: false, error: "HTTP " + res.status + " " + text.slice(0, 160) };
      return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get("content-type") || "" };
    }
    __name(postJson, "postJson");
    async function postForm(url, form) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
      }
      if (!res.ok) return { ok: false, error: "HTTP " + res.status + " " + text.slice(0, 160) };
      return { ok: true, data, raw: text.slice(0, 200), contentType: res.headers.get("content-type") || "" };
    }
    __name(postForm, "postForm");
    async function sendWxpusher(env2, cfg, title2, content) {
      const url = endpoint(env2, "NOTIFY_WXPUSHER_URL", "https://wxpusher.zjiecode.com/api/send/message");
      const uids = String(cfg.uids || "").split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
      const topicIds = String(cfg.topicIds || "").split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
      if (!cfg.appToken) return { ok: false, error: "\u7F3A\u5C11 appToken" };
      if (!uids.length && !topicIds.length) return { ok: false, error: "\u7F3A\u5C11 uids \u6216 topicIds" };
      const r = await postJson(url, {
        appToken: cfg.appToken,
        content,
        summary: String(cfg.summaryPrefix || "\u7BA1\u5361\u63D0\u9192") + "\uFF5C" + title2,
        contentType: 3,
        uids,
        topicIds,
        url: ""
      });
      if (!r.ok) return r;
      return verdict(r, 1e3, "wxpusher", "msg");
    }
    __name(sendWxpusher, "sendWxpusher");
    function sctUrl(cfg) {
      const base = "https://sctapi.ftqq.com";
      return base.replace(/\/$/, "") + "/" + encodeURIComponent(String(cfg.sendkey || "").trim()) + ".send";
    }
    __name(sctUrl, "sctUrl");
    async function sendServerChan(env2, cfg, title2, content) {
      if (!cfg.sendkey) return { ok: false, error: "\u7F3A\u5C11 SendKey" };
      const r = await postForm(sctUrl(cfg), { title: title2.slice(0, 100), desp: content });
      if (!r.ok) return r;
      return verdict(r, 0, "Server\u9171", "message");
    }
    __name(sendServerChan, "sendServerChan");
    async function sendBark(env2, cfg, title2, content) {
      const override = env2.NOTIFY_BARK_URL;
      if (!override) await assertSafeBarkServer(cfg.server);
      const base = (override || cfg.server || "https://api.day.app").replace(/\/$/, "");
      if (!cfg.deviceKey) return { ok: false, error: "\u7F3A\u5C11 deviceKey" };
      const r = await postJson(base + "/push", {
        device_key: cfg.deviceKey,
        title: title2.slice(0, 100),
        body: content,
        level: cfg.level || "active",
        group: cfg.group || "\u7BA1\u5361",
        isArchive: 1
      });
      if (!r.ok) return r;
      return verdict(r, 200, "Bark", "message");
    }
    __name(sendBark, "sendBark");
    var CHANNELS = {
      wxpusher: { label: "WxPusher", send: sendWxpusher },
      serverchan: { label: "Server\u9171\xB3", send: sendServerChan },
      bark: { label: "Bark", send: sendBark }
    };
    async function notifyAll(env2, cfg, title2, content) {
      const results = [];
      for (const key of Object.keys(CHANNELS)) {
        const ch = CHANNELS[key];
        const chCfg = cfg && cfg.channels && cfg.channels[key] || {};
        if (!chCfg.enabled) continue;
        try {
          const r = await ch.send(env2, chCfg, title2, content);
          results.push({ channel: key, label: ch.label, ok: !!r.ok, error: r.ok ? "" : r.error || "\u53D1\u9001\u5931\u8D25" });
        } catch (e) {
          results.push({ channel: key, label: ch.label, ok: false, error: e && e.message ? e.message : String(e) });
        }
      }
      return results;
    }
    __name(notifyAll, "notifyAll");
    function enabledChannels(cfg) {
      return Object.keys(CHANNELS).filter((k) => cfg && cfg.channels && cfg.channels[k] && cfg.channels[k].enabled);
    }
    __name(enabledChannels, "enabledChannels");
    module.exports = { notifyAll, enabledChannels, CHANNELS, assertSafeBarkServer, isBlockedIp };
  }
});

// vendored/notifier.js
var require_notifier2 = __commonJS({
  "vendored/notifier.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var W = require_notifier();
    module.exports = {
      CHANNELS: W.CHANNELS,
      enabledChannels: W.enabledChannels,
      assertSafeBarkServer: W.assertSafeBarkServer,
      isBlockedIp: W.isBlockedIp,
      notifyAll(cfg, title2, content) {
        return W.notifyAll(typeof ENV !== "undefined" && ENV || globalThis.ENV || {}, cfg, title2, content);
      }
    };
  }
});

// vendored/assets.js
var require_assets = __commonJS({
  "vendored/assets.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var U = require_util();
    var MAX_MONEY = 1e8;
    var MEM_CATEGORIES = ["video", "ecard", "dining", "fitness", "beauty", "travel", "course", "tool", "subscription", "other"];
    var MEM_CAT_LABELS = {
      video: "\u89C6\u9891\u5A31\u4E50",
      ecard: "\u50A8\u503C\u5361",
      dining: "\u9910\u996E\u7F8E\u98DF",
      fitness: "\u8FD0\u52A8\u5065\u8EAB",
      beauty: "\u4E3D\u4EBA\u7F8E\u80A4",
      travel: "\u51FA\u884C\u65C5\u6E38",
      course: "\u5728\u7EBF\u8BFE\u7A0B",
      tool: "\u6548\u7387\u5DE5\u5177",
      subscription: "\u8F6F\u4EF6\u8BA2\u9605",
      other: "\u5176\u4ED6"
    };
    var VOUCHER_TYPES = ["coupon", "storedcard", "fullred"];
    var VOUCHER_TYPE_META = {
      coupon: { l: "\u4F18\u60E0\u5238", mode: "count" },
      storedcard: { l: "\u50A8\u503C\u5361", mode: "amount" },
      fullred: { l: "\u6EE1\u51CF\u5238", mode: "count", rule: true }
    };
    var VOUCHER_TYPE_LEGACY = { cyclecard: "coupon", movie: "coupon", card: "coupon", ticket: "coupon" };
    var KG_TYPES = ["file", "online_doc", "consultation", "membership", "course", "tool", "other"];
    var KG_TYPE_LABELS = {
      file: "\u7F51\u76D8/\u6587\u4EF6\u8D44\u6599",
      online_doc: "\u5728\u7EBF\u6587\u6863/\u8868\u683C",
      consultation: "\u5728\u7EBF\u54A8\u8BE2\u670D\u52A1",
      membership: "\u4F1A\u5458/\u793E\u7FA4/\u8D44\u8BAF\u5E73\u53F0",
      course: "\u5B66\u4E60\u8BFE\u7A0B",
      tool: "\u5DE5\u5177/\u8F6F\u4EF6\u8BA2\u9605",
      other: "\u5176\u4ED6"
    };
    var KG_CATS = ["course", "column", "community", "subscription", "book", "database", "resource", "other"];
    var KG_CAT_LABELS = {
      course: "\u8BFE\u7A0B",
      column: "\u4E13\u680F",
      community: "\u793E\u7FA4",
      subscription: "\u8F6F\u4EF6\u8BA2\u9605",
      book: "\u7535\u5B50\u4E66",
      database: "\u6570\u636E\u5E93",
      resource: "\u8D44\u6599\u5E93",
      other: "\u5176\u4ED6"
    };
    var KG_CYCLES = ["monthly", "yearly", "lifetime"];
    var KG_CYCLE_LABELS = { monthly: "\u6708\u4ED8", yearly: "\u5E74\u4ED8", lifetime: "\u7EC8\u8EAB" };
    function round2(n) {
      return Math.round(Number(n) * 100) / 100;
    }
    __name(round2, "round2");
    function nonNegNum(v, dft) {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : dft;
    }
    __name(nonNegNum, "nonNegNum");
    function moneyIn(v, dft) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) return dft;
      return round2(n);
    }
    __name(moneyIn, "moneyIn");
    function dateOrNull(v) {
      return U.parseDateStr(v) ? String(v) : "";
    }
    __name(dateOrNull, "dateOrNull");
    function nowIso() {
      return NOW().toISOString();
    }
    __name(nowIso, "nowIso");
    function normalizeTxn(t) {
      return {
        id: String(t.id || U.uid()),
        kind: t.kind === "topup" ? "topup" : "consume",
        amount: moneyIn(t.amount, 0),
        note: String(t.note || "").trim(),
        date: dateOrNull(t.date) || U.todayStr(),
        createdAt: t.createdAt || nowIso()
      };
    }
    __name(normalizeTxn, "normalizeTxn");
    function normalizeMembership(m, existing) {
      const base = existing || {};
      const out = {
        id: base.id || m.id || U.uid(),
        name: String(m.name == null ? base.name : m.name).trim(),
        category: MEM_CATEGORIES.includes(m.category) ? m.category : MEM_CATEGORIES.includes(base.category) ? base.category : "other",
        // 储值型：余额；按次型：totalUses/usedUses。balance 对按次型保留 0
        mode: m.mode === "count" ? "count" : "amount",
        balance: moneyIn(m.balance != null ? m.balance : base.balance, 0),
        totalUses: Math.max(0, Math.round(nonNegNum(m.totalUses != null ? m.totalUses : base.totalUses, 1))),
        usedUses: Math.max(0, Math.round(nonNegNum(m.usedUses != null ? m.usedUses : base.usedUses, 0))),
        expiry: m.expiry !== void 0 ? dateOrNull(m.expiry) : base.expiry || "",
        note: String(m.note == null ? base.note || "" : m.note).trim(),
        createdAt: base.createdAt || m.createdAt || nowIso()
      };
      const txns = m.transactions !== void 0 ? m.transactions : base.transactions;
      out.transactions = Array.isArray(txns) ? txns.map(normalizeTxn) : [];
      return out;
    }
    __name(normalizeMembership, "normalizeMembership");
    function normalizeVoucher(v, existing) {
      const base = existing || {};
      let type = v.type != null ? String(v.type) : base.type;
      type = VOUCHER_TYPES.includes(type) ? type : VOUCHER_TYPE_LEGACY[type] || "coupon";
      const meta = VOUCHER_TYPE_META[type];
      const out = {
        id: base.id || v.id || U.uid(),
        brand: String(v.brand == null ? base.brand : v.brand).trim(),
        name: String(v.name == null ? base.name : v.name).trim(),
        type,
        mode: meta.mode,
        totalUses: Math.max(0, Math.round(nonNegNum(v.totalUses != null ? v.totalUses : base.totalUses, 1))),
        usedUses: Math.max(0, Math.round(nonNegNum(v.usedUses != null ? v.usedUses : base.usedUses, 0))),
        balance: moneyIn(v.balance != null ? v.balance : base.balance, 0),
        threshold: moneyIn(v.threshold != null ? v.threshold : base.threshold, 0),
        discount: moneyIn(v.discount != null ? v.discount : base.discount, 0),
        expiry: v.expiry !== void 0 ? dateOrNull(v.expiry) : base.expiry || "",
        scope: String(v.scope == null ? base.scope || "" : v.scope).trim(),
        note: String(v.note == null ? base.note || "" : v.note).trim(),
        createdAt: base.createdAt || v.createdAt || nowIso()
      };
      const txns = v.transactions !== void 0 ? v.transactions : base.transactions;
      out.transactions = Array.isArray(txns) ? txns.map(normalizeTxn) : [];
      return out;
    }
    __name(normalizeVoucher, "normalizeVoucher");
    function normalizeQuota(q, baseQ) {
      const b = baseQ || {};
      const src = q && typeof q === "object" ? q : {};
      const f = /* @__PURE__ */ __name((key) => Math.max(0, Math.round(nonNegNum(src[key] != null ? src[key] : b[key], 0))), "f");
      return { count: f("count"), countMax: f("countMax"), balance: f("balance"), download: f("download"), call: f("call") };
    }
    __name(normalizeQuota, "normalizeQuota");
    function normalizeKgLog(u) {
      return {
        id: String(u.id || U.uid()),
        date: dateOrNull(u.date) || U.todayStr(),
        note: String(u.note || "").trim(),
        createdAt: u.createdAt || nowIso()
      };
    }
    __name(normalizeKgLog, "normalizeKgLog");
    function normalizeKgHistory(h) {
      const types = ["recharge", "renew", "use", "refund", "gift"];
      return {
        id: String(h.id || U.uid()),
        type: types.includes(h.type) ? h.type : "renew",
        date: dateOrNull(h.date) || U.todayStr(),
        note: String(h.note || "").trim(),
        amount: moneyIn(h.amount, 0),
        createdAt: h.createdAt || nowIso()
      };
    }
    __name(normalizeKgHistory, "normalizeKgHistory");
    function normalizeKnowledge(k, existing) {
      const base = existing || {};
      const out = {
        id: base.id || k.id || U.uid(),
        title: String(k.title == null ? base.title : k.title).trim(),
        platform: String(k.platform == null ? base.platform || "" : k.platform).trim(),
        resourceType: KG_TYPES.includes(k.resourceType) ? k.resourceType : KG_TYPES.includes(base.resourceType) ? base.resourceType : "other",
        category: KG_CATS.includes(k.category) ? k.category : KG_CATS.includes(base.category) ? base.category : "other",
        cycle: KG_CYCLES.includes(k.cycle) ? k.cycle : KG_CYCLES.includes(base.cycle) ? base.cycle : "yearly",
        lifetime: k.lifetime != null ? !!k.lifetime : !!base.lifetime,
        price: moneyIn(k.price != null ? k.price : base.price, 0),
        purchaseDate: k.purchaseDate !== void 0 ? dateOrNull(k.purchaseDate) : base.purchaseDate || "",
        expiry: k.expiry !== void 0 ? dateOrNull(k.expiry) : base.expiry || "",
        progress: Math.min(100, Math.max(0, Math.round(nonNegNum(k.progress != null ? k.progress : base.progress, 0)))),
        uses: Math.max(0, Math.round(nonNegNum(k.uses != null ? k.uses : base.uses, 0))),
        account: String(k.account == null ? base.account || "" : k.account).trim(),
        note: String(k.note == null ? base.note || "" : k.note).trim(),
        remindRenew: k.remindRenew != null ? !!k.remindRenew : !!base.remindRenew,
        createdAt: base.createdAt || k.createdAt || nowIso()
      };
      const arrOf = /* @__PURE__ */ __name((val, dft) => {
        if (val !== void 0) {
          if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
          if (typeof val === "string") return val.split(/[、\n|]/).map((x) => x.trim()).filter(Boolean);
          return dft;
        }
        return dft;
      }, "arrOf");
      out.links = arrOf(k.links, base.links || []);
      out.catalog = arrOf(k.catalog, base.catalog || []);
      out.tags = arrOf(k.tags, base.tags || []);
      out.topics = arrOf(k.topics, base.topics || []);
      const quotaSrc = k.quota !== void 0 ? k.quota : base.quota;
      out.quota = normalizeQuota(quotaSrc, base.quota);
      const useLog = k.useLog !== void 0 ? k.useLog : base.useLog;
      out.useLog = Array.isArray(useLog) ? useLog.map(normalizeKgLog) : [];
      const hist = k.history !== void 0 ? k.history : base.history;
      out.history = Array.isArray(hist) ? hist.map(normalizeKgHistory) : [];
      return out;
    }
    __name(normalizeKnowledge, "normalizeKnowledge");
    function normalizeBrand(b, existing) {
      const base = existing || {};
      return {
        id: base.id || b.id || U.uid(),
        name: String(b.name == null ? base.name : b.name).trim(),
        note: String(b.note == null ? base.note || "" : b.note).trim(),
        createdAt: base.createdAt || b.createdAt || nowIso()
      };
    }
    __name(normalizeBrand, "normalizeBrand");
    function voucherRemaining(v) {
      return v.mode === "amount" ? Number(v.balance) || 0 : (Number(v.totalUses) || 0) - (Number(v.usedUses) || 0);
    }
    __name(voucherRemaining, "voucherRemaining");
    function membershipRemaining(m) {
      return m.mode === "amount" ? Number(m.balance) || 0 : (Number(m.totalUses) || 0) - (Number(m.usedUses) || 0);
    }
    __name(membershipRemaining, "membershipRemaining");
    function daysLeftOf(dateStr, now) {
      if (!dateStr) return null;
      const t = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
      if (isNaN(t.getTime())) return null;
      const n = now || NOW();
      const t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      return Math.round((t - t0) / 864e5);
    }
    __name(daysLeftOf, "daysLeftOf");
    function collectAssetExpiry(data, cfg, now) {
      const items = [];
      const days = cfg && cfg.rules && Number(cfg.rules.assetExpiryDays) || 0;
      if (days <= 0) return items;
      const scan = /* @__PURE__ */ __name((list, label, kindOf) => {
        for (const it of list || []) {
          const left = daysLeftOf(it.expiry, now);
          if (left == null || left < 0 || left > days) continue;
          items.push({
            type: "asset",
            key: `asset:${kindOf}:${it.id}:${it.expiry}`,
            title: `${label}\u5230\u671F\uFF1A${it.name || it.title || "\u672A\u547D\u540D"}`,
            body: [
              `- \u9879\u76EE\uFF1A${it.name || it.title}`,
              `- \u5206\u7C7B\uFF1A${label}`,
              `- \u5230\u671F\u65E5\uFF1A${it.expiry}\uFF08${left === 0 ? "\u4ECA\u5929\u5230\u671F" : left + " \u5929\u540E\u5230\u671F"}\uFF09`,
              `- \u72B6\u6001\uFF1A${left === 0 ? "\u4ECA\u5929\u6700\u540E\u4E00\u5929\uFF0C\u5C3D\u5FEB\u4F7F\u7528" : "\u4E34\u671F\u672A\u4F7F\u7528\uFF0C\u8BF7\u5408\u7406\u5B89\u6392"}`
            ].join("\n")
          });
        }
      }, "scan");
      scan(data.memberships, "\u4F1A\u5458\u5361/\u50A8\u503C\u5361", "membership");
      scan(data.vouchers, "\u5361/\u7968", "voucher");
      scan(data.knowledge.filter((k) => !k.lifetime), "\u77E5\u8BC6\u5E93\u8BA2\u9605", "knowledge");
      return items;
    }
    __name(collectAssetExpiry, "collectAssetExpiry");
    module.exports = {
      MEM_CATEGORIES,
      MEM_CAT_LABELS,
      VOUCHER_TYPES,
      VOUCHER_TYPE_META,
      VOUCHER_TYPE_LEGACY,
      KG_TYPES,
      KG_TYPE_LABELS,
      KG_CATS,
      KG_CAT_LABELS,
      KG_CYCLES,
      KG_CYCLE_LABELS,
      normalizeMembership,
      normalizeVoucher,
      normalizeKnowledge,
      normalizeBrand,
      normalizeTxn,
      normalizeKgLog,
      normalizeKgHistory,
      voucherRemaining,
      membershipRemaining,
      daysLeftOf,
      collectAssetExpiry,
      round2,
      moneyIn,
      dateOrNull
    };
  }
});

// vendored/reminder.js
var require_reminder = __commonJS({
  "vendored/reminder.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function daysInMonth(y, m) {
      return new Date(y, m, 0).getDate();
    }
    __name(daysInMonth, "daysInMonth");
    function todayStr(d) {
      const x = d || NOW();
      return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
    }
    __name(todayStr, "todayStr");
    function money(n) {
      const v = Number(n) || 0;
      return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
    }
    __name(money, "money");
    var DEFAULT_CONFIG = {
      enabled: true,
      intervalMinutes: 60,
      lastCheckAt: "",
      channels: {
        wxpusher: { enabled: false, appToken: "", uids: "", topicIds: "", summaryPrefix: "\u7BA1\u5361\u63D0\u9192" },
        serverchan: { enabled: false, sendkey: "" },
        bark: { enabled: false, deviceKey: "", server: "https://api.day.app", level: "active", group: "\u7BA1\u5361" }
      },
      rules: { feeDays: [30, 7, 1], repayBeforeDays: 3, taskRemainDays: 3, billBeforeDays: 3, billOverdueRemind: 1, assetExpiryDays: 7 },
      sentLog: {},
      history: []
    };
    function normalizeConfig(raw) {
      const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      const r = raw || {};
      cfg.enabled = r.enabled === void 0 ? true : !!r.enabled;
      cfg.intervalMinutes = Math.max(5, Math.min(1440, Number(r.intervalMinutes) || 60));
      if (r.channels) {
        for (const k of Object.keys(cfg.channels)) {
          const src = r.channels[k] || {};
          cfg.channels[k].enabled = !!src.enabled;
          for (const f of Object.keys(src)) {
            if (f === "enabled") continue;
            cfg.channels[k][f] = String(src[f] === void 0 ? cfg.channels[k][f] || "" : src[f]);
          }
        }
      }
      if (r.rules) {
        const days = Array.isArray(r.rules.feeDays) ? r.rules.feeDays.map(Number).filter((n) => Number.isFinite(n) && n >= 0) : null;
        cfg.rules.feeDays = days && days.length ? days.slice().sort((a, b) => b - a) : DEFAULT_CONFIG.rules.feeDays.slice();
        cfg.rules.repayBeforeDays = Number(r.rules.repayBeforeDays) || 0;
        cfg.rules.taskRemainDays = Number(r.rules.taskRemainDays) || 0;
        cfg.rules.billBeforeDays = r.rules.billBeforeDays == null ? DEFAULT_CONFIG.rules.billBeforeDays : Number(r.rules.billBeforeDays) || 0;
        cfg.rules.billOverdueRemind = r.rules.billOverdueRemind == null ? 1 : r.rules.billOverdueRemind ? 1 : 0;
        cfg.rules.assetExpiryDays = Math.max(0, Math.min(90, Number(r.rules.assetExpiryDays) || 0));
      }
      cfg.sentLog = r.sentLog && typeof r.sentLog === "object" ? r.sentLog : {};
      cfg.history = Array.isArray(r.history) ? r.history.slice(0, 30) : [];
      cfg.lastCheckAt = r.lastCheckAt || "";
      const wp = cfg.channels.wxpusher;
      if (!wp.appToken && (ENV && ENV.WXPUSHER_APP_TOKEN)) wp.appToken = ENV && ENV.WXPUSHER_APP_TOKEN;
      if (!wp.uids && (ENV && ENV.WXPUSHER_UIDS)) wp.uids = ENV && ENV.WXPUSHER_UIDS;
      const sc = cfg.channels.serverchan;
      if (!sc.sendkey && (ENV && ENV.SERVERCHAN_SENDKEY)) sc.sendkey = ENV && ENV.SERVERCHAN_SENDKEY;
      const bk = cfg.channels.bark;
      if (!bk.deviceKey && (ENV && ENV.BARK_DEVICE_KEY)) bk.deviceKey = ENV && ENV.BARK_DEVICE_KEY;
      if (!bk.server) bk.server = DEFAULT_CONFIG.channels.bark.server;
      return cfg;
    }
    __name(normalizeConfig, "normalizeConfig");
    function daysToRepay(repayDay, now) {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = Math.min(Math.max(1, Number(repayDay) || 1), daysInMonth(y, m));
      const target = new Date(y, m - 1, d);
      const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let diff = Math.round((target - t0) / 864e5);
      if (diff < 0) {
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        const nd = Math.min(Math.max(1, Number(repayDay) || 1), daysInMonth(ny, nm));
        const nt = new Date(ny, nm - 1, nd);
        diff = Math.round((nt - t0) / 864e5);
      }
      return diff;
    }
    __name(daysToRepay, "daysToRepay");
    function feeItem(m, days, feeDayThreshold) {
      const w = m.waiver || {};
      const name = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
      let remain = "";
      if (w.kind === "\u6D88\u8D39\u5237\u514D") remain = `\u5DF2\u5B8C\u6210 \xA5${money(w.progress)} / \xA5${money(w.target)}\uFF0C\u8FD8\u5DEE \xA5${money(w.remaining)}`;
      else if (w.kind === "\u7B14\u6570\u5237\u514D") remain = `\u5DF2\u5B8C\u6210 ${w.progress} / ${w.target} \u7B14\uFF0C\u8FD8\u5DEE ${w.remaining} \u7B14`;
      else if (w.kind === "\u79EF\u5206\u62B5\u6263") remain = "\u9700\u79EF\u5206\u62B5\u6263\uFF0C\u5F53\u524D\u672A\u62B5\u6263";
      else if (w.kind === "\u8D44\u4EA7\u5B58\u514D") remain = "\u9700\u8D44\u4EA7\u8FBE\u6807\uFF0C\u5F53\u524D\u672A\u8FBE\u6807";
      else if (w.kind === "\u521A\u6027") remain = "\u521A\u6027\u5E74\u8D39\uFF0C\u5FC5\u987B\u7F34\u8D39";
      const title2 = days === 0 ? `\u5E74\u8D39\u4ECA\u65E5\u6536\u53D6\uFF1A${name}` : `\u5E74\u8D39\u63D0\u9192\uFF1A${name} \u8FD8\u6709 ${days} \u5929`;
      const body = [
        `- \u94F6\u884C\uFF1A${m.bank || "\u2014"}`,
        `- \u5361\u7247\uFF1A${m.name || "\u2014"}${m.alias ? `\uFF08${m.alias}\uFF09` : ""}`,
        `- \u5E74\u8D39\uFF1A\xA5${money(m.annualFee)}`,
        `- \u6536\u53D6\u65E5\uFF1A${m.nextFeeDate || "\u2014"}\uFF08\u8FD8\u6709 ${days} \u5929\uFF09`,
        `- \u72B6\u6001\uFF1A${w.statusText || (w.needsPayment ? "\u9700\u7F34\u8D39" : "\u5DF2\u514D")}${remain ? `\uFF5C${remain}` : ""}`
      ].join("\n");
      return {
        type: "fee",
        // key 必须区分「倒数第 N 天」与「年费当天」：否则 feeDays 从 1 跨到 0 时 key 相同，
        // 当天那条「年费今日收取」会被去重逻辑吞掉、永远发不出去
        key: `fee:${m.id}:${m.nextFeeDate}:${days === 0 ? "today" : feeDayThreshold}`,
        title: title2,
        body
      };
    }
    __name(feeItem, "feeItem");
    function repayItem(m, days, now) {
      const name = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
      const p = m.payment || {};
      const title2 = days === 0 ? `\u4ECA\u65E5\u8FD8\u6B3E\uFF1A${name}` : `\u8FD8\u6B3E\u63D0\u9192\uFF1A${name} ${days} \u5929\u540E\u5230\u671F`;
      const body = [
        `- \u94F6\u884C\uFF1A${m.bank || "\u2014"}`,
        `- \u5361\u7247\uFF1A${m.name || "\u2014"}${m.alias ? `\uFF08${m.alias}\uFF09` : ""}`,
        `- \u672C\u671F\u8D26\u5355\u65E5\uFF1A${p.billDate || "\u2014"}`,
        `- \u94F6\u884C\u5230\u671F\u65E5\uFF1A${p.dueDate || "\u2014"}${p.isInGrace ? "\uFF08\u5BBD\u9650\u671F\u5185\uFF0C\u4ECD\u53EF\u8FD8\u6B3E\uFF09" : ""}`,
        `- \u6700\u540E\u8FD8\u6B3E\u65E5\uFF1A${p.lastPayDate || "\u2014"}\uFF08${days === 0 ? "\u5C31\u662F\u4ECA\u5929" : `\u8FD8\u6709 ${days} \u5929`}\uFF09`,
        `- \u989D\u5EA6\uFF1A\xA5${money(m.creditLimit)}`
      ].join("\n");
      const ym = now || NOW();
      const fallbackYm = ym.getFullYear() + "-" + String(ym.getMonth() + 1).padStart(2, "0");
      return { type: "repay", key: `repay:${m.id}:${p.lastPayDate || fallbackYm}`, title: title2, body };
    }
    __name(repayItem, "repayItem");
    function taskItem(m, remainDays, gap, now) {
      const name = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
      const title2 = `\u5237\u5361\u4EFB\u52A1\uFF1A${name} \u8FD8\u5DEE \xA5${money(gap)}`;
      const body = [
        `- \u94F6\u884C\uFF1A${m.bank || "\u2014"}`,
        `- \u5361\u7247\uFF1A${m.name || "\u2014"}${m.alias ? `\uFF08${m.alias}\uFF09` : ""}`,
        `- \u672C\u6708\u6D88\u8D39\uFF1A\xA5${money(m.monthSpend)} / \u76EE\u6807 \xA5${money(m.monthlySpendTarget)}`,
        `- \u8FD8\u5DEE\uFF1A\xA5${money(gap)}\uFF08\u672C\u6708\u5269 ${remainDays} \u5929\uFF09`
      ].join("\n");
      const dd = now || NOW();
      const ym = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0");
      return { type: "task", key: `task:${m.id}:${ym}`, title: title2, body };
    }
    __name(taskItem, "taskItem");
    function billItem(b, m, daysLeft) {
      const name = m && (m.alias || m.name) || "\u672A\u547D\u540D\u5361\u7247";
      const title2 = daysLeft < 0 ? `\u8D26\u5355\u903E\u671F\u672A\u8FD8\uFF1A${name}\uFF08${b.month}\uFF09` : `\u8D26\u5355\u63D0\u9192\uFF1A${name} ${daysLeft === 0 ? "\u4ECA\u65E5\u5230\u671F" : `\u8FD8\u6709 ${daysLeft} \u5929`}`;
      const body = [
        `- \u94F6\u884C\uFF1A${m && m.bank || "\u2014"}`,
        `- \u5361\u7247\uFF1A${m && m.name || "\u2014"}${m && m.alias ? `\uFF08${m.alias}\uFF09` : ""}`,
        `- \u51FA\u8D26\u6708\u4EFD\uFF1A${b.month}`,
        `- \u8D26\u5355\u91D1\u989D\uFF1A\xA5${money(b.amount)}`,
        `- \u5230\u671F\u8FD8\u6B3E\u65E5\uFF1A${b.dueDate}${daysLeft < 0 ? `\uFF08\u5DF2\u903E\u671F ${Math.abs(daysLeft)} \u5929\uFF09` : ""}`,
        daysLeft < 0 ? "- \u72B6\u6001\uFF1A**\u4ECD\u672A\u6807\u8BB0\u4E3A\u5DF2\u8FD8**\uFF0C\u8BF7\u5C3D\u5FEB\u5904\u7406" : "- \u72B6\u6001\uFF1A\u672A\u8FD8"
      ].join("\n");
      return { type: "bill", key: `bill:${b.myCardId}:${b.month}:${daysLeft < 0 ? "overdue" : "due"}`, title: title2, body };
    }
    __name(billItem, "billItem");
    function groupRepayItem(gid, name, members, days, lastPayDate) {
      const head = days === 0 ? `\u4ECA\u65E5\u8FD8\u6B3E\uFF1A${name}` : `\u8FD8\u6B3E\u63D0\u9192\uFF1A${name} ${days} \u5929\u540E\u5230\u671F`;
      const title2 = `${head}\uFF08${members.length} \u5F20\u5361\u5408\u5E76\uFF09`;
      const lines = members.map((m) => {
        const p = m.payment || {};
        const n = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
        const extra = p.isInGrace ? "\uFF08\u5BBD\u9650\u671F\u5185\uFF09" : "";
        return `- ${n}\uFF5C${m.bank || "\u2014"}\uFF5C\u94F6\u884C\u5230\u671F ${p.dueDate || "\u2014"}${extra}`;
      });
      const body = [
        `- \u8D26\u5355\u7EC4\uFF1A${name}\uFF08\u5171 ${members.length} \u5F20\u5361\uFF0C\u5408\u5E76\u8FD8\u6B3E\uFF09`,
        `- \u6700\u540E\u8FD8\u6B3E\u65E5\uFF1A${lastPayDate}\uFF08${days === 0 ? "\u5C31\u662F\u4ECA\u5929" : `\u8FD8\u6709 ${days} \u5929`}\uFF09`,
        ...lines
      ].join("\n");
      return { type: "repay", key: `repay:group:${gid}:${lastPayDate}:${days === 0 ? "today" : "d" + days}`, title: title2, body };
    }
    __name(groupRepayItem, "groupRepayItem");
    function groupBillItem(gid, name, entries, month, daysLeft) {
      const title2 = daysLeft < 0 ? `\u8D26\u5355\u903E\u671F\u672A\u8FD8\uFF1A${name}\uFF08${month}\uFF09` : `\u8D26\u5355\u63D0\u9192\uFF1A${name} ${daysLeft === 0 ? "\u4ECA\u65E5\u5230\u671F" : `\u8FD8\u6709 ${daysLeft} \u5929`}`;
      const total = entries.reduce((s, e) => s + (Number(e.b.amount) || 0), 0);
      const lines = entries.map((e) => {
        const m = e.m || {};
        return `- ${m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247"}\uFF5C\u8D26\u5355 \xA5${money(e.b.amount)}\uFF5C\u5230\u671F ${e.b.dueDate}`;
      });
      const body = [
        `- \u8D26\u5355\u7EC4\uFF1A${name}\uFF08\u5171 ${entries.length} \u5F20\u5361\uFF0C\u5408\u5E76\u8FD8\u6B3E\uFF09`,
        `- \u51FA\u8D26\u6708\u4EFD\uFF1A${month}`,
        `- \u5408\u8BA1\u5E94\u8FD8\uFF1A\xA5${money(total)}`,
        `- \u5230\u671F\u8FD8\u6B3E\u65E5\uFF1A${entries[0].b.dueDate}${daysLeft < 0 ? `\uFF08\u5DF2\u903E\u671F ${Math.abs(daysLeft)} \u5929\uFF09` : ""}`,
        ...lines,
        daysLeft < 0 ? "- \u72B6\u6001\uFF1A**\u4ECD\u672A\u6807\u8BB0\u4E3A\u5DF2\u8FD8**\uFF0C\u8BF7\u5C3D\u5FEB\u5904\u7406" : "- \u72B6\u6001\uFF1A\u672A\u8FD8"
      ].join("\n");
      return { type: "bill", key: `bill:group:${gid}:${month}:${daysLeft < 0 ? "overdue" : "due"}`, title: title2, body };
    }
    __name(groupBillItem, "groupBillItem");
    function collectReminders(cards, cfg, now, bills) {
      now = now || NOW();
      const items = [];
      const remainDaysInMonth = daysInMonth(now.getFullYear(), now.getMonth() + 1) - now.getDate();
      const groups = /* @__PURE__ */ new Map();
      for (const m of cards || []) {
        if (!m.billGroupId) continue;
        if (!groups.has(m.billGroupId)) groups.set(m.billGroupId, []);
        groups.get(m.billGroupId).push(m);
      }
      for (const members of groups.values()) {
        members.sort((a, b) => String((a.payment || {}).lastPayDate || "").localeCompare(String((b.payment || {}).lastPayDate || "")));
      }
      for (const m of cards || []) {
        if (m.waiver && m.waiver.needsPayment && Number.isFinite(m.feeDays) && m.feeDays >= 0) {
          const applicable = cfg.rules.feeDays.filter((d) => m.feeDays <= d).sort((a, b) => a - b);
          if (applicable.length) items.push(feeItem(m, m.feeDays, applicable[0]));
        }
        if (cfg.rules.repayBeforeDays > 0 && m.payment && Number.isFinite(m.payment.payDaysLeft)) {
          const d = m.payment.payDaysLeft;
          if (d >= 0 && d <= cfg.rules.repayBeforeDays) {
            const g = m.billGroupId ? groups.get(m.billGroupId) : null;
            if (g) {
              if (g[0].id === m.id) items.push(groupRepayItem(g[0].billGroupId, g[0].billGroupName || "\u5408\u5E76\u8D26\u5355\u7EC4", g, d, m.payment.lastPayDate));
            } else {
              items.push(repayItem(m, d, now));
            }
          }
        }
        if (cfg.rules.taskRemainDays > 0 && m.monthlySpendTarget > 0) {
          const gap = Math.max(0, Number(m.monthlySpendTarget) - Number(m.monthSpend || 0));
          if (gap > 0 && remainDaysInMonth <= cfg.rules.taskRemainDays) items.push(taskItem(m, remainDaysInMonth, gap, now));
        }
      }
      const today = todayStr(now);
      const byId = new Map((cards || []).map((m) => [m.id, m]));
      const billBuckets = /* @__PURE__ */ new Map();
      for (const b of bills || []) {
        if (b.paid === "\u5DF2\u8FD8" || !b.dueDate) continue;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate)) continue;
        const [yy, mm, dd] = b.dueDate.split("-").map(Number);
        if (mm < 1 || mm > 12 || dd < 1 || dd > daysInMonth(yy, mm)) continue;
        const overdue = b.dueDate < today;
        const daysLeft = diffDaysOf(b.dueDate, now);
        if (overdue ? !cfg.rules.billOverdueRemind : daysLeft > cfg.rules.billBeforeDays) continue;
        const m = byId.get(b.myCardId);
        const gid = m && m.billGroupId;
        const g = gid ? groups.get(gid) : null;
        const key = g ? "G:" + gid + ":" + b.month + ":" + (overdue ? "o" : "d") : "C:" + b.myCardId;
        let bucket = billBuckets.get(key);
        if (!bucket) {
          bucket = { gid: gid || "", month: b.month, overdue, entries: [] };
          billBuckets.set(key, bucket);
        }
        bucket.entries.push({ b, m });
      }
      for (const bucket of billBuckets.values()) {
        const g = bucket.gid ? groups.get(bucket.gid) : null;
        if (!g) {
          const e = bucket.entries[0];
          items.push(billItem(e.b, e.m, diffDaysOf(e.b.dueDate, now)));
          continue;
        }
        bucket.entries.sort((x, y) => String(x.b.dueDate).localeCompare(String(y.b.dueDate)));
        const earliest = bucket.entries[0];
        const daysLeft = diffDaysOf(earliest.b.dueDate, now);
        items.push(groupBillItem(bucket.gid, g[0].billGroupName || "\u5408\u5E76\u8D26\u5355\u7EC4", bucket.entries, bucket.month, daysLeft));
      }
      return items;
    }
    __name(collectReminders, "collectReminders");
    function diffDaysOf(dateStr, now) {
      const t = /* @__PURE__ */ new Date(String(dateStr) + "T00:00:00");
      const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.round((t - t0) / 864e5);
    }
    __name(diffDaysOf, "diffDaysOf");
    async function runChecks(cards, cfg, notifier, now, bills, assetData) {
      now = now || NOW();
      const date = todayStr(now);
      const assetItems = assetData ? require_assets().collectAssetExpiry(assetData, cfg, now) : [];
      const items = collectReminders(cards, cfg, now, bills).concat(assetItems);
      const pending = items.filter((it) => !cfg.sentLog[it.key]);
      const results = [];
      for (const it of pending) {
        const sent2 = await notifier.notifyAll(cfg, it.title, it.body);
        const okList = sent2.filter((s) => s.ok).map((s) => s.label);
        const errList = sent2.filter((s) => !s.ok).map((s) => `${s.label}: ${s.error}`);
        if (sent2.length === 0) {
          results.push({ type: it.type, key: it.key, title: it.title, ok: false, error: "\u6CA1\u6709\u5DF2\u542F\u7528\u7684\u63D0\u9192\u901A\u9053" });
        } else {
          cfg.sentLog[it.key] = date;
          results.push({ type: it.type, key: it.key, title: it.title, ok: okList.length > 0, sent: okList, error: errList.join("\uFF1B") });
        }
        pushHistory(cfg, {
          time: now.toISOString(),
          type: it.type,
          title: it.title,
          channels: sent2,
          ok: okList.length > 0
        });
      }
      pruneSentLog(cfg, now);
      const sent = results.filter((r) => r.ok).length;
      return { checked: items.length, sent, results };
    }
    __name(runChecks, "runChecks");
    var SENTLOG_KEEP_DAYS = 120;
    function pruneSentLog(cfg, now) {
      const log3 = cfg.sentLog;
      if (!log3 || typeof log3 !== "object") {
        cfg.sentLog = {};
        return;
      }
      const keys = Object.keys(log3);
      if (keys.length <= 200) return;
      const cutoff = new Date((now || NOW()).getTime() - SENTLOG_KEEP_DAYS * 864e5);
      const cutoffStr = todayStr(cutoff);
      for (const k of keys) {
        const d = log3[k];
        if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < cutoffStr) delete log3[k];
      }
    }
    __name(pruneSentLog, "pruneSentLog");
    function pushHistory(cfg, entry) {
      cfg.history = cfg.history || [];
      cfg.history.unshift(entry);
      if (cfg.history.length > 30) cfg.history = cfg.history.slice(0, 30);
    }
    __name(pushHistory, "pushHistory");
    module.exports = {
      DEFAULT_CONFIG,
      normalizeConfig,
      collectReminders,
      runChecks,
      daysToRepay,
      todayStr
    };
  }
});

// vendored/dates.js
var require_dates = __commonJS({
  "vendored/dates.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function daysInMonth(y, m) {
      return new Date(y, m, 0).getDate();
    }
    __name(daysInMonth, "daysInMonth");
    function pad2(n) {
      return String(n).padStart(2, "0");
    }
    __name(pad2, "pad2");
    function dateStr(d) {
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }
    __name(dateStr, "dateStr");
    function atDay(y, m, d) {
      const max = daysInMonth(y, m + 1);
      return new Date(y, m, Math.min(Math.max(1, Math.round(Number(d) || 1)), max));
    }
    __name(atDay, "atDay");
    function startOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    __name(startOfDay, "startOfDay");
    function diffDays(a, b) {
      return Math.round((startOfDay(a) - startOfDay(b)) / 864e5);
    }
    __name(diffDays, "diffDays");
    function billDateOf(billingDay, now, offset) {
      const bd = Math.min(31, Math.max(1, Math.round(Number(billingDay) || 1)));
      let y = now.getFullYear();
      let m = now.getMonth() + 1;
      if (now.getDate() <= bd) m -= 1;
      m += offset || 0;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return atDay(y, m - 1, bd);
    }
    __name(billDateOf, "billDateOf");
    function dueDateOf(card, billDate) {
      const mode = card.repayMode === "afterBill" ? "afterBill" : "fixed";
      const v = Math.round(Number(card.repayValue) || 0);
      if (mode === "afterBill") {
        return new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate() + Math.max(0, v));
      }
      const day = Math.min(31, Math.max(1, v || 1));
      const billDay = billDate.getDate();
      if (day > billDay) {
        return atDay(billDate.getFullYear(), billDate.getMonth(), day);
      }
      let y = billDate.getFullYear();
      let m = billDate.getMonth() + 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      return atDay(y, m, day);
    }
    __name(dueDateOf, "dueDateOf");
    function lastPayDateOf(dueDate, graceDays) {
      const g = Math.max(0, Math.round(Number(graceDays) || 0));
      return new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + g);
    }
    __name(lastPayDateOf, "lastPayDateOf");
    function repayAlertOf(payDaysLeft) {
      if (payDaysLeft < 0) return "\u5DF2\u903E\u671F";
      if (payDaysLeft === 0) return "\u4ECA\u65E5\u5230\u671F";
      if (payDaysLeft <= 3) return "3\u5929\u5185";
      if (payDaysLeft <= 7) return "\u672C\u5468\u5185";
      return "\u6B63\u5E38";
    }
    __name(repayAlertOf, "repayAlertOf");
    function feeAlertOf(card, feeDaysLeft, feeWaived) {
      if (!(Number(card.annualFee) > 0)) return "\u65E0\u5E74\u8D39";
      if (feeWaived) return "\u672C\u5E74\u8C41\u514D";
      if (feeDaysLeft < 0) return "\u5DF2\u8FC7\u65E5";
      if (feeDaysLeft <= 7) return "7\u5929\u5185";
      if (feeDaysLeft <= 30) return "\u672C\u6708\u5185";
      return "\u6B63\u5E38";
    }
    __name(feeAlertOf, "feeAlertOf");
    function paymentInfo(card, now) {
      now = now || NOW();
      const grace = Math.max(0, Math.round(Number(card.graceDays) || 0));
      const billDate = billDateOf(card.billingDay, now, 0);
      const nextBillDate = billDateOf(card.billingDay, now, 1);
      const due0 = dueDateOf(card, billDate);
      const last0 = lastPayDateOf(due0, grace);
      const due1 = dueDateOf(card, nextBillDate);
      const last1 = lastPayDateOf(due1, grace);
      const useNext = diffDays(now, last0) > 0;
      const dueDate = useNext ? due1 : due0;
      const lastPayDate = useNext ? last1 : last0;
      const usedBillDate = useNext ? nextBillDate : billDate;
      const payDaysLeft = diffDays(lastPayDate, now);
      const dueDaysLeft = diffDays(dueDate, now);
      const bestSpendDate = new Date(nextBillDate.getFullYear(), nextBillDate.getMonth(), nextBillDate.getDate() + 1);
      const maxInterestDays = Number(card.maxInterestDays) > 0 ? Number(card.maxInterestDays) : diffDays(due1, nextBillDate);
      return {
        billDate: dateStr(usedBillDate),
        billMonth: dateStr(usedBillDate).slice(0, 7),
        dueDate: dateStr(dueDate),
        lastPayDate: dateStr(lastPayDate),
        nextPayDate: dateStr(lastPayDate),
        payDaysLeft,
        dueDaysLeft,
        isInGrace: dueDaysLeft < 0 && payDaysLeft >= 0,
        repayAlert: repayAlertOf(payDaysLeft),
        bestSpendDate: dateStr(bestSpendDate),
        maxInterestDays
      };
    }
    __name(paymentInfo, "paymentInfo");
    module.exports = {
      daysInMonth,
      dateStr,
      atDay,
      startOfDay,
      diffDays,
      billDateOf,
      dueDateOf,
      lastPayDateOf,
      paymentInfo,
      repayAlertOf,
      feeAlertOf
    };
  }
});

// vendored/ics.js
var require_ics = __commonJS({
  "vendored/ics.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var D = require_dates();
    var U = require_util();
    var CALNAME = "\u7BA1\u5361\u63D0\u9192";
    var HORIZON_DAYS = 183;
    function esc(text) {
      return String(text == null ? "" : text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    }
    __name(esc, "esc");
    function foldLine(line) {
      const total = Buffer.byteLength(line, "utf8");
      if (total <= 75) return line;
      const parts = [];
      let cur = "";
      let len = 0;
      for (const ch of line) {
        const n = Buffer.byteLength(ch, "utf8");
        if (len + n > 75) {
          parts.push(cur);
          cur = "";
          len = 0;
        }
        cur += ch;
        len += n;
      }
      if (cur) parts.push(cur);
      return parts.join("\r\n ");
    }
    __name(foldLine, "foldLine");
    function icsDate(dateStr) {
      return String(dateStr || "").replace(/-/g, "");
    }
    __name(icsDate, "icsDate");
    function money(n) {
      const v = Number(n) || 0;
      return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
    }
    __name(money, "money");
    function dstr(d) {
      return U.toDateStr(d);
    }
    __name(dstr, "dstr");
    function collectEvents(computed, bills, now, assetData) {
      now = now || NOW();
      const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + HORIZON_DAYS);
      const events = [];
      const seen = /* @__PURE__ */ new Set();
      const push = /* @__PURE__ */ __name((ev) => {
        if (!ev || !ev.date || seen.has(ev.uid)) return;
        const t = /* @__PURE__ */ new Date(ev.date + "T00:00:00");
        if (isNaN(t.getTime())) return;
        if (t >= horizon) return;
        seen.add(ev.uid);
        events.push(ev);
      }, "push");
      const groups = /* @__PURE__ */ new Map();
      for (const m of computed || []) {
        if (!m.billGroupId) continue;
        if (!groups.has(m.billGroupId)) groups.set(m.billGroupId, []);
        groups.get(m.billGroupId).push(m);
      }
      const groupedDone = /* @__PURE__ */ new Set();
      for (const m of computed || []) {
        const name = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
        const p = m.payment || {};
        if (p.lastPayDate) {
          if (m.billGroupId) {
            if (!groupedDone.has(m.billGroupId)) {
              groupedDone.add(m.billGroupId);
              const g = groups.get(m.billGroupId) || [];
              const members = g.map((x) => x.alias || x.name || "\u672A\u547D\u540D\u5361\u7247");
              push({
                uid: "guanka-repay-group-" + m.billGroupId + "-" + p.lastPayDate,
                date: p.lastPayDate,
                title: "\u8FD8\u6B3E\u65E5\uFF1A" + (m.billGroupName || "\u5408\u5E76\u8D26\u5355\u7EC4") + "\uFF08" + g.length + " \u5F20\u5361\uFF09",
                desc: [
                  "\u5408\u5E76\u8D26\u5355\u7EC4\u8FD8\u6B3E\uFF08\u7EC4\u5185 " + g.length + " \u5F20\u5361\uFF09",
                  "\u6210\u5458\uFF1A" + members.join("\u3001"),
                  "\u6700\u540E\u53EF\u8FD8\u6B3E\u65E5\uFF08\u542B\u5BBD\u9650\u671F\uFF09\uFF1A" + p.lastPayDate
                ].join("\n")
              });
            }
          } else {
            push({
              uid: "guanka-repay-" + m.id + "-" + p.lastPayDate,
              date: p.lastPayDate,
              title: "\u8FD8\u6B3E\u65E5\uFF1A" + name,
              desc: [
                "\u94F6\u884C\uFF1A" + (m.bank || "\u2014"),
                "\u5361\u7247\uFF1A" + (m.name || "\u2014") + (m.alias ? "\uFF08" + m.alias + "\uFF09" : ""),
                "\u672C\u671F\u8D26\u5355\u65E5\uFF1A" + (p.billDate || "\u2014"),
                "\u94F6\u884C\u5230\u671F\u65E5\uFF1A" + (p.dueDate || "\u2014"),
                "\u6700\u540E\u53EF\u8FD8\u6B3E\u65E5\uFF08\u542B\u5BBD\u9650\u671F\uFF09\uFF1A" + p.lastPayDate,
                "\u989D\u5EA6\uFF1A\xA5" + money(m.creditLimit)
              ].join("\n")
            });
          }
        }
        if (m.nextFeeDate) {
          push({
            uid: "guanka-fee-" + m.id + "-" + m.nextFeeDate,
            date: m.nextFeeDate,
            title: "\u5E74\u8D39\u65E5\uFF1A" + name,
            desc: [
              "\u94F6\u884C\uFF1A" + (m.bank || "\u2014"),
              "\u5361\u7247\uFF1A" + (m.name || "\u2014") + (m.alias ? "\uFF08" + m.alias + "\uFF09" : ""),
              "\u5E74\u8D39\uFF1A\xA5" + money(m.annualFee),
              "\u5F53\u524D\u72B6\u6001\uFF1A" + (m.waiver && m.waiver.needsPayment ? "\u672A\u8FBE\u6807\uFF08\u9700\u7F34\u8D39\uFF09" : "\u5DF2\u8FBE\u6807/\u5DF2\u8C41\u514D"),
              m.waiver && m.waiver.kind ? "\u5237\u514D\u65B9\u5F0F\uFF1A" + m.waiver.kind : ""
            ].filter(Boolean).join("\n")
          });
        }
        if (Number(m.monthlySpendTarget) > 0) {
          const t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const end = dstr(t);
          push({
            uid: "guanka-task-" + m.id + "-" + end,
            date: end,
            title: "\u5237\u5361\u4EFB\u52A1\u622A\u6B62\uFF1A" + name,
            desc: [
              "\u94F6\u884C\uFF1A" + (m.bank || "\u2014"),
              "\u5361\u7247\uFF1A" + name,
              "\u672C\u6708\u76EE\u6807\uFF1A\xA5" + money(m.monthlySpendTarget),
              "\u5DF2\u6D88\u8D39\uFF1A\xA5" + money(m.monthSpend),
              "\u8FD8\u5DEE\uFF1A\xA5" + money(Math.max(0, Number(m.monthlySpendTarget) - Number(m.monthSpend || 0)))
            ].join("\n")
          });
        }
      }
      for (const b of bills || []) {
        if (b.paid === "\u5DF2\u8FD8" || !b.dueDate) continue;
        const m = (computed || []).find((x) => x.id === b.myCardId) || {};
        const name = m.alias || m.name || "\u672A\u547D\u540D\u5361\u7247";
        push({
          uid: "guanka-bill-" + b.myCardId + "-" + (b.month || "") + "-" + b.dueDate,
          date: b.dueDate,
          title: "\u8D26\u5355\u5230\u671F\uFF1A" + name + "\uFF08" + (b.month || "") + "\uFF09",
          desc: [
            "\u94F6\u884C\uFF1A" + (m.bank || "\u2014"),
            "\u5361\u7247\uFF1A" + name,
            "\u51FA\u8D26\u6708\u4EFD\uFF1A" + (b.month || "\u2014"),
            "\u8D26\u5355\u91D1\u989D\uFF1A\xA5" + money(b.amount),
            "\u5230\u671F\u8FD8\u6B3E\u65E5\uFF1A" + b.dueDate,
            b.paid === "\u90E8\u5206\u8FD8\u6B3E" ? "\u72B6\u6001\uFF1A\u90E8\u5206\u8FD8\u6B3E" : "\u72B6\u6001\uFF1A\u672A\u8FD8"
          ].join("\n")
        });
      }
      if (assetData && typeof assetData === "object") {
        const scanAssets = /* @__PURE__ */ __name((list, kind, label) => {
          for (const it of list || []) {
            if (!it || !it.expiry) continue;
            const nm = it.name || it.title || "\u672A\u547D\u540D";
            const sub = it.brand || it.platform || "";
            let remain = "";
            if (kind === "membership") {
              remain = it.mode === "amount" ? "\u5269\u4F59\uFF1A\xA5" + money(it.balance) : "\u5269\u4F59\uFF1A" + Math.max(0, (Number(it.totalUses) || 0) - (Number(it.usedUses) || 0)) + " \u6B21";
            } else if (kind === "voucher") {
              remain = it.mode === "amount" ? "\u5269\u4F59\uFF1A\xA5" + money(it.balance) : "\u5269\u4F59\uFF1A" + Math.max(0, (Number(it.totalUses) || 0) - (Number(it.usedUses) || 0)) + " \u6B21";
            }
            const desc = [
              label ? "\u5206\u7C7B\uFF1A" + label : "",
              sub ? "\u5546\u5BB6/\u5E73\u53F0\uFF1A" + sub : "",
              "\u5230\u671F\u65E5\uFF1A" + it.expiry,
              remain
            ].filter(Boolean).join("\n");
            push({
              uid: "guanka-asset-" + kind + "-" + it.id + "-" + it.expiry,
              date: it.expiry,
              title: label + "\u5230\u671F\uFF1A" + nm,
              desc
            });
          }
        }, "scanAssets");
        scanAssets(assetData.memberships, "membership", "\u4F1A\u5458\u5361/\u50A8\u503C\u5361");
        scanAssets(assetData.vouchers, "voucher", "\u5361/\u7968");
        scanAssets((assetData.knowledge || []).filter((k) => k && !k.lifetime), "knowledge", "\u77E5\u8BC6\u5E93\u8BA2\u9605");
      }
      events.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.uid).localeCompare(String(b.uid)));
      return events;
    }
    __name(collectEvents, "collectEvents");
    function buildICS(events, now) {
      const stamp = toUTC(new Date(now || NOW().getTime()));
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//guanka//credit-card-manager//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:" + esc(CALNAME),
        "X-WR-CALDESC:" + esc("\u4FE1\u7528\u5361\u8FD8\u6B3E/\u5E74\u8D39/\u8D26\u5355/\u5237\u5361\u4EFB\u52A1 + \u4F1A\u5458\u5361/\u5361\u7968/\u77E5\u8BC6\u5E93\u5230\u671F\u63D0\u9192"),
        "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
        "X-PUBLISHED-TTL:PT12H"
      ];
      for (const ev of events) {
        lines.push(
          "BEGIN:VEVENT",
          "UID:" + esc(ev.uid),
          "DTSTAMP:" + stamp,
          "DTSTART;VALUE=DATE:" + icsDate(ev.date),
          // 全天事件 DTEND 为排他日：次日
          "DTEND;VALUE=DATE:" + icsDate(nextDay(ev.date)),
          "SUMMARY:" + esc(ev.title),
          "DESCRIPTION:" + esc(ev.desc),
          "TRANSP:TRANSPARENT",
          // 全天提醒不占用时间块
          "CLASS:PRIVATE",
          // 提前 1 天 09:00 提醒（全天事件的 VALARM 用绝对时刻相对日期算）
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          "DESCRIPTION:" + esc(ev.title),
          "TRIGGER;VALUE=DATE-TIME:" + alarmTrigger(ev.date),
          "END:VALARM",
          "END:VEVENT"
        );
      }
      lines.push("END:VCALENDAR");
      return lines.map(foldLine).join("\r\n") + "\r\n";
    }
    __name(buildICS, "buildICS");
    function nextDay(dateStr) {
      const t = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
      return dstr(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
    }
    __name(nextDay, "nextDay");
    function toUTC(d) {
      return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") + "T" + String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + String(d.getUTCSeconds()).padStart(2, "0") + "Z";
    }
    __name(toUTC, "toUTC");
    function alarmTrigger(dateStr) {
      const t = /* @__PURE__ */ new Date(dateStr + "T09:00:00");
      t.setDate(t.getDate() - 1);
      return toUTC(t);
    }
    __name(alarmTrigger, "alarmTrigger");
    function generateICS(computed, bills, now, assetData) {
      return buildICS(collectEvents(computed, bills, now, assetData), now);
    }
    __name(generateICS, "generateICS");
    module.exports = { generateICS, collectEvents, _internals: { esc, foldLine, icsDate, buildICS } };
  }
});

// vendored/auth-shim.js
var require_auth_shim = __commonJS({
  "vendored/auth-shim.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function sameOrigin(req) {
      const h = req && req.headers || {};
      const source = h.origin || h.referer || "";
      if (!source) return true;
      try {
        return new URL(source).host === (h.host || "");
      } catch (e) {
        return false;
      }
    }
    __name(sameOrigin, "sameOrigin");
    module.exports = { sameOrigin };
  }
});

// vendored/routes.js
var require_routes = __commonJS({
  "vendored/routes.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var crypto2 = require_crypto();
    var U = require_util();
    var { SEED_CARDS, SEED_VERSION } = require_seed();
    var notifier = require_notifier2();
    var reminder = require_reminder();
    var ics = require_ics();
    var D = require_dates();
    var A = require_assets();
    var APP_VERSION = "1.1.6";
    function getBills() {
      return store.readArray("bills");
    }
    __name(getBills, "getBills");
    function getMemberships() {
      return store.readArray("memberships");
    }
    __name(getMemberships, "getMemberships");
    function getVouchers() {
      return store.readArray("vouchers");
    }
    __name(getVouchers, "getVouchers");
    function getVoucherBrands() {
      return store.readArray("voucherBrands");
    }
    __name(getVoucherBrands, "getVoucherBrands");
    function getKnowledge() {
      return store.readArray("knowledge");
    }
    __name(getKnowledge, "getKnowledge");
    function getAssetMeta() {
      return {
        memCategories: A.MEM_CATEGORIES,
        memCatLabels: A.MEM_CAT_LABELS,
        voucherTypes: A.VOUCHER_TYPES,
        voucherTypeMeta: A.VOUCHER_TYPE_META,
        kgTypes: A.KG_TYPES,
        kgTypeLabels: A.KG_TYPE_LABELS,
        kgCats: A.KG_CATS,
        kgCatLabels: A.KG_CAT_LABELS,
        kgCycles: A.KG_CYCLES,
        kgCycleLabels: A.KG_CYCLE_LABELS
      };
    }
    __name(getAssetMeta, "getAssetMeta");
    function getBillGroups() {
      return store.readArray("billGroups");
    }
    __name(getBillGroups, "getBillGroups");
    function getNotifyRaw() {
      return store.readObject("notify", null);
    }
    __name(getNotifyRaw, "getNotifyRaw");
    var NOTIFY_SECRET_FIELDS = {
      wxpusher: ["appToken"],
      serverchan: ["sendkey"],
      bark: ["deviceKey"]
    };
    var MASK_PREFIX = "\u2022\u2022\u2022\u2022";
    function isMaskedSecret(v) {
      return typeof v === "string" && v.startsWith(MASK_PREFIX);
    }
    __name(isMaskedSecret, "isMaskedSecret");
    function maskSecret(v) {
      const s = String(v || "");
      if (!s) return "";
      return s.length <= 4 ? MASK_PREFIX : MASK_PREFIX + s.slice(-4);
    }
    __name(maskSecret, "maskSecret");
    function maskNotifySecrets(cfg) {
      const clone = JSON.parse(JSON.stringify(cfg || {}));
      for (const ch of Object.keys(NOTIFY_SECRET_FIELDS)) {
        const c = clone.channels && clone.channels[ch];
        if (!c) continue;
        for (const f of NOTIFY_SECRET_FIELDS[ch]) {
          if (c[f]) c[f] = maskSecret(c[f]);
        }
      }
      return clone;
    }
    __name(maskNotifySecrets, "maskNotifySecrets");
    function groupNameOf(groupId) {
      if (!groupId) return "";
      const g = getBillGroups().find((x) => x.id === groupId);
      return g ? g.name : "";
    }
    __name(groupNameOf, "groupNameOf");
    var REPAY_PROBE_DAYS = [1, 5, 10, 15, 20, 25, 28, 29, 30, 31];
    function sameRepaySchedule(a, b, now) {
      if (a === b) return true;
      const base = now || NOW();
      for (let i = 0; i < 14; i++) {
        for (const d of REPAY_PROBE_DAYS) {
          const probe = new Date(base.getFullYear(), base.getMonth() + i, d);
          if (D.paymentInfo(a, probe).lastPayDate !== D.paymentInfo(b, probe).lastPayDate) return false;
        }
      }
      return true;
    }
    __name(sameRepaySchedule, "sameRepaySchedule");
    function groupAssignError(myCards, target, groupId, now) {
      if (!groupId) return "";
      if (!getBillGroups().some((g) => g.id === groupId)) return "\u5408\u5E76\u8D26\u5355\u7EC4\u4E0D\u5B58\u5728";
      for (const other of myCards) {
        if (other.id === target.id || other.billGroupId !== groupId) continue;
        if (!sameRepaySchedule(other, target, now)) {
          return "\u4E0E\u300C" + (other.alias || other.name) + "\u300D\u7684\u6700\u540E\u8FD8\u6B3E\u65E5\u4E0D\u4E00\u81F4\uFF0C\u65E0\u6CD5\u5408\u5E76\uFF08\u7EC4\u5185\u5361\u5FC5\u987B\u540C\u8FD8\u6B3E\u65E5\uFF09";
        }
      }
      return "";
    }
    __name(groupAssignError, "groupAssignError");
    function cleanBillGroups() {
      const groups = getBillGroups();
      const myCards = getMyCards();
      const ids = new Set(groups.map((g) => g && g.id).filter(Boolean));
      let changed = false;
      for (const m of myCards) {
        if (m.billGroupId && !ids.has(m.billGroupId)) {
          m.billGroupId = "";
          changed = true;
        }
      }
      if (changed) store.write("mycards", myCards);
      const alive = new Set(myCards.map((m) => m.billGroupId).filter(Boolean));
      const kept = groups.filter((g) => g && alive.has(g.id));
      if (kept.length !== groups.length) store.write("billGroups", kept);
    }
    __name(cleanBillGroups, "cleanBillGroups");
    function feeStatusOf(mc, now, ws) {
      const year = now.getFullYear();
      if (!(Number(mc.annualFee) > 0)) return "\u65E0\u5E74\u8D39";
      if (Number(mc.waivedYear) >= year && Number(mc.waivedYear) > 0) return "\u5DF2\u8FBE\u6807(\u624B\u5DE5)";
      const w = ws || {};
      const periodOk = !Number(mc.countPeriodYear) || Number(mc.countPeriodYear) >= year;
      let autoMet = false;
      if (w.kind === "\u514D\u5E74\u8D39") autoMet = true;
      else if (w.kind === "\u521A\u6027") autoMet = false;
      else autoMet = !!w.met;
      return periodOk && autoMet ? "\u5DF2\u8FBE\u6807(\u81EA\u52A8)" : "\u672A\u8FBE\u6807";
    }
    __name(feeStatusOf, "feeStatusOf");
    var CARD_FIELDS = ["bank", "name", "level", "org", "annualFee", "waiverType", "waiverCondition", "waiverPolicy", "startCredit", "benefits", "applyCondition", "note"];
    var CSV_HEADER = ["\u94F6\u884C", "\u5361\u7247\u540D\u79F0", "\u5361\u7B49\u7EA7", "\u5361\u7EC4\u7EC7", "\u5E74\u8D39", "\u514D\u5E74\u8D39\u7C7B\u578B", "\u5237\u514D\u6761\u4EF6", "\u514D\u5E74\u8D39\u653F\u7B56", "\u8D77\u6279\u989D\u5EA6", "\u4E3B\u8981\u6743\u76CA", "\u7533\u8BF7\u6761\u4EF6", "\u5907\u6CE8"];
    var WAIVER_TYPES = ["\u6D88\u8D39\u5237\u514D", "\u7B14\u6570\u5237\u514D", "\u79EF\u5206\u62B5\u6263", "\u8D44\u4EA7\u5B58\u514D", "\u521A\u6027", "\u514D\u5E74\u8D39"];
    var RESET_CYCLES = ["\u81EA\u7136\u6708", "\u81EA\u7136\u5E74", "\u5E74\u8D39\u65E5", "\u4E00\u6B21\u6027", "\u65E0\u56FA\u5B9A"];
    var BENEFIT_TYPES = ["\u5883\u5185\u63A5\u9001\u673A", "\u5883\u5916\u63A5\u9001\u673A", "\u5883\u5185\u673A\u573A\u8D35\u5BBE\u697C", "\u673A\u573A\u9F99\u817E\u60A6\u9014PP", "\u673A\u573A\u9F99\u817E\u60A6\u9014PP\uFF08\u53EF\u9910\u98DF\uFF09", "\u4EE3\u9A7E", "\u79DF\u8F66", "\u9053\u8DEF\u6551\u63F4", "\u4F53\u68C0", "\u6D17\u7259", "\u6302\u53F7", "\u6302\u53F7+\u5BFC\u8BCA", "\u9152\u5E97\u4F18\u60E0", "\u8FD0\u52A8\u5065\u8EAB", "\u5EF6\u8BEF\u9669", "\u79EF\u5206\u5151\u6362\u91CC\u7A0B", "\u5176\u4ED6"];
    var CHANNELS = ["\u5FAE\u4FE1\u652F\u4ED8", "\u652F\u4ED8\u5B9D\u652F\u4ED8", "\u4E91\u95EA\u4ED8\u7EBF\u4E0A", "\u4E91\u95EA\u4ED8\u7EBF\u4E0B", "ApplePay", "\u5176\u4ED6\u624B\u673APay", "\u7F8E\u56E2\u652F\u4ED8", "\u6296\u97F3\u652F\u4ED8", "\u4EAC\u4E1C\u652F\u4ED8", "\u7A0B\u652F\u4ED8", "\u591A\u591A\u652F\u4ED8", "POS\u673A\u5237\u5361"];
    var CATEGORIES = ["\u9910\u996E", "\u8D2D\u7269", "\u4EA4\u901A", "\u52A0\u6CB9", "\u8D85\u5E02", "\u65C5\u884C", "\u5A31\u4E50", "\u533B\u7597", "\u6559\u80B2", "\u5176\u4ED6"];
    var MYCARD_FIELDS = [
      "bank",
      "name",
      "org",
      "level",
      "alias",
      "last4",
      "creditLimit",
      "monthlySpendTarget",
      "billingDay",
      "repayMode",
      "repayValue",
      "graceDays",
      "maxInterestDays",
      "feeMonth",
      "feeDay",
      "waivedYear",
      "countPeriodYear",
      "benefits"
    ];
    var MYCARD_CSV_HEADER = [
      "\u94F6\u884C",
      "\u5361\u7247\u540D\u79F0",
      "\u5361\u7EC4\u7EC7",
      "\u5361\u7B49\u7EA7",
      "\u522B\u540D",
      "\u5361\u53F7\u540E\u56DB\u4F4D",
      "\u6388\u4FE1\u989D\u5EA6",
      "\u6708\u6D88\u8D39\u76EE\u6807",
      "\u8D26\u5355\u65E5",
      "\u8FD8\u6B3E\u65B9\u5F0F",
      "\u8FD8\u6B3E\u503C",
      "\u5BBD\u9650\u671F",
      "\u6700\u957F\u514D\u606F\u671F",
      "\u5E74\u8D39\u6536\u53D6\u6708",
      "\u5E74\u8D39\u6536\u53D6\u65E5",
      "\u5DF2\u8FBE\u6807\u5E74\u4EFD",
      "\u5DF2\u5237\u6838\u5B9A\u671F",
      "\u6743\u76CA"
    ];
    var MYCARD_CSV_SAMPLES = [
      [
        "\u62DB\u5546\u94F6\u884C",
        "\u7ECF\u5178\u767D\u91D1\u4FE1\u7528\u5361",
        "\u94F6\u8054+Mastercard",
        "\u767D\u91D1\u5361",
        "\u6211\u7684\u62DB\u884C\u767D",
        "6688",
        "50000",
        "8000",
        "5",
        "\u6BCF\u6708\u56FA\u5B9A\u65E5",
        "20",
        "3",
        "50",
        "3",
        "15",
        "",
        "",
        "\u673A\u573A\u8D35\u5BBE\u5385:6:\u81EA\u7136\u5E74|\u751F\u65E510\u500D\u79EF\u5206:1:\u81EA\u7136\u5E74"
      ],
      [
        "\u4E2D\u56FD\u94F6\u884C",
        "\u957F\u57CE\u73AF\u7403\u901A\u4FE1\u7528\u5361",
        "VISA",
        "\u91D1\u5361",
        "",
        "1234",
        "30000",
        "",
        "12",
        "\u8D26\u5355\u65E5\u540EN\u5929",
        "20",
        "5",
        "",
        "6",
        "1",
        "",
        "",
        "\u5883\u5916\u8FD4\u73B0:1:\u81EA\u7136\u6708"
      ]
    ];
    var store;
    function init(s) {
      store = s;
      const meta = store.readObject("meta", { seedVersion: 0 });
      let cards = store.readArray("cards");
      if (cards.length === 0) {
        cards = SEED_CARDS.map((c) => normalizeCard(c, null));
        store.write("cards", cards);
        store.write("meta", Object.assign({}, meta, { seedVersion: SEED_VERSION }));
      } else if (meta.seedVersion !== SEED_VERSION) {
        const keys = new Set(cards.map(cardKey));
        let added = 0;
        for (const c of SEED_CARDS) {
          const k = cardKey(c);
          if (!keys.has(k)) {
            cards.push(normalizeCard(c, null));
            keys.add(k);
            added++;
          }
        }
        store.write("cards", cards);
        store.write("meta", Object.assign({}, meta, { seedVersion: SEED_VERSION }));
        if (added > 0) console.log(`[\u7BA1\u5361] \u5361\u79CD\u5E93\u5DF2\u5408\u5E76 ${added} \u5F20\u65B0\u5361\uFF0C\u5F53\u524D\u5171 ${cards.length} \u5F20`);
      }
      store.readArray("mycards");
      store.readArray("consumptions");
      store.readArray("benefits");
      store.readArray("bills");
      store.readArray("billGroups");
      store.readObject("settings", { theme: "light", bankOrder: [], banksCollapsed: {}, cardBanksCollapsed: {} });
      cleanBillGroups();
      migrateBenefitIds();
    }
    __name(init, "init");
    function migrateBenefitIds() {
      const mcs = getMyCards();
      let bChanged = 0;
      for (const mc of mcs) {
        for (const b of mc.benefits || []) {
          if (!b.id) {
            b.id = U.uid();
            bChanged++;
          }
        }
      }
      if (bChanged) store.write("mycards", mcs);
      const mcById = new Map(mcs.map((m) => [m.id, m]));
      const recs = getBenefits();
      let rChanged = 0;
      for (const r of recs) {
        if (r.bid) continue;
        const mc = mcById.get(r.myCardId);
        const b = mc && (mc.benefits || [])[r.idx];
        if (b && b.id) {
          r.bid = b.id;
          rChanged++;
        }
      }
      if (rChanged) store.write("benefits", recs);
      if (bChanged || rChanged) console.log(`[\u7BA1\u5361] \u6743\u76CA\u7A33\u5B9A id \u8FC1\u79FB\u5B8C\u6210\uFF1A\u6743\u76CA ${bChanged} \u9879\u3001\u5386\u53F2\u8BB0\u5F55 ${rChanged} \u6761`);
    }
    __name(migrateBenefitIds, "migrateBenefitIds");
    function cardKey(c) {
      return [c.bank, c.name, c.org, c.level].map((x) => String(x || "").trim()).join("|");
    }
    __name(cardKey, "cardKey");
    function normalizeCard(c, id) {
      return {
        id: id || U.uid(),
        bank: String(c.bank || "").trim(),
        name: String(c.name || "").trim(),
        level: String(c.level || "").trim(),
        org: String(c.org || "").trim(),
        annualFee: U.parseAmount(c.annualFee),
        waiverType: WAIVER_TYPES.includes(c.waiverType) ? c.waiverType : "\u514D\u5E74\u8D39",
        waiverCondition: String(c.waiverCondition == null ? "0" : c.waiverCondition).trim(),
        waiverPolicy: String(c.waiverPolicy || "").trim(),
        startCredit: U.parseAmount(c.startCredit),
        benefits: Array.isArray(c.benefits) ? c.benefits.map((b) => String(b).trim()).filter(Boolean) : String(c.benefits || "").split("|").map((b) => b.trim()).filter(Boolean),
        applyCondition: String(c.applyCondition || "").trim(),
        note: String(c.note || "").trim()
      };
    }
    __name(normalizeCard, "normalizeCard");
    function getConsumptions() {
      return store.readArray("consumptions");
    }
    __name(getConsumptions, "getConsumptions");
    function getBenefits() {
      return store.readArray("benefits");
    }
    __name(getBenefits, "getBenefits");
    function getMyCards() {
      return store.readArray("mycards");
    }
    __name(getMyCards, "getMyCards");
    function getCards() {
      return store.readArray("cards");
    }
    __name(getCards, "getCards");
    function buildIndexes() {
      const consByCard = /* @__PURE__ */ new Map();
      for (const r of getConsumptions()) {
        let e = consByCard.get(r.myCardId);
        if (!e) {
          e = { amount: [], count: [] };
          consByCard.set(r.myCardId, e);
        }
        if (r.type === "amount") e.amount.push(r);
        else if (r.type === "count") e.count.push(r);
      }
      const benByCard = /* @__PURE__ */ new Map();
      for (const r of getBenefits()) {
        let m = benByCard.get(r.myCardId);
        if (!m) {
          m = /* @__PURE__ */ new Map();
          benByCard.set(r.myCardId, m);
        }
        const key = r.bid ? "bid:" + r.bid : "idx:" + r.idx;
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(r);
      }
      return { consByCard, benByCard };
    }
    __name(buildIndexes, "buildIndexes");
    function amountRecordsOf(myCardId) {
      return getConsumptions().filter((r) => r.myCardId === myCardId && r.type === "amount");
    }
    __name(amountRecordsOf, "amountRecordsOf");
    function cardYearRecordsOf(records, mc, now) {
      const start = U.cardYearStart(mc.feeMonth, mc.feeDay, now);
      const startStr = U.toDateStr(start);
      return records.amount.filter((r) => r.date >= startStr);
    }
    __name(cardYearRecordsOf, "cardYearRecordsOf");
    function waiverState(mc, now, recs) {
      const st = { needsPayment: true, kind: mc.waiverType, met: false, progress: 0, target: 0, remaining: 0, unit: "" };
      switch (mc.waiverType) {
        case "\u514D\u5E74\u8D39":
          st.needsPayment = false;
          st.met = true;
          break;
        case "\u521A\u6027":
          st.needsPayment = true;
          st.met = false;
          break;
        case "\u79EF\u5206\u62B5\u6263":
          st.needsPayment = !mc.pointsDeducted;
          st.met = !!mc.pointsDeducted;
          st.target = U.parseAmount(mc.waiverCondition);
          st.unit = "\u79EF\u5206";
          break;
        case "\u8D44\u4EA7\u5B58\u514D":
          st.needsPayment = !mc.assetWaived;
          st.met = !!mc.assetWaived;
          st.target = U.parseAmount(mc.waiverCondition);
          st.unit = "\u5143";
          break;
        case "\u6D88\u8D39\u5237\u514D": {
          const target = U.parseAmount(mc.waiverCondition);
          const progress = cardYearRecordsOf(recs, mc, now).reduce((s, r) => s + (Number(r.amount) || 0), 0);
          st.target = target;
          st.progress = progress;
          st.unit = "\u5143";
          st.met = progress >= target;
          st.needsPayment = !st.met;
          st.remaining = Math.max(0, target - progress);
          break;
        }
        case "\u7B14\u6570\u5237\u514D": {
          const target = Math.round(U.parseAmount(mc.waiverCondition));
          const yearRecs = cardYearRecordsOf(recs, mc, now);
          const startStr = U.toDateStr(U.cardYearStart(mc.feeMonth, mc.feeDay, now));
          const countExtra = recs.count.filter((r) => r.date >= startStr).reduce((s, r) => s + (Number(r.count) || 0), 0);
          const progress = yearRecs.length + countExtra;
          st.target = target;
          st.progress = progress;
          st.unit = "\u7B14";
          st.met = progress >= target;
          st.needsPayment = !st.met;
          st.remaining = Math.max(0, target - progress);
          break;
        }
        default:
          break;
      }
      return st;
    }
    __name(waiverState, "waiverState");
    function feeDaysColor(days, needsPayment) {
      if (!needsPayment) return "default";
      if (days < 30) return "red";
      if (days < 60) return "yellow";
      return "default";
    }
    __name(feeDaysColor, "feeDaysColor");
    function feeAlertOfWaived(mc) {
      if (!(Number(mc.annualFee) > 0)) return "\u65E0\u5E74\u8D39";
      return "\u672C\u5E74\u8C41\u514D";
    }
    __name(feeAlertOfWaived, "feeAlertOfWaived");
    function computeMyCard(mc, now, idx) {
      now = now || NOW();
      idx = idx || buildIndexes();
      const recs = idx.consByCard.get(mc.id) || { amount: [], count: [] };
      const monthStart = U.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      const yearStart = U.toDateStr(new Date(now.getFullYear(), 0, 1));
      const days = U.feeCountdown(mc.feeMonth, mc.feeDay, now);
      const ws = waiverState(mc, now, recs);
      const benefits = (mc.benefits || []).map((b, i) => {
        const u = benefitUsed(mc, i, now, idx);
        return { ...b, ...u };
      });
      let monthSpend = 0, yearSpend = 0, totalSpend = 0, monthCount = 0, yearCount = 0;
      for (const r of recs.amount) {
        const a = Number(r.amount) || 0;
        totalSpend += a;
        if (r.date >= monthStart) {
          monthSpend += a;
          monthCount++;
        }
        if (r.date >= yearStart) {
          yearSpend += a;
          yearCount++;
        }
      }
      const payment = D.paymentInfo(mc, now);
      const feeStatus = feeStatusOf(mc, now, ws);
      const feeWaived = feeStatus !== "\u672A\u8FBE\u6807";
      const nextFeeDateStr = U.toDateStr(U.nextFeeDate(mc.feeMonth, mc.feeDay, now));
      const nextFee = /* @__PURE__ */ new Date(nextFeeDateStr + "T00:00:00");
      const feeMonthsLeft = isNaN(nextFee.getTime()) ? null : (nextFee.getFullYear() - now.getFullYear()) * 12 + (nextFee.getMonth() - now.getMonth());
      const feeDaysLeft = days;
      const feeAlert = feeWaived ? feeAlertOfWaived(mc) : D.feeAlertOf(mc, feeDaysLeft, false);
      return {
        ...mc,
        benefits,
        payment,
        feeStatus,
        feeAlert,
        feeMonthsLeft,
        // 合并账单：组名 + 组内是否为首位成员（负责汇总提醒），无组时为空
        billGroupId: mc.billGroupId || "",
        billGroupName: groupNameOf(mc.billGroupId),
        recent: recs.amount.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 5),
        monthSpend,
        yearSpend,
        totalSpend,
        monthCount,
        yearCount,
        totalCount: recs.amount.length,
        monthProgress: mc.monthlySpendTarget > 0 ? Math.min(100, Math.round(monthSpend / mc.monthlySpendTarget * 100)) : 0,
        feeDays: days,
        feeDaysColor: feeDaysColor(days, ws.needsPayment),
        nextFeeDate: nextFeeDateStr,
        waiver: ws
      };
    }
    __name(computeMyCard, "computeMyCard");
    function computeStats(now, idx, computed) {
      now = now || NOW();
      idx = idx || buildIndexes();
      const myCards = getMyCards();
      const banks = [...new Set(myCards.map((m) => m.bank))];
      const bankMax = {};
      for (const m of myCards) {
        const lim = Number(m.creditLimit) || 0;
        if (!(m.bank in bankMax) || lim > bankMax[m.bank]) bankMax[m.bank] = lim;
      }
      const monthStart = U.toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      const yearStart = U.toDateStr(new Date(now.getFullYear(), 0, 1));
      let monthSpend = 0;
      let yearSpend = 0;
      for (const r of getConsumptions()) {
        if (r.type !== "amount") continue;
        const a = Number(r.amount) || 0;
        if (r.date >= monthStart) monthSpend += a;
        if (r.date >= yearStart) yearSpend += a;
      }
      const feeExpiring = (computed || myCards.map((m) => computeMyCard(m, now, idx))).filter((m) => m.waiver.needsPayment && m.feeDays < 30).sort((a, b) => a.feeDays - b.feeDays).map((m) => ({ id: m.id, name: m.alias || m.name, bank: m.bank, feeDays: m.feeDays, annualFee: m.annualFee }));
      return {
        totalCards: myCards.length,
        totalBanks: banks.length,
        maxCreditSum: Object.values(bankMax).reduce((s, v) => s + v, 0),
        monthSpend,
        yearSpend,
        feeExpiring
      };
    }
    __name(computeStats, "computeStats");
    function benefitRecords(idx, myCardId, benefitIdx, bid) {
      const m = idx.benByCard.get(myCardId);
      if (!m) return [];
      const out = [];
      if (bid) out.push(...m.get("bid:" + bid) || []);
      for (const r of m.get("idx:" + benefitIdx) || []) if (!r.bid) out.push(r);
      return out;
    }
    __name(benefitRecords, "benefitRecords");
    function benefitUsed(mc, idx, now, index, bid) {
      now = now || NOW();
      const b = (mc.benefits || [])[idx];
      if (!b) return { used: 0, total: 0, exhausted: false, cycle: "\u81EA\u7136\u6708", missing: true };
      const start = U.cycleStart(b.resetCycle, mc.feeMonth, mc.feeDay, now);
      const startStr = U.toDateStr(start);
      const useBid = bid !== void 0 ? bid : b.id;
      const index2 = index || buildIndexes();
      const recs = benefitRecords(index2, mc.id, idx, useBid).filter((r) => r.date >= startStr);
      const used = recs.filter((r) => r.type === "usage").length + recs.filter((r) => r.type === "count").reduce((s, r) => s + (Number(r.count) || 0), 0);
      const total = Number(b.total) || 0;
      const unlimited = total < 0;
      const expired = !!(b.validUntil && b.validUntil < U.todayStr());
      return {
        used,
        total,
        unlimited,
        expired,
        remaining: unlimited ? null : Math.max(0, total - used),
        exhausted: !unlimited && !expired && used >= total,
        cycle: b.resetCycle,
        cycleStart: startStr
      };
    }
    __name(benefitUsed, "benefitUsed");
    function benefitHistory(mc, idx, bid, index) {
      const b = (mc.benefits || [])[idx];
      if (!b) return [];
      const idx2 = index || buildIndexes();
      const recs = benefitRecords(idx2, mc.id, idx, bid !== void 0 ? bid : b.id);
      const groups = /* @__PURE__ */ new Map();
      for (const r of recs) {
        const key = U.cycleKeyOf(b.resetCycle, mc.feeMonth, mc.feeDay, r.date);
        if (!groups.has(key)) groups.set(key, { key, used: 0, records: [] });
        const g = groups.get(key);
        if (r.type === "usage") {
          g.used += 1;
          g.records.push({ date: r.date, note: r.note || "", count: 1 });
        } else {
          g.used += Number(r.count) || 0;
          g.records.push({ date: r.date, note: (r.note || "") + (r.note ? "\uFF0C" : "") + "\u8865\u5F55 " + (Number(r.count) || 0) + " \u6B21", count: Number(r.count) || 0 });
        }
      }
      return [...groups.values()].sort((a, b2) => a.key < b2.key ? 1 : -1);
    }
    __name(benefitHistory, "benefitHistory");
    function json(obj, status, headers) {
      return { status: status || 200, body: obj, headers: headers || void 0 };
    }
    __name(json, "json");
    function err(msg, status) {
      return json({ error: msg }, status || 400);
    }
    __name(err, "err");
    function matchRoute(method, pathname) {
      const routes2 = [
        ["GET", /^\/api\/health$/],
        ["GET", /^\/api\/meta$/],
        ["GET", /^\/api\/settings$/],
        ["PUT", /^\/api\/settings$/],
        ["GET", /^\/api\/stats$/],
        ["GET", /^\/api\/cards$/],
        ["POST", /^\/api\/cards$/],
        ["POST", /^\/api\/cards\/import$/],
        ["GET", /^\/api\/cards\/export$/],
        ["PUT", /^\/api\/cards\/([^/]+)$/],
        ["DELETE", /^\/api\/cards\/([^/]+)$/],
        ["GET", /^\/api\/mycards\/export$/],
        ["POST", /^\/api\/mycards\/import$/],
        ["GET", /^\/api\/mycards\/template\.csv$/],
        ["POST", /^\/api\/mycards\/import-csv$/],
        ["GET", /^\/api\/mycards$/],
        ["POST", /^\/api\/mycards$/],
        ["PUT", /^\/api\/mycards\/([^/]+)$/],
        ["DELETE", /^\/api\/mycards\/([^/]+)$/],
        ["GET", /^\/api\/mycards\/([^/]+)\/consumptions$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/consumptions$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/consumptions\/count$/],
        ["DELETE", /^\/api\/mycards\/([^/]+)\/consumptions\/([^/]+)$/],
        ["GET", /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/history$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/usage$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/count$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/points$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/asset$/],
        ["GET", /^\/api\/notify\/config$/],
        ["PUT", /^\/api\/notify\/config$/],
        ["POST", /^\/api\/notify\/test$/],
        ["POST", /^\/api\/notify\/check$/],
        ["GET", /^\/api\/notify\/history$/],
        ["GET", /^\/api\/calendar\.ics$/],
        ["GET", /^\/api\/bills$/],
        ["POST", /^\/api\/bills$/],
        ["PUT", /^\/api\/bills\/([^/]+)$/],
        ["DELETE", /^\/api\/bills\/([^/]+)$/],
        ["GET", /^\/api\/billgroups$/],
        ["POST", /^\/api\/billgroups$/],
        ["PUT", /^\/api\/billgroups\/([^/]+)$/],
        ["DELETE", /^\/api\/billgroups\/([^/]+)$/],
        ["POST", /^\/api\/mycards\/([^/]+)\/bills\/generate$/],
        ["GET", /^\/api\/assets\/meta$/],
        ["GET", /^\/api\/assets\/stats$/],
        ["GET", /^\/api\/assets\/feed$/],
        ["GET", /^\/api\/assets\/expiring$/],
        ["GET", /^\/api\/memberships$/],
        ["POST", /^\/api\/memberships$/],
        ["PUT", /^\/api\/memberships\/([^/]+)$/],
        ["DELETE", /^\/api\/memberships\/([^/]+)$/],
        ["POST", /^\/api\/memberships\/([^/]+)\/txn$/],
        ["GET", /^\/api\/vouchers$/],
        ["POST", /^\/api\/vouchers$/],
        ["PUT", /^\/api\/vouchers\/([^/]+)$/],
        ["DELETE", /^\/api\/vouchers\/([^/]+)$/],
        ["POST", /^\/api\/vouchers\/([^/]+)\/use$/],
        ["POST", /^\/api\/vouchers\/([^/]+)\/topup$/],
        ["GET", /^\/api\/voucherbrands$/],
        ["POST", /^\/api\/voucherbrands$/],
        ["PUT", /^\/api\/voucherbrands\/([^/]+)$/],
        ["DELETE", /^\/api\/voucherbrands\/([^/]+)$/],
        ["GET", /^\/api\/knowledge$/],
        ["POST", /^\/api\/knowledge$/],
        ["PUT", /^\/api\/knowledge\/([^/]+)$/],
        ["DELETE", /^\/api\/knowledge\/([^/]+)$/],
        ["POST", /^\/api\/knowledge\/([^/]+)\/use$/],
        ["POST", /^\/api\/knowledge\/([^/]+)\/history$/],
        ["POST", /^\/api\/shutdown$/]
      ];
      for (const [m, re] of routes2) {
        if (m !== method) continue;
        const match = pathname.match(re);
        if (match) return match;
      }
      return null;
    }
    __name(matchRoute, "matchRoute");
    async function handle(method, pathname, url, body, req) {
      const match = matchRoute(method, pathname);
      if (!match) return void 0;
      const now = NOW();
      if (pathname === "/api/health") return json({ ok: true, version: APP_VERSION, time: now.toISOString() });
      if (pathname === "/api/meta") return json(Object.assign({ channels: CHANNELS, categories: CATEGORIES, waiverTypes: WAIVER_TYPES, resetCycles: RESET_CYCLES, benefitTypes: BENEFIT_TYPES, csvHeader: CSV_HEADER, mycardsCsvHeader: MYCARD_CSV_HEADER, maxImportCards: MAX_IMPORT_CARDS, assets: getAssetMeta() }, getAssetMeta()));
      if (pathname === "/api/shutdown") {
        if (req && !require_auth_shim().sameOrigin(req)) {
          return err("\u62D2\u7EDD\u8DE8\u7AD9\u8BF7\u6C42", 403);
        }
        return { shutdown: true };
      }
      if (pathname === "/api/settings" && method === "GET") return json(store.readObject("settings", {}));
      if (pathname === "/api/settings" && method === "PUT") {
        const cur = store.readObject("settings", {});
        const patch = body || {};
        const allowed = ["theme", "bankOrder", "banksCollapsed", "cardBanksCollapsed"];
        for (const k of allowed) if (k in patch) cur[k] = patch[k];
        store.write("settings", cur);
        return json(cur);
      }
      if (pathname === "/api/stats") return json(computeStats(now, null, null));
      if (pathname === "/api/cards" && method === "GET") {
        return json(getCards());
      }
      if (pathname === "/api/cards" && method === "POST") {
        const c = normalizeCard(body || {}, null);
        if (!c.bank || !c.name) return err("\u94F6\u884C\u548C\u5361\u7247\u540D\u79F0\u5FC5\u586B");
        const cards = getCards();
        if (cards.some((x) => cardKey(x) === cardKey(c))) return err("\u5DF2\u5B58\u5728\u76F8\u540C\u300C\u94F6\u884C + \u5361\u7247\u540D\u79F0 + \u5361\u7EC4\u7EC7 + \u5361\u7B49\u7EA7\u300D\u7684\u5361\u79CD\uFF0C\u8BF7\u4FEE\u6539\u5361\u7247\u540D\u79F0");
        cards.push(c);
        store.write("cards", cards);
        return json(c, 201);
      }
      if (pathname === "/api/cards/import" && method === "POST") {
        const text = typeof body === "string" ? body : body && body.csv || "";
        if (!text.trim()) return err("CSV \u5185\u5BB9\u4E3A\u7A7A");
        const rows = U.parseCSV(text);
        if (rows.length < 2) return err("CSV \u53EA\u6709\u8868\u5934\u6216\u65E0\u6570\u636E\u884C");
        const cards = getCards();
        const keys = new Set(cards.map(cardKey));
        const fileKeys = /* @__PURE__ */ new Set();
        let added = 0;
        const skipped = [];
        const errors = [];
        rows.slice(1).forEach((row, i) => {
          const lineNo = i + 2;
          const raw = {};
          CSV_HEADER.forEach((h, ci) => {
            raw[CARD_FIELDS[ci]] = (row[ci] == null ? "" : String(row[ci])).trim();
          });
          if (!raw.bank || !raw.name) {
            errors.push({ line: lineNo, msg: "\u94F6\u884C\u6216\u5361\u7247\u540D\u79F0\u4E3A\u7A7A" });
            return;
          }
          const c = normalizeCard(raw, null);
          const k = cardKey(c);
          if (keys.has(k) || fileKeys.has(k)) {
            skipped.push({ line: lineNo, name: raw.name, msg: "\u5DF2\u5B58\u5728\uFF0C\u81EA\u52A8\u8DF3\u8FC7" });
            return;
          }
          fileKeys.add(k);
          keys.add(k);
          cards.push(c);
          added++;
        });
        store.write("cards", cards);
        return json({ added, skipped, errors, total: cards.length });
      }
      if (pathname === "/api/cards/export" && method === "GET") {
        const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
        const myCards = getMyCards();
        const selected = ids.length ? myCards.filter((m) => ids.includes(m.id)) : myCards;
        const seen = /* @__PURE__ */ new Set();
        const rows = [CSV_HEADER];
        for (const m of selected) {
          if (seen.has(m.cardId)) continue;
          seen.add(m.cardId);
          const c = getCards().find((x) => x.id === m.cardId) || {};
          rows.push([c.bank || m.bank, c.name || m.name, c.level || "", c.org || "", c.annualFee || 0, c.waiverType || "", c.waiverCondition || "", c.waiverPolicy || "", c.startCredit || 0, (c.benefits || []).join("|"), c.applyCondition || "", c.note || ""]);
        }
        return { csv: U.toCSV(rows) };
      }
      const cardMatch = pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (cardMatch && method === "PUT") {
        const cards = getCards();
        const idx = cards.findIndex((c2) => c2.id === cardMatch[1]);
        if (idx < 0) return err("\u5361\u79CD\u4E0D\u5B58\u5728", 404);
        const merged = { ...cards[idx], ...body || {} };
        const c = normalizeCard(merged, cards[idx].id);
        if (cards.some((x, i) => i !== idx && cardKey(x) === cardKey(c))) return err("\u5DF2\u5B58\u5728\u76F8\u540C\u300C\u94F6\u884C + \u5361\u7247\u540D\u79F0 + \u5361\u7EC4\u7EC7 + \u5361\u7B49\u7EA7\u300D\u7684\u5361\u79CD");
        cards[idx] = c;
        store.write("cards", cards);
        syncMyCardSnapshots();
        return json(c);
      }
      if (cardMatch && method === "DELETE") {
        let cards = getCards();
        if (!cards.some((c) => c.id === cardMatch[1])) return err("\u5361\u79CD\u4E0D\u5B58\u5728", 404);
        cards = cards.filter((c) => c.id !== cardMatch[1]);
        store.write("cards", cards);
        return json({ ok: true });
      }
      if (pathname === "/api/mycards/export" && method === "GET") {
        const myCards = getMyCards();
        const myIds = new Set(myCards.map((m) => m.id));
        const cards = getCards();
        const usedCardIds = new Set(myCards.map((m) => m.cardId));
        const payload = {
          schema: "guanka-backup",
          version: 2,
          // v2：新增 memberships / vouchers / voucherBrands / knowledge 四类扩展资产
          exportedAt: now.toISOString(),
          cardTypes: cards.filter((c) => usedCardIds.has(c.id)),
          myCards,
          consumptions: getConsumptions().filter((r) => myIds.has(r.myCardId)),
          benefitRecords: getBenefits().filter((r) => myIds.has(r.myCardId)),
          billGroups: getBillGroups(),
          bills: getBills().filter((b) => myIds.has(b.myCardId)),
          memberships: getMemberships(),
          vouchers: getVouchers(),
          voucherBrands: getVoucherBrands(),
          knowledge: getKnowledge()
        };
        const filename = "guanka-backup-" + U.todayStr() + ".json";
        const payloadJson = JSON.stringify(payload);
        return json(payloadJson, 200, {
          "Content-Type": "application/json; charset=utf-8",
          // send() 对字符串默认 text/plain，需显式覆盖
          "Content-Disposition": 'attachment; filename="' + filename + '"',
          "Cache-Control": "no-store"
        });
      }
      if (pathname === "/api/mycards/import" && method === "POST") {
        const b = body && typeof body === "object" ? body : {};
        const data = b.data && typeof b.data === "object" ? b.data : b;
        if (data.schema !== "guanka-backup") return err("\u4E0D\u662F\u6709\u6548\u7684\u7BA1\u5361\u5907\u4EFD\u6587\u4EF6\uFF08\u7F3A\u5C11 schema \u6807\u8BC6\uFF09");
        if (!Array.isArray(data.myCards)) return err("\u5907\u4EFD\u6587\u4EF6\u7F3A\u5C11 myCards \u6570\u636E");
        if (data.myCards.length > MAX_IMPORT_CARDS) return err("\u5907\u4EFD\u5305\u542B " + data.myCards.length + " \u5F20\u6301\u5361\uFF0C\u8D85\u51FA\u5355\u6B21\u5BFC\u5165\u4E0A\u9650 " + MAX_IMPORT_CARDS);
        for (const k of ["cardTypes", "consumptions", "benefitRecords", "billGroups", "bills", "memberships", "vouchers", "voucherBrands", "knowledge"]) {
          if (Array.isArray(data[k]) && data[k].length > MAX_IMPORT_RECORDS) {
            return err("\u5907\u4EFD " + k + " \u542B " + data[k].length + " \u6761\u8BB0\u5F55\uFF0C\u8D85\u51FA\u5355\u6B21\u5BFC\u5165\u4E0A\u9650 " + MAX_IMPORT_RECORDS);
          }
        }
        const mode = b.mode === "replace" ? "replace" : "merge";
        const cards = getCards();
        const cardByKey = new Map(cards.map((c) => [cardKey(c), c]));
        const cardById = new Map(cards.map((c) => [c.id, c]));
        let cardTypesAdded = 0;
        const importedCardTypes = [];
        for (const c of Array.isArray(data.cardTypes) ? data.cardTypes : []) {
          const key = cardKey(c || {});
          if (!key.split("|").some(Boolean)) continue;
          const exist = cardByKey.get(key);
          if (exist) {
            importedCardTypes.push({ srcId: String(c.id || ""), dstId: exist.id });
            continue;
          }
          const created = normalizeCard(c, null);
          cards.push(created);
          cardByKey.set(key, created);
          cardById.set(created.id, created);
          importedCardTypes.push({ srcId: String(c.id || ""), dstId: created.id });
          cardTypesAdded++;
        }
        const cardIdMap = /* @__PURE__ */ new Map();
        for (const m of importedCardTypes) {
          if (m.srcId && !cardIdMap.has(m.srcId)) cardIdMap.set(m.srcId, m.dstId);
        }
        const existingMyIds = new Set(mode === "merge" ? getMyCards().map((m) => m.id) : []);
        const existingConsIds = new Set(mode === "merge" ? getConsumptions().map((r) => r.id) : []);
        const existingBenIds = new Set(mode === "merge" ? getBenefits().map((r) => r.id) : []);
        const nowDate = now;
        const safeMyCards = [];
        const myIdMap = /* @__PURE__ */ new Map();
        const srcGroupById = /* @__PURE__ */ new Map();
        let dedupedCards = 0;
        let skippedNoId = 0;
        for (const m of data.myCards) {
          if (!m || typeof m !== "object") continue;
          const srcId = String(m.cardId || "");
          const dstCardId = cardIdMap.get(srcId) || cardById.get(srcId);
          const card = dstCardId ? cardById.get(dstCardId) : null;
          if (!card) {
            skippedNoId++;
            continue;
          }
          if (mode === "merge" && typeof m.id === "string" && m.id && existingMyIds.has(m.id)) {
            dedupedCards++;
            continue;
          }
          const fee = U.clampFeeDate(m.feeMonth, m.feeDay);
          const repayMode = m.repayMode === "afterBill" ? "afterBill" : "fixed";
          const newId = typeof m.id === "string" && m.id ? m.id : U.uid();
          existingMyIds.add(newId);
          myIdMap.set(String(m.id || newId), newId);
          srcGroupById.set(newId, String(m.billGroupId || ""));
          const mc = {
            id: newId,
            cardId: card.id,
            bank: card.bank,
            name: card.name,
            org: card.org,
            level: card.level,
            annualFee: card.annualFee,
            waiverType: card.waiverType,
            waiverCondition: card.waiverCondition,
            waiverPolicy: card.waiverPolicy,
            alias: String(m.alias || "").trim(),
            creditLimit: nonNeg(m.creditLimit, card.startCredit),
            billingDay: clampDay(m.billingDay, 1),
            repaymentDay: repayMode === "fixed" ? Math.min(31, Math.max(1, clampDay(m.repaymentDay, 20))) : clampDay(m.repaymentDay, 20),
            repayMode,
            repayValue: m.repayValue != null ? Math.max(0, Math.min(365, Math.round(Number(m.repayValue) || 0))) : clampDay(m.repaymentDay, 20),
            graceDays: m.graceDays != null ? Math.max(0, Math.min(30, Math.round(Number(m.graceDays) || 0))) : 3,
            waivedYear: Math.max(0, Math.round(Number(m.waivedYear) || 0)),
            countPeriodYear: Math.max(0, Math.round(Number(m.countPeriodYear) || 0)),
            maxInterestDays: Math.max(0, Math.min(120, Math.round(Number(m.maxInterestDays) || 0))),
            feeMonth: fee.m,
            feeDay: fee.d,
            last4: String(m.last4 || "").replace(/\D/g, "").slice(0, 4),
            monthlySpendTarget: nonNeg(m.monthlySpendTarget, 0),
            // 权益沿用备份里的稳定 id（消费/权益记录按 bid 归属），缺失时补新 id
            benefits: normalizeBenefits(Array.isArray(m.benefits) ? m.benefits : [], card.benefits),
            pointsDeducted: !!m.pointsDeducted,
            pointsDeductDate: m.pointsDeducted && U.parseDateStr(m.pointsDeductDate) ? String(m.pointsDeductDate) : m.pointsDeducted ? U.todayStr() : null,
            assetWaived: !!m.assetWaived,
            assetWaivedDate: m.assetWaived && U.parseDateStr(m.assetWaivedDate) ? String(m.assetWaivedDate) : m.assetWaived ? U.todayStr() : null,
            billGroupId: "",
            createdAt: U.parseDateStr(String(m.createdAt || "").slice(0, 10)) ? String(m.createdAt) : nowDate.toISOString()
          };
          safeMyCards.push(mc);
        }
        const hasAssetPayload = ["memberships", "vouchers", "voucherBrands", "knowledge"].some((k) => Array.isArray(data[k]) && data[k].length > 0);
        if (!safeMyCards.length && !dedupedCards && !hasAssetPayload) {
          return err("\u5907\u4EFD\u4E2D\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u6301\u5361\uFF08\u5361\u79CD\u5339\u914D\u5168\u90E8\u5931\u8D25\uFF09");
        }
        const groups = mode === "merge" ? getBillGroups() : [];
        const groupIdMap = /* @__PURE__ */ new Map();
        for (const g of Array.isArray(data.billGroups) ? data.billGroups : []) {
          if (!g || !g.name) continue;
          const exist = groups.find((x) => x.name === g.name);
          if (exist) {
            groupIdMap.set(String(g.id), exist.id);
            continue;
          }
          const newId = typeof g.id === "string" && g.id && !groups.some((x) => x.id === g.id) ? g.id : U.uid();
          groups.push({ id: newId, name: g.name, createdAt: U.parseDateStr(String(g.createdAt || "").slice(0, 10)) ? String(g.createdAt) : nowDate.toISOString() });
          groupIdMap.set(String(g.id), newId);
        }
        const groupMembers = /* @__PURE__ */ new Map();
        for (const mc of safeMyCards) {
          const gRaw = srcGroupById.get(mc.id) || "";
          if (!gRaw || !groupIdMap.has(gRaw)) continue;
          const gid = groupIdMap.get(gRaw);
          mc.billGroupId = gid;
          if (!groupMembers.has(gid)) groupMembers.set(gid, []);
          groupMembers.get(gid).push(mc);
        }
        const groupErrs = [];
        for (const members of groupMembers.values()) {
          if (members.length < 2) {
            for (const m of members) m.billGroupId = "";
            continue;
          }
          for (let i = 1; i < members.length; i++) {
            if (!sameRepaySchedule(members[0], members[i], now)) {
              groupErrs.push("\u300C" + (members[i].alias || members[i].name) + "\u300D\u4E0E\u300C" + (members[0].alias || members[0].name) + "\u300D\u8FD8\u6B3E\u65E5\u4E0D\u4E00\u81F4\uFF0C\u5DF2\u79FB\u51FA\u8D26\u5355\u7EC4");
              members[i].billGroupId = "";
            }
          }
        }
        const aliveGroups = new Set(safeMyCards.map((m) => m.billGroupId).filter(Boolean));
        const finalGroups = mode === "merge" ? groups.filter((g) => {
          if (!aliveGroups.has(g.id)) return false;
          const oldMembers = getMyCards().filter((m) => m.billGroupId === g.id && !safeMyCards.some((x) => x.id === m.id));
          const newMembers = safeMyCards.filter((m) => m.billGroupId === g.id);
          return oldMembers.length + newMembers.length >= 2;
        }) : groups.filter((g) => aliveGroups.has(g.id));
        const safeCons = [];
        for (const r of Array.isArray(data.consumptions) ? data.consumptions : []) {
          if (!r || typeof r !== "object") continue;
          if (mode === "merge" && typeof r.id === "string" && r.id && existingConsIds.has(r.id)) continue;
          const newMyId = myIdMap.get(String(r.myCardId || ""));
          if (!newMyId) continue;
          const newId = typeof r.id === "string" && r.id ? r.id : U.uid();
          existingConsIds.add(newId);
          const amount = Number(r.amount);
          if (r.type !== "count" && (!isFinite(amount) || amount <= 0)) continue;
          safeCons.push({
            id: newId,
            myCardId: newMyId,
            type: r.type === "count" ? "count" : "amount",
            date: U.parseDateStr(r.date) ? String(r.date) : U.todayStr(),
            amount: isFinite(amount) ? Math.max(0, Math.min(MAX_MONEY, Math.round(amount * 100) / 100)) : 0,
            count: validCount(r.count) || 0,
            channel: CHANNELS.includes(r.channel) ? r.channel : CHANNELS[0],
            category: CATEGORIES.includes(r.category) ? r.category : "\u5176\u4ED6",
            note: String(r.note || "").trim(),
            createdAt: U.parseDateStr(String(r.createdAt || "").slice(0, 10)) ? String(r.createdAt) : nowDate.toISOString()
          });
        }
        const safeBens = [];
        for (const r of Array.isArray(data.benefitRecords) ? data.benefitRecords : []) {
          if (!r || typeof r !== "object") continue;
          if (mode === "merge" && typeof r.id === "string" && r.id && existingBenIds.has(r.id)) continue;
          const newMyId = myIdMap.get(String(r.myCardId || ""));
          if (!newMyId) continue;
          const mc = safeMyCards.find((x) => x.id === newMyId);
          const bidOk = r.bid && mc && (mc.benefits || []).some((x) => x.id === r.bid);
          if (!bidOk) continue;
          const newId = typeof r.id === "string" && r.id ? r.id : U.uid();
          existingBenIds.add(newId);
          safeBens.push({
            id: newId,
            myCardId: newMyId,
            idx: Math.max(0, Math.round(Number(r.idx) || 0)),
            bid: String(r.bid),
            type: r.type === "count" ? "count" : "usage",
            date: U.parseDateStr(r.date) ? String(r.date) : U.todayStr(),
            count: validCount(r.count) || 0,
            note: String(r.note || "").trim(),
            createdAt: U.parseDateStr(String(r.createdAt || "").slice(0, 10)) ? String(r.createdAt) : nowDate.toISOString()
          });
        }
        const existingBillKeys = mode === "merge" ? new Set(getBills().map((x) => x.myCardId + "|" + x.month)) : /* @__PURE__ */ new Set();
        const existingBillIds = new Set(mode === "merge" ? getBills().map((x) => x.id) : []);
        const safeBills = [];
        for (const r of Array.isArray(data.bills) ? data.bills : []) {
          if (!r || typeof r !== "object") continue;
          const newMyId = myIdMap.get(String(r.myCardId || ""));
          if (!newMyId) continue;
          if (!/^\d{4}-\d{2}$/.test(String(r.month || ""))) continue;
          const key = newMyId + "|" + r.month;
          if (existingBillKeys.has(key)) continue;
          existingBillKeys.add(key);
          const amount = Number(r.amount);
          const newId = typeof r.id === "string" && r.id && !existingBillIds.has(r.id) ? r.id : U.uid();
          existingBillIds.add(newId);
          safeBills.push({
            id: newId,
            myCardId: newMyId,
            month: String(r.month),
            amount: isFinite(amount) ? Math.max(0, Math.min(MAX_MONEY, Math.round(amount * 100) / 100)) : 0,
            dueDate: U.parseDateStr(r.dueDate) ? String(r.dueDate) : "",
            paid: r.paid === "\u5DF2\u8FD8" ? "\u5DF2\u8FD8" : "\u672A\u8FD8",
            paidDate: U.parseDateStr(r.paidDate) ? String(r.paidDate) : "",
            note: String(r.note || "").trim(),
            createdAt: U.parseDateStr(String(r.createdAt || "").slice(0, 10)) ? String(r.createdAt) : nowDate.toISOString()
          });
        }
        const existingMemIds = new Set(mode === "merge" ? getMemberships().map((x) => x.id) : []);
        const existingVouIds = new Set(mode === "merge" ? getVouchers().map((x) => x.id) : []);
        const existingKgIds = new Set(mode === "merge" ? getKnowledge().map((x) => x.id) : []);
        const existingBrands = mode === "merge" ? getVoucherBrands() : [];
        const brandByName = new Map(existingBrands.map((x) => [x.name, x]));
        const safeMemberships = [];
        for (const m of Array.isArray(data.memberships) ? data.memberships : []) {
          if (!m || typeof m !== "object") continue;
          if (mode === "merge" && typeof m.id === "string" && m.id && existingMemIds.has(m.id)) continue;
          const rec = A.normalizeMembership(m, null);
          if (!rec.name) continue;
          existingMemIds.add(rec.id);
          safeMemberships.push(rec);
        }
        const safeVouchers = [];
        for (const v of Array.isArray(data.vouchers) ? data.vouchers : []) {
          if (!v || typeof v !== "object") continue;
          if (mode === "merge" && typeof v.id === "string" && v.id && existingVouIds.has(v.id)) continue;
          const rec = A.normalizeVoucher(v, null);
          if (!rec.name) continue;
          existingVouIds.add(rec.id);
          safeVouchers.push(rec);
        }
        const safeBrands = [];
        for (const b2 of Array.isArray(data.voucherBrands) ? data.voucherBrands : []) {
          if (!b2 || typeof b2 !== "object") continue;
          const name = String(b2.name || "").trim();
          if (!name) continue;
          if (brandByName.has(name)) continue;
          const rec = A.normalizeBrand(b2, null);
          brandByName.set(rec.name, rec);
          safeBrands.push(rec);
        }
        const safeKnowledge = [];
        for (const k of Array.isArray(data.knowledge) ? data.knowledge : []) {
          if (!k || typeof k !== "object") continue;
          if (mode === "merge" && typeof k.id === "string" && k.id && existingKgIds.has(k.id)) continue;
          const rec = A.normalizeKnowledge(k, null);
          if (!rec.title) continue;
          existingKgIds.add(rec.id);
          safeKnowledge.push(rec);
        }
        if (mode === "replace") {
          store.write("mycards", safeMyCards);
          store.write("consumptions", safeCons);
          store.write("benefits", safeBens);
          store.write("bills", safeBills);
          store.write("billGroups", finalGroups);
          store.write("memberships", safeMemberships);
          store.write("vouchers", safeVouchers);
          store.write("voucherBrands", safeBrands);
          store.write("knowledge", safeKnowledge);
        } else {
          const myCards = getMyCards();
          const have = new Set(myCards.map((m) => m.id));
          for (const mc of safeMyCards) if (!have.has(mc.id)) myCards.push(mc);
          store.write("mycards", myCards);
          const cons = getConsumptions().concat(safeCons);
          store.write("consumptions", cons);
          const bens = getBenefits().concat(safeBens);
          store.write("benefits", bens);
          const bills = getBills().concat(safeBills);
          store.write("bills", bills);
          store.write("billGroups", finalGroups);
          store.write("memberships", getMemberships().concat(safeMemberships));
          store.write("vouchers", getVouchers().concat(safeVouchers));
          store.write("voucherBrands", getVoucherBrands().concat(safeBrands));
          store.write("knowledge", getKnowledge().concat(safeKnowledge));
        }
        store.write("cards", cards);
        cleanBillGroups();
        return json({
          ok: true,
          mode,
          importedCards: safeMyCards.length,
          // skippedCards = 既没导入也没幂等跳过的部分（卡种匹配失败/垃圾行），
          // 不含 dedupedCards——否则重复导入时前端会把「已存在跳过」误标为「卡种匹配失败」
          skippedCards: (Array.isArray(data.myCards) ? data.myCards.length : 0) - safeMyCards.length - dedupedCards - skippedNoId,
          dedupedCards,
          cardTypesAdded,
          consumptions: safeCons.length,
          benefitRecords: safeBens.length,
          bills: safeBills.length,
          billGroups: finalGroups.length,
          memberships: safeMemberships.length,
          vouchers: safeVouchers.length,
          voucherBrands: safeBrands.length,
          knowledge: safeKnowledge.length,
          groupWarnings: groupErrs
        }, 200);
      }
      if (pathname === "/api/mycards/template.csv" && method === "GET") {
        const rows = [MYCARD_CSV_HEADER, ...MYCARD_CSV_SAMPLES];
        const csv = U.toCSV(rows);
        return {
          csv,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="mycards-template.csv"',
            "Cache-Control": "no-store"
          }
        };
      }
      if (pathname === "/api/mycards/import-csv" && method === "POST") {
        const text = typeof body === "string" ? body : body && body.csv || "";
        if (!text.trim()) return err("CSV \u5185\u5BB9\u4E3A\u7A7A");
        const rows = U.parseCSV(text);
        if (rows.length < 2) return err("CSV \u53EA\u6709\u8868\u5934\u6216\u65E0\u6570\u636E\u884C");
        if (rows.length - 1 > MAX_IMPORT_CARDS) return err("CSV \u542B " + (rows.length - 1) + " \u884C\u6301\u5361\uFF0C\u8D85\u51FA\u5355\u6B21\u5BFC\u5165\u4E0A\u9650 " + MAX_IMPORT_CARDS);
        const cards = getCards();
        const cardByKey = new Map(cards.map((c) => [cardKey(c), c]));
        const myCards = getMyCards();
        const added = [];
        const skipped = [];
        const errors = [];
        let cardTypesAdded = 0;
        rows.slice(1).forEach((row, i) => {
          const lineNo = i + 2;
          const raw = {};
          MYCARD_CSV_HEADER.forEach((h, ci) => {
            raw[MYCARD_FIELDS[ci]] = (row[ci] == null ? "" : String(row[ci])).trim();
          });
          if (!raw.bank || !raw.name) {
            errors.push({ line: lineNo, msg: "\u94F6\u884C\u6216\u5361\u7247\u540D\u79F0\u4E3A\u7A7A" });
            return;
          }
          const wantKey = [raw.bank, raw.name, raw.org, raw.level].join("|");
          let card = cardByKey.get(wantKey);
          if (!card) {
            card = normalizeCard({ bank: raw.bank, name: raw.name, org: raw.org, level: raw.level }, null);
            cards.push(card);
            cardByKey.set(wantKey, card);
            cardTypesAdded++;
          }
          const last4 = raw.last4.replace(/\D/g, "").slice(0, 4);
          if (myCards.some((m) => m.cardId === card.id && String(m.last4 || "") === last4)) {
            skipped.push({ line: lineNo, name: raw.name, msg: last4 ? "\u540C\u5361\u540C\u540E\u56DB\u4F4D\u5DF2\u5B58\u5728" : "\u540C\u5361\u5DF2\u5B58\u5728\uFF08\u672A\u586B\u540E\u56DB\u4F4D\uFF09" });
            return;
          }
          const fee = U.clampFeeDate(raw.feeMonth, raw.feeDay);
          const repayMode = /账单日后/.test(raw.repayMode) ? "afterBill" : "fixed";
          const repayValue = clampDay(raw.repayValue, 20);
          const mc = {
            id: U.uid(),
            cardId: card.id,
            bank: card.bank,
            name: card.name,
            org: card.org,
            level: card.level,
            annualFee: card.annualFee,
            waiverType: card.waiverType,
            waiverCondition: card.waiverCondition,
            waiverPolicy: card.waiverPolicy,
            alias: raw.alias,
            creditLimit: nonNeg(U.parseAmount(raw.creditLimit), card.startCredit),
            billingDay: clampDay(raw.billingDay, 1),
            repaymentDay: repayMode === "fixed" ? Math.min(31, Math.max(1, repayValue || 20)) : clampDay(raw.repayValue, 20),
            repayMode,
            repayValue,
            graceDays: Math.max(0, Math.min(30, Math.round(Number(raw.graceDays) || 0))),
            waivedYear: Math.max(0, Math.round(Number(raw.waivedYear) || 0)),
            countPeriodYear: Math.max(0, Math.round(Number(raw.countPeriodYear) || 0)),
            maxInterestDays: Math.max(0, Math.min(120, Math.round(Number(raw.maxInterestDays) || 0))),
            feeMonth: fee.m,
            feeDay: fee.d,
            last4,
            monthlySpendTarget: nonNeg(U.parseAmount(raw.monthlySpendTarget), 0),
            benefits: parseBenefitSpec(raw.benefits, card.benefits),
            pointsDeducted: false,
            pointsDeductDate: null,
            assetWaived: false,
            assetWaivedDate: null,
            billGroupId: "",
            createdAt: now.toISOString()
          };
          myCards.push(mc);
          added.push({ line: lineNo, name: card.name, bank: card.bank, id: mc.id });
        });
        if (added.length && cardTypesAdded) store.write("cards", cards);
        if (added.length) store.write("mycards", myCards);
        return json({ added: added.length, skipped, errors, cardTypesAdded, total: myCards.length });
      }
      if (pathname === "/api/mycards" && method === "GET") {
        const idx = buildIndexes();
        const data = getMyCards().map((m) => computeMyCard(m, now, idx));
        return json({
          data,
          stats: computeStats(now, idx, data),
          banks: [...new Set(data.map((m) => m.bank))],
          billGroups: getBillGroups()
        });
      }
      if (pathname === "/api/mycards" && method === "POST") {
        const b = body || {};
        if (!b.cardId) return err("\u7F3A\u5C11 cardId");
        const card = getCards().find((c) => c.id === b.cardId);
        if (!card) return err("\u5361\u79CD\u4E0D\u5B58\u5728", 404);
        const fee = U.clampFeeDate(b.feeMonth, b.feeDay);
        const repayMode = b.repayMode === "afterBill" ? "afterBill" : "fixed";
        const repayValue = b.repayValue != null ? Math.max(0, Math.min(365, Math.round(Number(b.repayValue) || 0))) : clampDay(b.repaymentDay, 20);
        const mc = {
          id: U.uid(),
          cardId: card.id,
          bank: card.bank,
          name: card.name,
          org: card.org,
          level: card.level,
          annualFee: card.annualFee,
          waiverType: card.waiverType,
          waiverCondition: card.waiverCondition,
          waiverPolicy: card.waiverPolicy,
          alias: String(b.alias || "").trim(),
          creditLimit: nonNeg(b.creditLimit, card.startCredit),
          billingDay: clampDay(b.billingDay, 1),
          repaymentDay: repayMode === "fixed" ? Math.min(31, Math.max(1, repayValue || 20)) : clampDay(b.repaymentDay, 20),
          repayMode,
          repayValue,
          graceDays: b.graceDays != null ? Math.max(0, Math.min(30, Math.round(Number(b.graceDays) || 0))) : 3,
          waivedYear: Math.max(0, Math.round(Number(b.waivedYear) || 0)),
          countPeriodYear: Math.max(0, Math.round(Number(b.countPeriodYear) || 0)),
          maxInterestDays: Math.max(0, Math.min(120, Math.round(Number(b.maxInterestDays) || 0))),
          feeMonth: fee.m,
          feeDay: fee.d,
          last4: String(b.last4 || "").replace(/\D/g, "").slice(0, 4),
          monthlySpendTarget: nonNeg(b.monthlySpendTarget, 0),
          benefits: normalizeBenefits(b.benefits, card.benefits),
          pointsDeducted: false,
          pointsDeductDate: null,
          assetWaived: false,
          assetWaivedDate: null,
          billGroupId: String(b.billGroupId || ""),
          createdAt: now.toISOString()
        };
        const gErr = groupAssignError(getMyCards(), mc, mc.billGroupId, now);
        if (gErr) return err(gErr);
        const myCards = getMyCards();
        myCards.push(mc);
        store.write("mycards", myCards);
        return json(computeMyCard(mc, now), 201);
      }
      const mcMatch = pathname.match(/^\/api\/mycards\/([^/]+)$/);
      if (mcMatch && method === "PUT") {
        const myCards = getMyCards();
        const i = myCards.findIndex((m) => m.id === mcMatch[1]);
        if (i < 0) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const cur = myCards[i];
        const fee = b.feeMonth != null || b.feeDay != null ? U.clampFeeDate(b.feeMonth != null ? b.feeMonth : cur.feeMonth, b.feeDay != null ? b.feeDay : cur.feeDay) : { m: cur.feeMonth, d: cur.feeDay };
        const repayMode = b.repayMode === "afterBill" ? "afterBill" : b.repayMode === "fixed" ? "fixed" : cur.repayMode || "fixed";
        const repayValue = b.repayValue != null ? Math.max(0, Math.min(365, Math.round(Number(b.repayValue) || 0))) : b.repaymentDay != null ? clampDay(b.repaymentDay, 20) : cur.repayValue != null ? cur.repayValue : cur.repaymentDay || 20;
        const updated = {
          ...cur,
          alias: String(b.alias != null ? b.alias : cur.alias).trim(),
          creditLimit: b.creditLimit != null ? nonNeg(b.creditLimit, 0) : cur.creditLimit,
          billingDay: b.billingDay != null ? clampDay(b.billingDay, 1) : cur.billingDay,
          repayMode,
          repayValue,
          repaymentDay: repayMode === "fixed" ? Math.min(31, Math.max(1, repayValue || 20)) : cur.repaymentDay,
          graceDays: b.graceDays != null ? Math.max(0, Math.min(30, Math.round(Number(b.graceDays) || 0))) : cur.graceDays || 0,
          waivedYear: b.waivedYear != null ? Math.max(0, Math.round(Number(b.waivedYear) || 0)) : cur.waivedYear || 0,
          countPeriodYear: b.countPeriodYear != null ? Math.max(0, Math.round(Number(b.countPeriodYear) || 0)) : cur.countPeriodYear || 0,
          maxInterestDays: b.maxInterestDays != null ? Math.max(0, Math.min(120, Math.round(Number(b.maxInterestDays) || 0))) : cur.maxInterestDays || 0,
          feeMonth: fee.m,
          feeDay: fee.d,
          last4: b.last4 != null ? String(b.last4).replace(/\D/g, "").slice(0, 4) : cur.last4,
          monthlySpendTarget: b.monthlySpendTarget != null ? nonNeg(b.monthlySpendTarget, 0) : cur.monthlySpendTarget,
          billGroupId: b.billGroupId != null ? String(b.billGroupId) : cur.billGroupId || "",
          // 年费/免年费快照可编辑（此前 PUT 静默丢弃这些字段：卡种快照建卡时若
          // 与实际不符——如「消费达标免年费」的卡被快照成积分抵扣——用户无法修正，
          // 记账后刷免达标永远不联动）
          annualFee: b.annualFee != null ? nonNeg(b.annualFee, 0) : cur.annualFee,
          waiverType: b.waiverType != null ? WAIVER_TYPES.includes(b.waiverType) ? b.waiverType : cur.waiverType : cur.waiverType,
          waiverCondition: b.waiverCondition != null ? String(b.waiverCondition).trim() : cur.waiverCondition,
          waiverPolicy: b.waiverPolicy != null ? String(b.waiverPolicy).trim() : cur.waiverPolicy
        };
        const gErr = groupAssignError(myCards.filter((x) => x.id !== cur.id).concat([updated]), updated, updated.billGroupId, now);
        if (gErr) return err(gErr);
        if (b.benefits !== void 0) {
          updated.benefits = normalizeBenefits(b.benefits, []);
          const kept = new Set(updated.benefits.map((x) => x.id));
          const recs = getBenefits();
          const remain = recs.filter((r) => !(r.myCardId === cur.id && r.bid && !kept.has(r.bid)));
          if (remain.length !== recs.length) store.write("benefits", remain);
        }
        myCards[i] = updated;
        store.write("mycards", myCards);
        return json(computeMyCard(updated, now));
      }
      if (mcMatch && method === "DELETE") {
        const myCards = getMyCards();
        if (!myCards.some((m) => m.id === mcMatch[1])) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        store.write("mycards", myCards.filter((m) => m.id !== mcMatch[1]));
        store.write("consumptions", getConsumptions().filter((r) => r.myCardId !== mcMatch[1]));
        store.write("benefits", getBenefits().filter((r) => r.myCardId !== mcMatch[1]));
        cleanBillGroups();
        return json({ ok: true });
      }
      const consMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions$/);
      if (consMatch && method === "GET") {
        const mc = getMyCards().find((m) => m.id === consMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const scope = url.searchParams.get("scope") || "all";
        let recs = amountRecordsOf(mc.id);
        const now2 = NOW();
        if (scope === "month") recs = recs.filter((r) => r.date >= U.toDateStr(new Date(now2.getFullYear(), now2.getMonth(), 1)));
        else if (scope === "year") recs = recs.filter((r) => r.date >= U.toDateStr(new Date(now2.getFullYear(), 0, 1)));
        recs = recs.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1);
        const total = recs.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        return json({ records: recs, total, count: recs.length });
      }
      if (consMatch && method === "POST") {
        const mc = getMyCards().find((m) => m.id === consMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const date = U.parseDateStr(b.date) ? String(b.date) : U.todayStr();
        const amount = Number(b.amount);
        if (!isFinite(amount) || amount <= 0) return err("\u91D1\u989D\u5FC5\u987B\u5927\u4E8E 0");
        if (amount > MAX_MONEY) return err("\u91D1\u989D\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
        const rec = {
          id: U.uid(),
          myCardId: mc.id,
          date,
          type: "amount",
          amount: Math.round(amount * 100) / 100,
          channel: CHANNELS.includes(b.channel) ? b.channel : CHANNELS[0],
          category: CATEGORIES.includes(b.category) ? b.category : "\u5176\u4ED6",
          note: String(b.note || "").trim(),
          createdAt: now.toISOString()
        };
        const recs = getConsumptions();
        recs.push(rec);
        store.write("consumptions", recs);
        return json(rec, 201);
      }
      const cntMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions\/count$/);
      if (cntMatch && method === "POST") {
        const mc = getMyCards().find((m) => m.id === cntMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const count3 = validCount(b.count);
        if (count3 === null) return err("\u8865\u5F55\u7B14\u6570\u5FC5\u987B\u4E3A\u5927\u4E8E 0 \u7684\u6574\u6570");
        const rec = {
          id: U.uid(),
          myCardId: mc.id,
          type: "count",
          date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
          count: count3,
          createdAt: now.toISOString()
        };
        const recs = getConsumptions();
        recs.push(rec);
        store.write("consumptions", recs);
        return json(rec, 201);
      }
      const consDelMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/consumptions\/([^/]+)$/);
      if (consDelMatch && method === "DELETE") {
        const mc = getMyCards().find((m) => m.id === consDelMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const recs = getConsumptions();
        const rec = recs.find((r) => r.id === consDelMatch[2] && r.myCardId === mc.id);
        if (!rec) return err("\u6D88\u8D39\u8BB0\u5F55\u4E0D\u5B58\u5728", 404);
        if (rec.type !== "amount") return err("\u7B14\u6570\u8865\u5F55\u8BB0\u5F55\u4E0D\u652F\u6301\u5220\u9664");
        store.write("consumptions", recs.filter((r) => r.id !== rec.id));
        return json({ ok: true });
      }
      const benHisMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/history$/);
      if (benHisMatch && method === "GET") {
        const mc = getMyCards().find((m) => m.id === benHisMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const ref2 = resolveBenefit(mc, +benHisMatch[2], url.searchParams.get("bid"));
        if (!ref2) return err("\u6743\u76CA\u4E0D\u5B58\u5728", 404);
        return json(benefitHistory(mc, ref2.idx, ref2.bid, buildIndexes()));
      }
      const benUseMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/usage$/);
      if (benUseMatch && method === "POST") {
        const mc = getMyCards().find((m) => m.id === benUseMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const ref2 = resolveBenefit(mc, +benUseMatch[2], (body || {}).bid);
        if (!ref2) return err("\u6743\u76CA\u4E0D\u5B58\u5728", 404);
        const idx = ref2.idx;
        const st = benefitUsed(mc, idx, now);
        if (st.expired) return err("\u5F53\u524D\u6743\u76CA\u5DF2\u8FC7\u6709\u6548\u671F");
        if (st.exhausted) return err("\u5F53\u524D\u6743\u76CA\u6B21\u6570\u5DF2\u7528\u5B8C");
        const b = body || {};
        const rec = {
          id: U.uid(),
          myCardId: mc.id,
          idx,
          bid: ref2.bid,
          type: "usage",
          date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
          note: String(b.note || "").trim(),
          createdAt: now.toISOString()
        };
        const recs = getBenefits();
        recs.push(rec);
        store.write("benefits", recs);
        return json({ ok: true, used: st.used + 1, total: st.total }, 201);
      }
      const benCntMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/benefits\/(\d+)\/count$/);
      if (benCntMatch && method === "POST") {
        const mc = getMyCards().find((m) => m.id === benCntMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const ref2 = resolveBenefit(mc, +benCntMatch[2], (body || {}).bid);
        if (!ref2) return err("\u6743\u76CA\u4E0D\u5B58\u5728", 404);
        const idx = ref2.idx;
        const st = benefitUsed(mc, idx, now);
        const b = body || {};
        const count3 = validCount(b.count);
        if (count3 === null) return err("\u8865\u5F55\u6B21\u6570\u5FC5\u987B\u4E3A\u5927\u4E8E 0 \u7684\u6574\u6570");
        if (st.expired) return err("\u5F53\u524D\u6743\u76CA\u5DF2\u8FC7\u6709\u6548\u671F");
        if (st.total >= 0 && st.used + count3 > st.total) return err("\u5F53\u524D\u6743\u76CA\u6B21\u6570\u5DF2\u7528\u5B8C\uFF08\u5269\u4F59 " + Math.max(0, st.total - st.used) + " \u6B21\uFF09");
        const rec = {
          id: U.uid(),
          myCardId: mc.id,
          idx,
          bid: ref2.bid,
          type: "count",
          date: U.parseDateStr(b.date) ? String(b.date) : U.todayStr(),
          count: count3,
          createdAt: now.toISOString()
        };
        const recs = getBenefits();
        recs.push(rec);
        store.write("benefits", recs);
        return json({ ok: true, used: st.used + count3, total: st.total }, 201);
      }
      if (pathname === "/api/billgroups" && method === "GET") {
        const myCards = getMyCards();
        const groups = getBillGroups().map((g) => {
          const members = myCards.filter((m) => m.billGroupId === g.id);
          return {
            ...g,
            memberIds: members.map((m) => m.id),
            memberCount: members.length,
            // 组内统一还款节奏（成员必然一致，否则组无法建立）；空组回退显示为空
            lastPayDate: members.length ? D.paymentInfo(members[0], now).lastPayDate : ""
          };
        });
        return json(groups);
      }
      if (pathname === "/api/billgroups" && method === "POST") {
        const b = body || {};
        const name = String(b.name || "").trim();
        if (!name) return err("\u8BF7\u586B\u5199\u8D26\u5355\u7EC4\u540D\u79F0");
        const groups = getBillGroups();
        if (groups.some((g2) => g2.name === name)) return err("\u5DF2\u5B58\u5728\u540C\u540D\u8D26\u5355\u7EC4");
        const ids = Array.isArray(b.memberIds) ? b.memberIds.map(String) : [];
        const myCards = getMyCards();
        const picked = [];
        for (const id of ids) {
          const m = myCards.find((x) => x.id === id);
          if (!m) return err("\u6301\u5361\u4E0D\u5B58\u5728: " + id, 404);
          if (picked.some((x) => x.id === id)) continue;
          picked.push(m);
        }
        if (picked.length < 2) return err("\u8D26\u5355\u7EC4\u81F3\u5C11\u9700\u8981 2 \u5F20\u5361");
        for (let i = 1; i < picked.length; i++) {
          if (!sameRepaySchedule(picked[0], picked[i], now)) {
            return err("\u300C" + (picked[i].alias || picked[i].name) + "\u300D\u4E0E\u300C" + (picked[0].alias || picked[0].name) + "\u300D\u7684\u6700\u540E\u8FD8\u6B3E\u65E5\u4E0D\u4E00\u81F4\uFF0C\u65E0\u6CD5\u5408\u5E76\uFF08\u7EC4\u5185\u5361\u5FC5\u987B\u540C\u8FD8\u6B3E\u65E5\uFF09");
          }
        }
        const g = { id: U.uid(), name, createdAt: now.toISOString() };
        groups.push(g);
        store.write("billGroups", groups);
        for (const m of picked) m.billGroupId = g.id;
        store.write("mycards", myCards);
        return json(g, 201);
      }
      const bgMatch = pathname.match(/^\/api\/billgroups\/([^/]+)$/);
      if (bgMatch && method === "PUT") {
        const groups = getBillGroups();
        const i = groups.findIndex((g) => g.id === bgMatch[1]);
        if (i < 0) return err("\u8D26\u5355\u7EC4\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const name = String(b.name != null ? b.name : groups[i].name).trim();
        if (!name) return err("\u8BF7\u586B\u5199\u8D26\u5355\u7EC4\u540D\u79F0");
        if (groups.some((g, k) => k !== i && g.name === name)) return err("\u5DF2\u5B58\u5728\u540C\u540D\u8D26\u5355\u7EC4");
        const myCards = getMyCards();
        if (Array.isArray(b.memberIds)) {
          const ids = b.memberIds.map(String);
          const picked = [];
          for (const id of ids) {
            const m = myCards.find((x) => x.id === id);
            if (!m) return err("\u6301\u5361\u4E0D\u5B58\u5728: " + id, 404);
            if (!picked.some((x) => x.id === id)) picked.push(m);
          }
          if (picked.length && picked.length < 2) return err("\u8D26\u5355\u7EC4\u81F3\u5C11\u9700\u8981 2 \u5F20\u5361");
          for (let k = 1; k < picked.length; k++) {
            if (!sameRepaySchedule(picked[0], picked[k], now)) {
              return err("\u300C" + (picked[k].alias || picked[k].name) + "\u300D\u4E0E\u300C" + (picked[0].alias || picked[0].name) + "\u300D\u7684\u6700\u540E\u8FD8\u6B3E\u65E5\u4E0D\u4E00\u81F4\uFF0C\u65E0\u6CD5\u5408\u5E76\uFF08\u7EC4\u5185\u5361\u5FC5\u987B\u540C\u8FD8\u6B3E\u65E5\uFF09");
            }
          }
          const set = new Set(picked.map((m) => m.id));
          for (const m of myCards) {
            if (m.billGroupId === groups[i].id && !set.has(m.id)) m.billGroupId = "";
            else if (set.has(m.id)) m.billGroupId = groups[i].id;
          }
          store.write("mycards", myCards);
        }
        groups[i] = { ...groups[i], name };
        store.write("billGroups", groups);
        cleanBillGroups();
        return json(groups[i]);
      }
      if (bgMatch && method === "DELETE") {
        const groups = getBillGroups();
        if (!groups.some((g) => g.id === bgMatch[1])) return err("\u8D26\u5355\u7EC4\u4E0D\u5B58\u5728", 404);
        const myCards = getMyCards();
        let changed = false;
        for (const m of myCards) {
          if (m.billGroupId === bgMatch[1]) {
            m.billGroupId = "";
            changed = true;
          }
        }
        if (changed) store.write("mycards", myCards);
        store.write("billGroups", groups.filter((g) => g.id !== bgMatch[1]));
        return json({ ok: true });
      }
      if (pathname === "/api/bills" && method === "GET") {
        const q = url.searchParams;
        let list = getBills();
        const cardId = q.get("myCardId");
        const month = q.get("month");
        const paid = q.get("paid");
        if (cardId) list = list.filter((b) => b.myCardId === cardId);
        if (month) list = list.filter((b) => b.month === month);
        if (paid) list = list.filter((b) => b.paid === paid);
        return json(list.sort((a, b) => a.month < b.month ? 1 : -1));
      }
      if (pathname === "/api/bills" && method === "POST") {
        const b = body || {};
        if (!b.myCardId) return err("\u7F3A\u5C11 myCardId");
        if (!getMyCards().some((m) => m.id === b.myCardId)) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        if (!/^\d{4}-\d{2}$/.test(String(b.month || ""))) return err("\u51FA\u8D26\u6708\u4EFD\u683C\u5F0F\u5E94\u4E3A YYYY-MM");
        const amount = Number(b.amount);
        if (!isFinite(amount) || amount < 0) return err("\u8D26\u5355\u91D1\u989D\u5FC5\u987B\u4E0D\u5C0F\u4E8E 0");
        const bills = getBills();
        if (bills.some((x) => x.myCardId === b.myCardId && x.month === b.month)) {
          return err("\u8BE5\u5361\u8BE5\u6708\u4EFD\u8D26\u5355\u5DF2\u5B58\u5728");
        }
        const rec = {
          id: U.uid(),
          myCardId: b.myCardId,
          month: String(b.month),
          amount: Math.round(amount * 100) / 100,
          // 日期一律经真实校验（拒绝 2026-02-30 / 2026-13-01 这类不存在的日期）
          dueDate: U.parseDateStr(b.dueDate) ? String(b.dueDate) : "",
          paid: b.paid === "\u5DF2\u8FD8" ? "\u5DF2\u8FD8" : "\u672A\u8FD8",
          paidDate: U.parseDateStr(b.paidDate) ? String(b.paidDate) : "",
          note: String(b.note || "").trim(),
          createdAt: now.toISOString()
        };
        bills.push(rec);
        store.write("bills", bills);
        return json(rec, 201);
      }
      const billMatch = pathname.match(/^\/api\/bills\/([^/]+)$/);
      if (billMatch && method === "PUT") {
        const bills = getBills();
        const i = bills.findIndex((b2) => b2.id === billMatch[1]);
        if (i < 0) return err("\u8D26\u5355\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const cur = bills[i];
        const amount = b.amount != null ? Number(b.amount) : cur.amount;
        if (!isFinite(amount) || amount < 0) return err("\u8D26\u5355\u91D1\u989D\u5FC5\u987B\u4E0D\u5C0F\u4E8E 0");
        const paid = b.paid == null ? cur.paid : b.paid === "\u5DF2\u8FD8" ? "\u5DF2\u8FD8" : "\u672A\u8FD8";
        const dueDate = b.dueDate != null ? U.parseDateStr(b.dueDate) ? String(b.dueDate) : "" : U.parseDateStr(cur.dueDate) ? cur.dueDate : "";
        const paidDate = b.paidDate != null ? U.parseDateStr(b.paidDate) ? String(b.paidDate) : "" : paid === "\u5DF2\u8FD8" ? U.parseDateStr(cur.paidDate) ? cur.paidDate : U.todayStr() : "";
        bills[i] = {
          ...cur,
          amount: Math.round(amount * 100) / 100,
          dueDate,
          paid,
          // 标记已还且未填还款日期时自动填今天；改回未还则清空
          paidDate,
          note: b.note != null ? String(b.note).trim() : cur.note
        };
        store.write("bills", bills);
        return json(bills[i]);
      }
      if (billMatch && method === "DELETE") {
        const bills = getBills();
        if (!bills.some((b) => b.id === billMatch[1])) return err("\u8D26\u5355\u4E0D\u5B58\u5728", 404);
        store.write("bills", bills.filter((b) => b.id !== billMatch[1]));
        return json({ ok: true });
      }
      const billGenMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/bills\/generate$/);
      if (billGenMatch && method === "POST") {
        const mc = getMyCards().find((m) => m.id === billGenMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        const info3 = D.paymentInfo(mc, now);
        const month = body && /^\d{4}-\d{2}$/.test(String(body.month || "")) ? String(body.month) : info3.billMonth;
        const bills = getBills();
        const exist = bills.find((b) => b.myCardId === mc.id && b.month === month);
        if (exist) return json(exist);
        const rec = {
          id: U.uid(),
          myCardId: mc.id,
          month,
          amount: 0,
          dueDate: info3.dueDate,
          paid: "\u672A\u8FD8",
          paidDate: "",
          note: "",
          createdAt: now.toISOString()
        };
        bills.push(rec);
        store.write("bills", bills);
        return json(rec, 201);
      }
      if (pathname === "/api/memberships" && method === "GET") {
        const list = getMemberships().map((m) => ({ ...m, remaining: A.membershipRemaining(m) }));
        return json(list);
      }
      if (pathname === "/api/memberships" && method === "POST") {
        const b = body || {};
        if (!String(b.name || "").trim()) return err("\u8BF7\u586B\u5199\u540D\u79F0");
        if (b.mode === "count" && nonNeg(b.totalUses, -1) < 0) return err("\u603B\u6B21\u6570\u5FC5\u987B\u4E0D\u5C0F\u4E8E 0");
        const rec = A.normalizeMembership(b, null);
        const list = getMemberships();
        list.push(rec);
        store.write("memberships", list);
        return json(rec, 201);
      }
      const memMatch = pathname.match(/^\/api\/memberships\/([^/]+)$/);
      if (memMatch && method === "PUT") {
        const list = getMemberships();
        const cur = list.find((x) => x.id === memMatch[1]);
        if (!cur) return err("\u4F1A\u5458\u5361\u4E0D\u5B58\u5728", 404);
        const rec = A.normalizeMembership(body || {}, cur);
        rec.transactions = cur.transactions;
        list.splice(list.indexOf(cur), 1, rec);
        store.write("memberships", list);
        return json(rec);
      }
      if (memMatch && method === "DELETE") {
        const list = getMemberships();
        if (!list.some((x) => x.id === memMatch[1])) return err("\u4F1A\u5458\u5361\u4E0D\u5B58\u5728", 404);
        store.write("memberships", list.filter((x) => x.id !== memMatch[1]));
        return json({ ok: true });
      }
      const memTxnMatch = pathname.match(/^\/api\/memberships\/([^/]+)\/txn$/);
      if (memTxnMatch && method === "POST") {
        const list = getMemberships();
        const m = list.find((x) => x.id === memTxnMatch[1]);
        if (!m) return err("\u4F1A\u5458\u5361\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        if (m.mode === "amount") {
          const amount = Number(b.amount);
          if (!isFinite(amount) || amount <= 0) return err("\u91D1\u989D\u5FC5\u987B\u5927\u4E8E 0");
          if (amount > MAX_MONEY) return err("\u91D1\u989D\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
          if (b.kind !== "topup" && amount > m.balance) return err("\u4F59\u989D\u4E0D\u8DB3");
          const txn = A.normalizeTxn({ kind: b.kind === "topup" ? "topup" : "consume", amount, note: b.note, date: b.date });
          if (txn.kind === "topup") m.balance = A.round2(m.balance + amount);
          else m.balance = A.round2(m.balance - amount);
          m.transactions.push(txn);
          store.write("memberships", list);
          return json({ ok: true, balance: m.balance, txn }, 201);
        }
        if (b.kind === "use") {
          if (m.usedUses >= m.totalUses) return err("\u6B21\u6570\u5DF2\u7528\u5B8C");
          const txn = A.normalizeTxn({ kind: "consume", amount: 0, note: b.note || "\u4F7F\u7528 1 \u6B21", date: b.date });
          m.usedUses += 1;
          if (!Array.isArray(m.transactions)) m.transactions = [];
          m.transactions.push(txn);
          store.write("memberships", list);
          return json({ ok: true, usedUses: m.usedUses, txn }, 201);
        }
        if (b.kind === "undo") {
          if (m.usedUses <= 0) return err("\u6CA1\u6709\u53EF\u56DE\u9000\u7684\u4F7F\u7528");
          m.usedUses -= 1;
          store.write("memberships", list);
          return json({ ok: true, usedUses: m.usedUses }, 201);
        }
        return err("\u6309\u6B21\u578B\u4F1A\u5458\u5361\u53EA\u652F\u6301 use/undo");
      }
      if (pathname === "/api/vouchers" && method === "GET") {
        const list = getVouchers().map((v) => ({
          ...v,
          remaining: A.voucherRemaining(v),
          // type 兜底：数据文件被手改/旧版遗留类型（normalizeVoucher 只在写入时归一化），
          // 直读时 type 可能不在 META 里，查表 undefined.l 会 500 整个列表接口
          typeLabel: (A.VOUCHER_TYPE_META[v.type] || A.VOUCHER_TYPE_META[A.VOUCHER_TYPE_LEGACY[v.type] || "coupon"]).l
        }));
        return json(list);
      }
      if (pathname === "/api/vouchers" && method === "POST") {
        const b = body || {};
        if (!String(b.brand || "").trim()) return err("\u8BF7\u586B\u5199\u54C1\u724C");
        if (!String(b.name || "").trim()) return err("\u8BF7\u586B\u5199\u540D\u79F0");
        const rec = A.normalizeVoucher(b, null);
        const list = getVouchers();
        list.push(rec);
        store.write("vouchers", list);
        return json(rec, 201);
      }
      const vchMatch = pathname.match(/^\/api\/vouchers\/([^/]+)$/);
      if (vchMatch && method === "PUT") {
        const list = getVouchers();
        const cur = list.find((x) => x.id === vchMatch[1]);
        if (!cur) return err("\u5238\u4E0D\u5B58\u5728", 404);
        const rec = A.normalizeVoucher(body || {}, cur);
        rec.transactions = cur.transactions;
        list.splice(list.indexOf(cur), 1, rec);
        store.write("vouchers", list);
        return json(rec);
      }
      if (vchMatch && method === "DELETE") {
        const list = getVouchers();
        if (!list.some((x) => x.id === vchMatch[1])) return err("\u5238\u4E0D\u5B58\u5728", 404);
        store.write("vouchers", list.filter((x) => x.id !== vchMatch[1]));
        return json({ ok: true });
      }
      const vchUseMatch = pathname.match(/^\/api\/vouchers\/([^/]+)\/use$/);
      if (vchUseMatch && method === "POST") {
        const list = getVouchers();
        const v = list.find((x) => x.id === vchUseMatch[1]);
        if (!v) return err("\u5238\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        if (b.undo) {
          if (v.usedUses <= 0) return err("\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u6838\u9500");
          v.usedUses -= 1;
          if (!Array.isArray(v.transactions)) v.transactions = [];
          v.transactions.push(A.normalizeTxn({ kind: "consume", amount: 0, note: b.note || "\u64A4\u9500\u6838\u9500", date: b.date }));
          store.write("vouchers", list);
          return json({ ok: true, usedUses: v.usedUses }, 201);
        }
        if (v.mode === "amount") return err("\u50A8\u503C\u578B\u8BF7\u8D70\u5145\u503C/\u6838\u9500\u91D1\u989D\u7AEF\u70B9");
        if (v.usedUses >= v.totalUses) return err("\u6B21\u6570\u5DF2\u7528\u5B8C");
        if (v.type === "fullred") {
          const spend = Number(b.amount);
          if (!isFinite(spend) || spend <= 0) return err("\u6EE1\u51CF\u5238\u6838\u9500\u9700\u4F20\u5165\u672C\u5355\u91D1\u989D amount");
          if (spend < v.threshold) return err("\u672A\u8FBE\u6EE1\u51CF\u95E8\u69DB\uFF08\u6EE1 " + v.threshold + " \u53EF\u7528\uFF09");
        }
        const txn = A.normalizeTxn({ kind: "consume", amount: 0, note: b.note || "\u4F7F\u7528 1 \u6B21", date: b.date });
        v.usedUses += 1;
        if (!Array.isArray(v.transactions)) v.transactions = [];
        v.transactions.push(txn);
        store.write("vouchers", list);
        return json({ ok: true, usedUses: v.usedUses }, 201);
      }
      const vchTopMatch = pathname.match(/^\/api\/vouchers\/([^/]+)\/topup$/);
      if (vchTopMatch && method === "POST") {
        const list = getVouchers();
        const v = list.find((x) => x.id === vchTopMatch[1]);
        if (!v) return err("\u5238\u4E0D\u5B58\u5728", 404);
        if (v.mode !== "amount") return err("\u4EC5\u50A8\u503C\u578B\u652F\u6301\u5145\u503C/\u91D1\u989D\u6838\u9500");
        const b = body || {};
        const amount = Number(b.amount);
        if (!isFinite(amount) || amount <= 0) return err("\u91D1\u989D\u5FC5\u987B\u5927\u4E8E 0");
        if (amount > MAX_MONEY) return err("\u91D1\u989D\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
        if (b.kind !== "topup" && amount > v.balance) return err("\u4F59\u989D\u4E0D\u8DB3");
        const txn = A.normalizeTxn({ kind: b.kind === "topup" ? "topup" : "consume", amount, note: b.note, date: b.date });
        if (txn.kind === "topup") v.balance = A.round2(v.balance + amount);
        else v.balance = A.round2(v.balance - amount);
        if (!Array.isArray(v.transactions)) v.transactions = [];
        v.transactions.push(txn);
        store.write("vouchers", list);
        return json({ ok: true, balance: v.balance, txn }, 201);
      }
      if (pathname === "/api/voucherbrands" && method === "GET") return json(getVoucherBrands());
      if (pathname === "/api/voucherbrands" && method === "POST") {
        const b = body || {};
        const name = String(b.name || "").trim();
        if (!name) return err("\u8BF7\u586B\u5199\u5546\u5BB6\u540D\u79F0");
        const list = getVoucherBrands();
        if (list.some((x) => x.name === name)) return err("\u5DF2\u5B58\u5728\u540C\u540D\u5546\u5BB6");
        const rec = A.normalizeBrand({ name, note: b.note }, null);
        list.push(rec);
        store.write("voucherBrands", list);
        return json(rec, 201);
      }
      const vbMatch = pathname.match(/^\/api\/voucherbrands\/([^/]+)$/);
      if (vbMatch && method === "PUT") {
        const list = getVoucherBrands();
        const cur = list.find((x) => x.id === vbMatch[1]);
        if (!cur) return err("\u5546\u5BB6\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const name = b.name != null ? String(b.name).trim() : cur.name;
        if (!name) return err("\u5546\u5BB6\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
        if (list.some((x) => x.name === name && x.id !== cur.id)) return err("\u5DF2\u5B58\u5728\u540C\u540D\u5546\u5BB6");
        const rec = A.normalizeBrand({ name, note: b.note }, cur);
        list.splice(list.indexOf(cur), 1, rec);
        store.write("voucherBrands", list);
        return json(rec);
      }
      if (vbMatch && method === "DELETE") {
        const list = getVoucherBrands();
        if (!list.some((x) => x.id === vbMatch[1])) return err("\u5546\u5BB6\u4E0D\u5B58\u5728", 404);
        store.write("voucherBrands", list.filter((x) => x.id !== vbMatch[1]));
        return json({ ok: true });
      }
      if (pathname === "/api/knowledge" && method === "GET") {
        const list = getKnowledge().map((k) => ({ ...k, active: !k.lifetime && (!k.expiry || k.expiry >= U.todayStr()) }));
        return json(list);
      }
      if (pathname === "/api/knowledge" && method === "POST") {
        const b = body || {};
        if (!String(b.title || "").trim()) return err("\u8BF7\u586B\u5199\u8D44\u6E90\u540D\u79F0");
        const rec = A.normalizeKnowledge(b, null);
        const list = getKnowledge();
        list.push(rec);
        store.write("knowledge", list);
        return json(rec, 201);
      }
      const kgMatch = pathname.match(/^\/api\/knowledge\/([^/]+)$/);
      if (kgMatch && method === "PUT") {
        const list = getKnowledge();
        const cur = list.find((x) => x.id === kgMatch[1]);
        if (!cur) return err("\u8D44\u6E90\u4E0D\u5B58\u5728", 404);
        const rec = A.normalizeKnowledge(body || {}, cur);
        rec.useLog = cur.useLog;
        rec.history = cur.history;
        list.splice(list.indexOf(cur), 1, rec);
        store.write("knowledge", list);
        return json(rec);
      }
      if (kgMatch && method === "DELETE") {
        const list = getKnowledge();
        if (!list.some((x) => x.id === kgMatch[1])) return err("\u8D44\u6E90\u4E0D\u5B58\u5728", 404);
        store.write("knowledge", list.filter((x) => x.id !== kgMatch[1]));
        return json({ ok: true });
      }
      const kgUseMatch = pathname.match(/^\/api\/knowledge\/([^/]+)\/use$/);
      if (kgUseMatch && method === "POST") {
        const list = getKnowledge();
        const k = list.find((x) => x.id === kgUseMatch[1]);
        if (!k) return err("\u8D44\u6E90\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const q = k.quota || { count: 0, countMax: 0, balance: 0, download: 0, call: 0 };
        if (b.undo) {
          if (k.uses <= 0) return err("\u6CA1\u6709\u53EF\u56DE\u9000\u7684\u4F7F\u7528");
          k.uses -= 1;
          store.write("knowledge", list);
          return json({ ok: true, uses: k.uses }, 201);
        }
        if (q.countMax > 0 && k.uses >= q.countMax) return err("\u4F7F\u7528\u6B21\u6570\u5DF2\u8FBE\u914D\u989D\u4E0A\u9650\uFF08" + q.countMax + "\uFF09");
        const note = String(b.note || "").trim() || "\u4F7F\u7528 1 \u6B21";
        k.uses += 1;
        if (!Array.isArray(k.useLog)) k.useLog = [];
        k.useLog.push(A.normalizeKgLog({ note, date: b.date }));
        const qk = String(b.quotaKey || "");
        if (qk === "download" && q.download > 0) q.download -= 1;
        else if (qk === "call" && q.call > 0) q.call -= 1;
        else if (q.countMax > 0) q.count += 1;
        k.quota = q;
        store.write("knowledge", list);
        return json({ ok: true, uses: k.uses }, 201);
      }
      const kgHisMatch = pathname.match(/^\/api\/knowledge\/([^/]+)\/history$/);
      if (kgHisMatch && method === "POST") {
        const list = getKnowledge();
        const k = list.find((x) => x.id === kgHisMatch[1]);
        if (!k) return err("\u8D44\u6E90\u4E0D\u5B58\u5728", 404);
        const b = body || {};
        const amount = Number(b.amount);
        if (!isFinite(amount) || amount < 0) return err("\u91D1\u989D\u5FC5\u987B\u4E0D\u5C0F\u4E8E 0");
        if (amount > MAX_MONEY) return err("\u91D1\u989D\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
        const rec = A.normalizeKgHistory({ type: b.type, note: b.note, amount, date: b.date });
        if (!Array.isArray(k.history)) k.history = [];
        k.history.push(rec);
        store.write("knowledge", list);
        return json({ ok: true, history: rec }, 201);
      }
      if (pathname === "/api/assets/stats" && method === "GET") {
        const mems = getMemberships();
        const vchs = getVouchers();
        const kgs = getKnowledge();
        const myCards = getMyCards();
        const idx = buildIndexes();
        const now2 = NOW();
        const computed = myCards.map((m) => computeMyCard(m, now2, idx));
        const memBalance = mems.reduce((s, m) => s + (m.mode === "amount" ? Number(m.balance) || 0 : 0), 0);
        const memCount = mems.length;
        const voucherCount = vchs.length;
        const voucherRemainingCount = vchs.filter((v) => v.mode === "count").reduce((s, v) => s + Math.max(0, A.voucherRemaining(v)), 0);
        const voucherBalance = vchs.filter((v) => v.mode === "amount").reduce((s, v) => s + (Number(v.balance) || 0), 0);
        const kgTotal = kgs.reduce((s, k) => s + (Number(k.price) || 0), 0);
        const kgActive = kgs.filter((k) => k.lifetime || !k.expiry || k.expiry >= U.todayStr()).length;
        let benUsed = 0, benTotal = 0;
        for (const m of computed) {
          for (const b of m.benefits || []) {
            const t = Number(b.total);
            if (!Number.isFinite(t) || t < 0) continue;
            benUsed += Math.min(Number(b.used) || 0, t);
            benTotal += t;
          }
        }
        const redemptionRate = benTotal ? Math.round(benUsed / benTotal * 100) : 0;
        const structure = [
          { key: "membership", label: "\u4F1A\u5458/\u50A8\u503C\u4F59\u989D", value: A.round2(memBalance + voucherBalance) },
          { key: "knowledge", label: "\u77E5\u8BC6\u5E93\u7D2F\u8BA1\u6295\u5165", value: A.round2(kgTotal) }
        ];
        return json({
          membership: { count: memCount, balance: A.round2(memBalance) },
          voucher: { count: voucherCount, remainingCount: voucherRemainingCount, balance: A.round2(voucherBalance) },
          knowledge: { count: kgs.length, totalSpend: A.round2(kgTotal), activeCount: kgActive },
          benefit: { used: benUsed, total: benTotal, redemptionRate },
          structure
        });
      }
      if (pathname === "/api/assets/feed" && method === "GET") {
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
        const items = [];
        for (const m of getMemberships()) {
          for (const t of m.transactions || []) {
            items.push({ date: t.date, createdAt: t.createdAt, kind: "membership", title: t.note || (t.kind === "topup" ? "\u5145\u503C" : "\u6D88\u8D39"), sub: m.name, amount: t.kind === "topup" ? Number(t.amount) || 0 : -(Number(t.amount) || 0) });
          }
        }
        for (const v of getVouchers()) {
          for (const t of v.transactions || []) {
            items.push({ date: t.date, createdAt: t.createdAt, kind: "voucher", title: t.note || (t.kind === "topup" ? "\u5145\u503C" : "\u6838\u9500"), sub: (v.brand ? v.brand + " \xB7 " : "") + v.name, amount: t.kind === "topup" ? Number(t.amount) || 0 : 0 });
          }
        }
        for (const k of getKnowledge()) {
          for (const u of k.useLog || []) {
            items.push({ date: u.date, createdAt: u.createdAt, kind: "knowledge", title: u.note || "\u4F7F\u7528", sub: k.title, amount: 0 });
          }
          for (const h of k.history || []) {
            items.push({ date: h.date, createdAt: h.createdAt, kind: "knowledge-pay", title: (h.note || h.type) + (h.amount ? " \xA5" + h.amount : ""), sub: k.title, amount: h.type === "refund" ? -(Number(h.amount) || 0) : Number(h.amount) || 0 });
          }
        }
        const cardNameOf = new Map(getMyCards().map((m) => [m.id, (m.alias || m.name) + (m.bank ? "\uFF08" + m.bank + "\uFF09" : "")]));
        for (const r of getBenefits()) {
          items.push({ date: r.date, createdAt: r.createdAt, kind: "benefit", title: r.note || "\u6743\u76CA\u4F7F\u7528", sub: cardNameOf.get(r.myCardId) || "\u6301\u5361", amount: 0 });
        }
        items.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        return json(items.slice(0, limit));
      }
      if (pathname === "/api/assets/expiring" && method === "GET") {
        const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 60));
        const now2 = NOW();
        const out = [];
        const scan = /* @__PURE__ */ __name((list, kind, label) => {
          for (const it of list || []) {
            const left = A.daysLeftOf(it.expiry, now2);
            if (left == null || left < 0 || left > days) continue;
            out.push({
              kind,
              label,
              id: it.id,
              name: it.name || it.title || "\u672A\u547D\u540D",
              sub: it.brand || it.platform || "",
              expiry: it.expiry,
              daysLeft: left,
              value: kind === "membership" ? it.mode === "amount" ? Number(it.balance) || 0 : Math.max(0, A.membershipRemaining(it)) : kind === "voucher" ? Math.max(0, A.voucherRemaining(it)) : Number(it.price) || 0
            });
          }
        }, "scan");
        scan(getMemberships(), "membership", "\u4F1A\u5458\u5361/\u50A8\u503C\u5361");
        scan(getVouchers(), "voucher", "\u5361/\u7968");
        scan(getKnowledge().filter((k) => !k.lifetime), "knowledge", "\u77E5\u8BC6\u5E93\u8BA2\u9605");
        out.sort((a, b) => a.daysLeft - b.daysLeft);
        return json(out);
      }
      if (pathname === "/api/notify/config" && method === "GET") {
        return json(maskNotifySecrets(reminder.normalizeConfig(getNotifyRaw())));
      }
      if (pathname === "/api/notify/config" && method === "PUT") {
        const raw = getNotifyRaw() || {};
        const incoming = body || {};
        const existing = reminder.normalizeConfig(raw);
        if (incoming.channels && typeof incoming.channels === "object") {
          for (const ch of Object.keys(NOTIFY_SECRET_FIELDS)) {
            const inCh = incoming.channels[ch];
            if (!inCh || typeof inCh !== "object") continue;
            for (const f of NOTIFY_SECRET_FIELDS[ch]) {
              if (f in inCh && isMaskedSecret(inCh[f])) {
                const old = (existing.channels[ch] || {})[f];
                inCh[f] = old || "";
              }
            }
          }
        }
        const cfg = reminder.normalizeConfig(Object.assign({}, raw, incoming, {
          // sentLog/history 不能被前端覆盖，只允许通过 check 结果更新
          sentLog: raw.sentLog || {},
          history: raw.history || []
        }));
        store.write("notify", cfg);
        return json(maskNotifySecrets(cfg));
      }
      if (pathname === "/api/notify/test" && method === "POST") {
        const cfg = reminder.normalizeConfig(getNotifyRaw());
        const enabled = notifier.enabledChannels(cfg);
        if (!enabled.length) return err("\u8BF7\u5148\u542F\u7528\u81F3\u5C11\u4E00\u4E2A\u63D0\u9192\u901A\u9053");
        const results = await notifier.notifyAll(cfg, "\u7BA1\u5361\u63D0\u9192\u6D4B\u8BD5", "\u8FD9\u662F\u4E00\u6761\u6765\u81EA\u7BA1\u5361\u7684**\u6D4B\u8BD5\u63D0\u9192**\u3002\n\n- \u901A\u9053\uFF1A" + enabled.join("\u3001") + "\n- \u65F6\u95F4\uFF1A" + NOW().toLocaleString("zh-CN"));
        const okCount = results.filter((r) => r.ok).length;
        return json({ ok: okCount > 0, results });
      }
      if (pathname === "/api/notify/check" && method === "POST") {
        return json(await runNotifyChecks(true));
      }
      if (pathname === "/api/notify/history" && method === "GET") {
        const cfg = reminder.normalizeConfig(getNotifyRaw());
        return json({ history: cfg.history || [], enabled: cfg.enabled, intervalMinutes: cfg.intervalMinutes });
      }
      if (pathname === "/api/calendar.ics" && method === "GET") {
        const idx = buildIndexes();
        const computed = getMyCards().map((m) => computeMyCard(m, now, idx));
        const assetData = { memberships: getMemberships(), vouchers: getVouchers(), knowledge: getKnowledge() };
        const text = ics.generateICS(computed, getBills(), now, assetData);
        return {
          ics: text,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="guanka.ics"',
            "Cache-Control": "no-store"
          }
        };
      }
      const ptsMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/points$/);
      if (ptsMatch && method === "POST") {
        const myCards = getMyCards();
        const mc = myCards.find((m) => m.id === ptsMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        mc.pointsDeducted = !!(body || {}).value;
        mc.pointsDeductDate = mc.pointsDeducted ? U.todayStr() : null;
        store.write("mycards", myCards);
        return json({ ok: true, pointsDeducted: mc.pointsDeducted, pointsDeductDate: mc.pointsDeductDate });
      }
      const assetMatch = pathname.match(/^\/api\/mycards\/([^/]+)\/asset$/);
      if (assetMatch && method === "POST") {
        const myCards = getMyCards();
        const mc = myCards.find((m) => m.id === assetMatch[1]);
        if (!mc) return err("\u6301\u5361\u4E0D\u5B58\u5728", 404);
        mc.assetWaived = !!(body || {}).value;
        mc.assetWaivedDate = mc.assetWaived ? U.todayStr() : null;
        store.write("mycards", myCards);
        return json({ ok: true, assetWaived: mc.assetWaived, assetWaivedDate: mc.assetWaivedDate });
      }
      return void 0;
    }
    __name(handle, "handle");
    function clampDay(v, dflt) {
      const n = Math.round(Number(v));
      if (!isFinite(n) || n < 1) return dflt;
      return Math.min(31, n);
    }
    __name(clampDay, "clampDay");
    var MAX_MONEY = 1e8;
    var MAX_COUNT = 1e6;
    var MAX_IMPORT_CARDS = 500;
    var MAX_IMPORT_RECORDS = 2e4;
    function nonNeg(v, dflt) {
      if (v == null || String(v).trim() === "") return dflt || 0;
      const n = U.parseAmount(v);
      if (!isFinite(n) || n < 0) return dflt || 0;
      return Math.min(MAX_MONEY, n);
    }
    __name(nonNeg, "nonNeg");
    function validCount(v) {
      const n = Math.round(Number(v));
      if (!isFinite(n) || n <= 0) return null;
      return Math.min(MAX_COUNT, n);
    }
    __name(validCount, "validCount");
    function parseBenefitSpec(spec, fallbackNames) {
      const s = String(spec || "").trim();
      if (!s) {
        return normalizeBenefits(void 0, fallbackNames);
      }
      const items = s.split("|").map((seg) => {
        const parts = seg.split(":").map((x) => x.trim());
        const name = parts[0];
        if (!name) return null;
        const total = parts.length > 1 && parts[1] !== "" ? Math.round(Number(parts[1])) : 1;
        return {
          name,
          total: isFinite(total) ? total : 1,
          resetCycle: parts[2] || "\u81EA\u7136\u5E74"
        };
      }).filter(Boolean);
      return normalizeBenefits(items, fallbackNames);
    }
    __name(parseBenefitSpec, "parseBenefitSpec");
    function normalizeBenefits(benefits, fallbackNames) {
      if (Array.isArray(benefits)) {
        return benefits.map((b) => {
          const rawTotal = Math.round(Number(b.total));
          const total = isFinite(rawTotal) ? rawTotal < 0 ? -1 : rawTotal : 1;
          const type = String(b.type || b.benefitType || "").trim();
          const validUntil = U.parseDateStr(b.validUntil) ? String(b.validUntil) : "";
          return {
            // 稳定 id：权益可增删/重排，若使用记录只认索引会整体错位（B 继承 A 的历史）
            id: typeof b.id === "string" && b.id ? b.id : U.uid(),
            name: String(b.name || "").trim() || "\u6743\u76CA",
            type: BENEFIT_TYPES.includes(type) ? type : type || "",
            total,
            resetCycle: RESET_CYCLES.includes(b.resetCycle) ? b.resetCycle : "\u81EA\u7136\u5E74",
            validUntil
          };
        }).filter((b) => b.name);
      }
      return (fallbackNames || []).map((name) => ({ id: U.uid(), name, total: 1, resetCycle: "\u81EA\u7136\u5E74" }));
    }
    __name(normalizeBenefits, "normalizeBenefits");
    function resolveBenefit(mc, idx, bid) {
      const bens = mc.benefits || [];
      if (bid) {
        const i = bens.findIndex((b) => b && b.id === bid);
        if (i < 0) return null;
        return { idx: i, bid: bens[i].id };
      }
      if (!Number.isInteger(idx) || idx < 0 || idx >= bens.length) return null;
      return { idx, bid: bens[idx].id || "" };
    }
    __name(resolveBenefit, "resolveBenefit");
    var notifyChecking = false;
    async function runNotifyChecks(force) {
      if (notifyChecking) return { skipped: true, reason: "\u4E0A\u4E00\u6B21\u63D0\u9192\u68C0\u67E5\u4ECD\u5728\u8FDB\u884C\u4E2D" };
      notifyChecking = true;
      try {
        return await runNotifyChecksInner(force);
      } finally {
        notifyChecking = false;
      }
    }
    __name(runNotifyChecks, "runNotifyChecks");
    async function runNotifyChecksInner(force) {
      const cfg = reminder.normalizeConfig(getNotifyRaw());
      if (!cfg.enabled) return { skipped: true, reason: "\u63D0\u9192\u672A\u542F\u7528" };
      if (!force && cfg.lastCheckAt) {
        const gap = (Date.now() - new Date(cfg.lastCheckAt).getTime()) / 6e4;
        if (gap < cfg.intervalMinutes) return { skipped: true, reason: `\u8DDD\u4E0A\u6B21\u68C0\u67E5 ${Math.round(gap)} \u5206\u949F\uFF0C\u672A\u8FBE ${cfg.intervalMinutes} \u5206\u949F\u95F4\u9694` };
      }
      const idx = buildIndexes();
      const now = NOW();
      const cards = getMyCards().map((m) => computeMyCard(m, now, idx));
      const assetData = { memberships: getMemberships(), vouchers: getVouchers(), knowledge: getKnowledge() };
      const out = await reminder.runChecks(cards, cfg, notifier, now, getBills(), assetData);
      cfg.lastCheckAt = now.toISOString();
      const latest = reminder.normalizeConfig(getNotifyRaw());
      latest.lastCheckAt = cfg.lastCheckAt;
      latest.sentLog = cfg.sentLog;
      latest.history = cfg.history;
      store.write("notify", latest);
      return Object.assign({ skipped: false }, out);
    }
    __name(runNotifyChecksInner, "runNotifyChecksInner");
    function syncMyCardSnapshots() {
      const myCards = getMyCards();
      const byId = new Map(getCards().map((c) => [c.id, c]));
      let changed = false;
      for (const mc of myCards) {
        const c = byId.get(mc.cardId);
        if (!c) continue;
        const before = JSON.stringify(mc);
        mc.bank = c.bank;
        mc.name = c.name;
        mc.org = c.org;
        mc.level = c.level;
        mc.annualFee = c.annualFee;
        mc.waiverType = c.waiverType;
        mc.waiverCondition = c.waiverCondition;
        mc.waiverPolicy = c.waiverPolicy;
        if (JSON.stringify(mc) !== before) changed = true;
      }
      if (changed) store.write("mycards", myCards);
    }
    __name(syncMyCardSnapshots, "syncMyCardSnapshots");
    module.exports = {
      init,
      handle,
      runNotifyChecks,
      _internals: { computeMyCard, computeStats, benefitUsed, benefitHistory, waiverState, normalizeCard, normalizeBenefits, cardKey, buildIndexes, resolveBenefit, sameRepaySchedule, groupAssignError }
    };
  }
});

// src/auth.js
var require_auth = __commonJS({
  "src/auth.js"(exports, module) {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var COOKIE_NAME = "gk_token";
    var SESSION_TTL_S = 30 * 24 * 3600;
    async function sha256(s) {
      const data = new TextEncoder().encode(String(s || ""));
      const digest = await crypto.subtle.digest("SHA-256", data);
      return new Uint8Array(digest);
    }
    __name(sha256, "sha256");
    function constantTimeEqual(a, b) {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      return diff === 0;
    }
    __name(constantTimeEqual, "constantTimeEqual");
    function authEnabled(env2) {
      return String(env2.AUTH_TOKEN || "").length > 0;
    }
    __name(authEnabled, "authEnabled");
    async function checkToken(env2, given) {
      const token = String(env2.AUTH_TOKEN || "");
      if (!token) return false;
      return constantTimeEqual(await sha256(given), await sha256(token));
    }
    __name(checkToken, "checkToken");
    function parseCookies(req) {
      const out = {};
      const raw = req.headers.get("cookie") || "";
      if (!raw) return out;
      for (const part of raw.split(";")) {
        const i = part.indexOf("=");
        if (i < 0) continue;
        const k = part.slice(0, i).trim();
        if (k) {
          try {
            out[k] = decodeURIComponent(part.slice(i + 1).trim());
          } catch (e) {
            out[k] = part.slice(i + 1).trim();
          }
        }
      }
      return out;
    }
    __name(parseCookies, "parseCookies");
    function credentialOf(req, url) {
      const cookies = parseCookies(req);
      if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
      const hdr = req.headers.get("authorization") || "";
      if (hdr.startsWith("Bearer ")) return hdr.slice(7).trim();
      return url && url.searchParams.get("token") || "";
    }
    __name(credentialOf, "credentialOf");
    async function guard(req, url, pathname, env2) {
      if (pathname === "/api/health") return null;
      if (!authEnabled(env2)) {
        return {
          status: 403,
          body: {
            error: "Worker \u672A\u914D\u7F6E AUTH_TOKEN \u73AF\u5883\u53D8\u91CF\u3002\u8BF7\u7528 `wrangler secret put AUTH_TOKEN` \u6216 wrangler.toml [vars] \u914D\u7F6E\u540E\u91CD\u8BD5\u3002",
            needToken: true
          }
        };
      }
      if (await checkToken(env2, credentialOf(req, url))) return null;
      return { status: 401, body: { error: "\u672A\u6388\u6743\uFF1A\u8BF7\u5148\u767B\u5F55", needAuth: true } };
    }
    __name(guard, "guard");
    function sessionCookie(env2) {
      return COOKIE_NAME + "=" + encodeURIComponent(String(env2.AUTH_TOKEN || "")) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + SESSION_TTL_S + "; Secure";
    }
    __name(sessionCookie, "sessionCookie");
    function clearCookie() {
      return COOKIE_NAME + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure";
    }
    __name(clearCookie, "clearCookie");
    function sameOrigin(req) {
      const source = req.headers.get("origin") || req.headers.get("referer");
      if (!source) return true;
      try {
        return new URL(source).host === (req.headers.get("host") || "");
      } catch (e) {
        return false;
      }
    }
    __name(sameOrigin, "sameOrigin");
    function clientIp(req) {
      return req.headers.get("cf-connecting-ip") || "?";
    }
    __name(clientIp, "clientIp");
    module.exports = { authEnabled, checkToken, credentialOf, guard, sessionCookie, clearCookie, sameOrigin, clientIp, COOKIE_NAME };
  }
});

// src/worker.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/do.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var import_store = __toESM(require_store());
var import_time = __toESM(require_time());
var import_routes = __toESM(require_routes());
var GuankaDO = class {
  static {
    __name(this, "GuankaDO");
  }
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
    this.store = new import_store.Store(state);
    this.loginFails = /* @__PURE__ */ new Map();
    globalThis.NOW = import_time.nowBJ;
    globalThis.ENV = env2;
    state.blockConcurrencyWhile(async () => {
      await this.store.warmup();
      import_routes.default.init(this.store);
    });
    this.ready = true;
  }
  async fetch(request) {
    globalThis.ENV = this.env;
    globalThis.NOW = import_time.nowBJ;
    const url = new URL(request.url);
    if (url.pathname === "/__cron/checks") {
      const out = await this.runCronChecks();
      return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
    }
    if (url.pathname.startsWith("/__auth/")) {
      let b = {};
      try {
        b = await request.json();
      } catch (e) {
      }
      const ip = String(b.ip || "?");
      return new Response(JSON.stringify(this.loginGate(url.pathname, ip)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
    return this.handleRequest(request, url);
  }
  /** 登录限流（语义与原版 index.js 一致：5 次失败锁 60 秒） */
  loginGate(action, ip) {
    if (!this.loginFails) this.loginFails = /* @__PURE__ */ new Map();
    const rec = this.loginFails.get(ip) || { count: 0, until: 0 };
    if (action === "/__auth/login-gate") {
      if (rec.until && Date.now() < rec.until) return { locked: true, wait: Math.ceil((rec.until - Date.now()) / 1e3) };
      if (rec.until) {
        rec.until = 0;
        rec.count = 0;
      }
      return { locked: false };
    }
    if (action === "/__auth/login-fail") {
      rec.count++;
      if (rec.count >= 5) {
        rec.until = Date.now() + 6e4;
        rec.count = 0;
      }
      this.loginFails.set(ip, rec);
      return { ok: true };
    }
    this.loginFails.delete(ip);
    return { ok: true };
  }
  /** 处理业务 API 请求（鉴权已在 Worker 层完成） */
  async handleRequest(req, url) {
    const method = req.method;
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch (e) {
      pathname = url.pathname;
    }
    let body = {};
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      const raw = await req.text();
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch (e) {
          return resp(400, { error: "JSON \u89E3\u6790\u5931\u8D25" });
        }
      } else {
        body = raw;
      }
    }
    try {
      const result = await import_routes.default.handle(method, pathname, url, body, {
        // routes.js 的 sameOrigin(plainReq) 只用到这三个头
        headers: {
          origin: req.headers.get("origin"),
          referer: req.headers.get("referer"),
          host: req.headers.get("host")
        }
      });
      await this.store.flush();
      if (result === void 0) return resp(404, { error: "Not found" });
      if (result.shutdown) {
        return resp(200, { ok: true, msg: "Workers \u7248\u65E0\u8FDB\u7A0B\u9000\u51FA\u6982\u5FF5\uFF08\u6570\u636E\u5B9E\u65F6\u6301\u4E45\u5316\uFF09\uFF0C\u5DF2\u5FFD\u7565 shutdown \u6307\u4EE4" });
      }
      if (result.csv !== void 0) {
        return new Response(result.csv, {
          status: 200,
          headers: Object.assign({
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="cards-export.csv"'
          }, result.headers || {})
        });
      }
      if (result.ics !== void 0) {
        return new Response(result.ics, { status: 200, headers: result.headers || {} });
      }
      const status = result.status || 200;
      const isObj = typeof result.body === "object" && result.body !== null;
      const payload = isObj ? JSON.stringify(result.body) : String(result.body == null ? "" : result.body);
      const headers = Object.assign(
        { "Content-Type": isObj ? "application/json; charset=utf-8" : "text/plain; charset=utf-8" },
        result.headers || {}
      );
      return new Response(payload, { status, headers });
    } catch (e) {
      console.error("[\u7BA1\u5361] DO \u8BF7\u6C42\u5904\u7406\u9519\u8BEF:", e && e.stack || e);
      return resp(e && e.status || 500, { error: e && e.message || "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF" });
    }
  }
  /** 提醒检查（Cron 或手动触发共用；force=false 按 notify 配置节流） */
  async runCronChecks() {
    try {
      const out = await import_routes.default.runNotifyChecks(false);
      await this.store.flush();
      if (out && !out.skipped) {
        console.log("[\u7BA1\u5361] \u63D0\u9192\u68C0\u67E5\u5B8C\u6210\uFF1A\u5F85\u63D0\u9192 %d \u9879\uFF0C\u5DF2\u63A8\u9001 %d \u9879", out.checked || 0, out.sent || 0);
      }
      return out;
    } catch (e) {
      console.error("[\u7BA1\u5361] \u63D0\u9192\u68C0\u67E5\u5931\u8D25:", e && e.message || e);
      return { skipped: true, reason: String(e && e.message || e) };
    }
  }
};
function resp(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
__name(resp, "resp");

// src/worker.js
var import_auth = __toESM(require_auth());
function jsonResp(status, obj, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers || {})
  });
}
__name(jsonResp, "jsonResp");
function decodePath(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}
__name(decodePath, "decodePath");
async function getStub(env2) {
  const id = env2.GUANKA_DO.idFromName("guanka-singleton");
  return env2.GUANKA_DO.get(id);
}
__name(getStub, "getStub");
var worker_default = {
  async fetch(request, env2, ctx) {
    globalThis.ENV = env2;
    const url = new URL(request.url);
    const pathname = decodePath(url.pathname);
    const method = request.method;
    if (pathname === "/api/auth/status") {
      const authorized = import_auth.default.authEnabled(env2) ? await import_auth.default.checkToken(env2, import_auth.default.credentialOf(request, url)) : false;
      return jsonResp(200, { authRequired: import_auth.default.authEnabled(env2), authorized });
    }
    if (pathname === "/api/auth/login" && method === "POST") {
      if (!import_auth.default.authEnabled(env2)) return jsonResp(400, { error: "\u670D\u52A1\u672A\u8BBE\u7F6E AUTH_TOKEN\uFF0C\u65E0\u9700\u767B\u5F55" });
      const ip = import_auth.default.clientIp(request);
      const stub = await getStub(env2);
      const gate = await stub.fetch("https://do.internal/__auth/login-gate", {
        method: "POST",
        body: JSON.stringify({ ip, token: "" }),
        headers: { "Content-Type": "application/json" }
      });
      const gateData = await gate.json();
      if (gateData.locked) {
        return jsonResp(429, { error: "\u5C1D\u8BD5\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7 " + gateData.wait + " \u79D2\u540E\u91CD\u8BD5" });
      }
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
      }
      const ok = await import_auth.default.checkToken(env2, String(body && body.token || "").trim());
      if (!ok) {
        await stub.fetch("https://do.internal/__auth/login-fail", {
          method: "POST",
          body: JSON.stringify({ ip }),
          headers: { "Content-Type": "application/json" }
        });
        return jsonResp(401, { error: "\u4EE4\u724C\u4E0D\u6B63\u786E" });
      }
      await stub.fetch("https://do.internal/__auth/login-ok", {
        method: "POST",
        body: JSON.stringify({ ip }),
        headers: { "Content-Type": "application/json" }
      });
      return jsonResp(200, { ok: true }, { "Set-Cookie": import_auth.default.sessionCookie(env2) });
    }
    if (pathname === "/api/auth/logout" && method === "POST") {
      return jsonResp(200, { ok: true }, { "Set-Cookie": import_auth.default.clearCookie() });
    }
    if (pathname.startsWith("/api/")) {
      const blocked = await import_auth.default.guard(request, url, pathname, env2);
      if (blocked) return jsonResp(blocked.status, blocked.body);
      const stub = await getStub(env2);
      const doReq = new Request("https://do.internal" + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: method === "GET" || method === "HEAD" ? void 0 : await request.arrayBuffer()
      });
      return stub.fetch(doReq);
    }
    return env2.ASSETS.fetch(request);
  },
  /** Cron Triggers：每 10 分钟心跳（实际推送节奏由 notify.intervalMinutes 节流，与原版一致） */
  async scheduled(event, env2, ctx) {
    globalThis.ENV = env2;
    ctx.waitUntil((async () => {
      try {
        const stub = await getStub(env2);
        const res = await stub.fetch("https://do.internal/__cron/checks", { method: "POST" });
        const out = await res.json();
        if (out && !out.skipped) console.log("[\u7BA1\u5361] cron \u63D0\u9192\u68C0\u67E5\uFF1A\u5F85\u63D0\u9192 %d\uFF0C\u5DF2\u63A8\u9001 %d", out.checked || 0, out.sent || 0);
        else if (out && out.skipped) console.log("[\u7BA1\u5361] cron \u8DF3\u8FC7\uFF1A" + (out.reason || ""));
      } catch (e) {
        console.error("[\u7BA1\u5361] cron \u5931\u8D25:", e && e.message || e);
      }
    })());
  }
};
export {
  GuankaDO,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
