var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
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
var PerformanceEntry = class {
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
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
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
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
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
var PerformanceObserverEntryList = class {
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
var Performance = class {
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
var PerformanceObserver = class {
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
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
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

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
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
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
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

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
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

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
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

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
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

// ../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
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
} = unenvProcess;
var _process = {
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
var process_default = _process;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker/auth.ts
var DEFAULT_ITERATIONS = 1e5;
var SESSION_DAYS = 30;
var enc = new TextEncoder();
function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64urlEncode, "b64urlEncode");
function b64urlDecode(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - b64.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64urlDecode, "b64urlDecode");
function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64ToBytes, "b64ToBytes");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
__name(hmac, "hmac");
async function derivePasswordHash(password, saltB64, iterations = DEFAULT_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}
__name(derivePasswordHash, "derivePasswordHash");
function parseUsers(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
__name(parseUsers, "parseUsers");
async function verifyCredentials(users, id, password) {
  const user = users.find((u) => u.id.toLowerCase() === id.trim().toLowerCase());
  if (!user) {
    await derivePasswordHash(password, "AAAAAAAAAAAAAAAAAAAAAA==");
    return null;
  }
  const got = await derivePasswordHash(password, user.salt, user.iterations ?? DEFAULT_ITERATIONS);
  return timingSafeEqual(got, b64ToBytes(user.hash)) ? user.id : null;
}
__name(verifyCredentials, "verifyCredentials");
async function issueSession(secret, id) {
  const payload = b64urlEncode(
    enc.encode(JSON.stringify({ id, exp: Date.now() + SESSION_DAYS * 864e5 }))
  );
  return `${payload}.${b64urlEncode(await hmac(secret, payload))}`;
}
__name(issueSession, "issueSession");
async function readSession(secret, token) {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected;
  try {
    expected = await hmac(secret, payload);
  } catch {
    return null;
  }
  let given;
  try {
    given = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (!claims.id || !claims.exp || Date.now() > claims.exp) return null;
    return claims.id;
  } catch {
    return null;
  }
}
__name(readSession, "readSession");
var SESSION_TTL_DAYS = SESSION_DAYS;
async function hashNewPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const b of saltBytes) bin += String.fromCharCode(b);
  const salt = btoa(bin);
  const derived = await derivePasswordHash(password, salt, DEFAULT_ITERATIONS);
  let dbin = "";
  for (const b of derived) dbin += String.fromCharCode(b);
  return { salt, hash: btoa(dbin), iterations: DEFAULT_ITERATIONS };
}
__name(hashNewPassword, "hashNewPassword");
function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
__name(randomSecret, "randomSecret");

// worker/users.ts
function normalizeId(id) {
  return id.trim().toLowerCase();
}
__name(normalizeId, "normalizeId");
function validateId(id) {
  const v = normalizeId(id);
  if (v.length < 3) return "\uC544\uC774\uB514\uB294 3\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.";
  if (v.length > 32) return "\uC544\uC774\uB514\uB294 32\uC790 \uC774\uD558\uB85C \uD574\uC8FC\uC138\uC694.";
  if (!/^[a-z0-9._-]+$/.test(v)) {
    return "\uC544\uC774\uB514\uB294 \uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, \uC810(.), \uBC11\uC904(_), \uD558\uC774\uD508(-) \uB9CC \uC4F8 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
  }
  return null;
}
__name(validateId, "validateId");
function validatePassword(pw) {
  if (pw.length < 8) return "\uBE44\uBC00\uBC88\uD638\uB294 8\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.";
  if (pw.length > 200) return "\uBE44\uBC00\uBC88\uD638\uAC00 \uB108\uBB34 \uAE41\uB2C8\uB2E4.";
  return null;
}
__name(validatePassword, "validatePassword");
function toAccount(row) {
  return {
    id: row.id,
    displayName: row.display_name ?? "",
    role: row.role === "owner" ? "owner" : "staff",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at
  };
}
__name(toAccount, "toAccount");
async function findUser(db, id) {
  const row = await db.prepare("SELECT * FROM admin_users WHERE id = ?").bind(normalizeId(id)).first();
  if (!row) return null;
  return {
    credentials: { id: row.id, salt: row.salt, hash: row.hash, iterations: row.iterations },
    account: toAccount(row)
  };
}
__name(findUser, "findUser");
async function listUsers(db) {
  const { results } = await db.prepare("SELECT * FROM admin_users ORDER BY role = 'owner' DESC, id").all();
  return results.map(toAccount);
}
__name(listUsers, "listUsers");
async function countUsers(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM admin_users").first();
  return row?.n ?? 0;
}
__name(countUsers, "countUsers");
async function countOwners(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'owner'").first();
  return row?.n ?? 0;
}
__name(countOwners, "countOwners");
async function createUser(db, input, now) {
  const id = normalizeId(input.id);
  const { salt, hash, iterations } = await hashNewPassword(input.password);
  await db.prepare(
    `INSERT INTO admin_users
         (id, display_name, salt, hash, iterations, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, input.displayName?.trim() ?? "", salt, hash, iterations, input.role, now, now).run();
  return {
    id,
    displayName: input.displayName?.trim() ?? "",
    role: input.role,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };
}
__name(createUser, "createUser");
async function setPassword(db, id, password, now) {
  const { salt, hash, iterations } = await hashNewPassword(password);
  await db.prepare(
    "UPDATE admin_users SET salt = ?, hash = ?, iterations = ?, updated_at = ? WHERE id = ?"
  ).bind(salt, hash, iterations, now, normalizeId(id)).run();
}
__name(setPassword, "setPassword");
async function deleteUser(db, id) {
  await db.prepare("DELETE FROM admin_users WHERE id = ?").bind(normalizeId(id)).run();
}
__name(deleteUser, "deleteUser");
async function touchLogin(db, id, now) {
  await db.prepare("UPDATE admin_users SET last_login_at = ? WHERE id = ?").bind(now, normalizeId(id)).run();
}
__name(touchLogin, "touchLogin");
async function getGitHubToken(db, override) {
  if (override) return override;
  const row = await db.prepare("SELECT value FROM admin_settings WHERE key = 'gh_token'").first();
  return row?.value ?? null;
}
__name(getGitHubToken, "getGitHubToken");
async function setGitHubToken(db, token) {
  await db.prepare(
    `INSERT INTO admin_settings (key, value) VALUES ('gh_token', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(token).run();
}
__name(setGitHubToken, "setGitHubToken");
async function getSessionSecret(db, override) {
  if (override) return override;
  const row = await db.prepare("SELECT value FROM admin_settings WHERE key = 'session_secret'").first();
  if (row?.value) return row.value;
  const created = randomSecret();
  await db.prepare("INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('session_secret', ?)").bind(created).run();
  const settled = await db.prepare("SELECT value FROM admin_settings WHERE key = 'session_secret'").first();
  return settled?.value ?? created;
}
__name(getSessionSecret, "getSessionSecret");

// worker/index.ts
var KEY_RE = /^[a-z0-9_\-./]+$/i;
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders, "corsHeaders");
async function verifyGitHubPat(pat) {
  try {
    const r = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${pat}`,
        "User-Agent": "nj-safety-uploader",
        Accept: "application/vnd.github+json"
      }
    });
    if (!r.ok) return { ok: false, reason: `github ${r.status}` };
    const data = await r.json();
    if (!data.login) return { ok: false, reason: "no login on github response" };
    return { ok: true, login: data.login };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
__name(verifyGitHubPat, "verifyGitHubPat");
var GH_REPO_OWNER = "bangbongfather-sys";
var GH_REPO_NAME = "nj-safety-website";
function requireDb(env2) {
  return env2.ADMIN_DB ?? null;
}
__name(requireDb, "requireDb");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function bearerToken(req) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("token ")) return null;
  const t = auth.slice(6).trim();
  return t || null;
}
__name(bearerToken, "bearerToken");
function looksLikeSession(token) {
  return token.includes(".");
}
__name(looksLikeSession, "looksLikeSession");
async function authenticate(req, env2) {
  const token = bearerToken(req);
  if (!token) {
    return {
      ok: false,
      res: new Response("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.", { status: 401, headers: corsHeaders() })
    };
  }
  const db = requireDb(env2);
  if (db && looksLikeSession(token)) {
    const secret = await getSessionSecret(db, env2.SESSION_SECRET);
    const id = await readSession(secret, token);
    if (!id) {
      return {
        ok: false,
        res: new Response("\uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.", {
          status: 401,
          headers: corsHeaders()
        })
      };
    }
    const found = await findUser(db, id);
    if (!found) {
      return {
        ok: false,
        res: new Response("\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.", {
          status: 401,
          headers: corsHeaders()
        })
      };
    }
    const ghToken = await getGitHubToken(db, env2.ADMIN_GH_PAT);
    if (!ghToken) {
      return {
        ok: false,
        res: new Response(
          "\uC11C\uBC84\uC5D0 GitHub \uD1A0\uD070\uC774 \uC800\uC7A5\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC544 \uC218\uC815 \uB0B4\uC6A9\uC744 \uC800\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790 \uC124\uC815\uC5D0\uC11C \uD1A0\uD070\uC744 \uD55C \uBC88 \uC800\uC7A5\uD574 \uC8FC\uC138\uC694.",
          { status: 500, headers: corsHeaders() }
        )
      };
    }
    return {
      ok: true,
      auth: { id: found.account.id, ghToken, mode: "session", role: found.account.role }
    };
  }
  const verify = await verifyGitHubPat(token);
  if (!verify.ok) {
    return {
      ok: false,
      res: new Response(`\uC778\uC99D \uC2E4\uD328: ${verify.reason}`, { status: 401, headers: corsHeaders() })
    };
  }
  const allowed = env2.ADMIN_GH_LOGIN || "bangbongfather-sys";
  if (verify.login !== allowed) {
    return {
      ok: false,
      res: new Response(`\uAD8C\uD55C \uC5C6\uC74C: ${verify.login} (\uD544\uC694: ${allowed})`, {
        status: 403,
        headers: corsHeaders()
      })
    };
  }
  return { ok: true, auth: { id: verify.login, ghToken: token, mode: "pat", role: "owner" } };
}
__name(authenticate, "authenticate");
async function requireAdmin(req, env2) {
  const r = await authenticate(req, env2);
  return r.ok ? null : r.res;
}
__name(requireAdmin, "requireAdmin");
async function handleLogin(req, env2) {
  const db = requireDb(env2);
  if (!db) {
    return json({ ok: false, error: "\uC544\uC774\uB514 \uB85C\uADF8\uC778\uC774 \uC544\uC9C1 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." }, 503);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "\uC798\uBABB\uB41C \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 400);
  }
  const id = (body.id ?? "").trim();
  const password = body.password ?? "";
  if (!id || !password) {
    return json({ ok: false, error: "\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694." }, 400);
  }
  const found = await findUser(db, id);
  const candidates = found ? [found.credentials] : parseUsers(env2.ADMIN_USERS);
  const matched = await verifyCredentials(candidates, id, password);
  if (!matched) {
    return json({ ok: false, error: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 401);
  }
  const secret = await getSessionSecret(db, env2.SESSION_SECRET);
  const token = await issueSession(secret, matched);
  if (found) await touchLogin(db, matched, nowIso());
  return json({
    ok: true,
    token,
    id: matched,
    role: found?.account.role ?? "owner",
    days: SESSION_TTL_DAYS
  });
}
__name(handleLogin, "handleLogin");
async function handleUserList(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  return json({
    ok: true,
    me: { id: r.auth.id, role: r.auth.role, mode: r.auth.mode },
    users: await listUsers(db)
  });
}
__name(handleUserList, "handleUserList");
async function handleUserCreate(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "\uC798\uBABB\uB41C \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 400);
  }
  const id = (body.id ?? "").trim();
  const password = body.password ?? "";
  const idErr = validateId(id);
  if (idErr) return json({ ok: false, error: idErr }, 400);
  const pwErr = validatePassword(password);
  if (pwErr) return json({ ok: false, error: pwErr }, 400);
  const existing = await countUsers(db);
  if (existing > 0 && r.auth.role !== "owner") {
    return json({ ok: false, error: "\uC9C1\uC6D0 \uACC4\uC815\uC740 \uB300\uD45C \uACC4\uC815\uB9CC \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403);
  }
  if (await findUser(db, id)) {
    return json({ ok: false, error: "\uC774\uBBF8 \uC788\uB294 \uC544\uC774\uB514\uC785\uB2C8\uB2E4." }, 409);
  }
  const role = existing === 0 ? "owner" : body.role === "owner" ? "owner" : "staff";
  const account = await createUser(
    db,
    { id, password, displayName: body.displayName, role },
    nowIso()
  );
  return json({ ok: true, user: account });
}
__name(handleUserCreate, "handleUserCreate");
async function handleUserPassword(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "\uC798\uBABB\uB41C \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 400);
  }
  const target = (body.id ?? r.auth.id).trim();
  const password = body.password ?? "";
  const pwErr = validatePassword(password);
  if (pwErr) return json({ ok: false, error: pwErr }, 400);
  const isSelf = target.toLowerCase() === r.auth.id.toLowerCase();
  if (!isSelf && r.auth.role !== "owner") {
    return json({ ok: false, error: "\uB2E4\uB978 \uC0AC\uB78C\uC758 \uBE44\uBC00\uBC88\uD638\uB294 \uB300\uD45C \uACC4\uC815\uB9CC \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403);
  }
  const found = await findUser(db, target);
  if (!found) return json({ ok: false, error: "\uC5C6\uB294 \uACC4\uC815\uC785\uB2C8\uB2E4." }, 404);
  if (isSelf && r.auth.mode === "session") {
    const ok = await verifyCredentials([found.credentials], target, body.currentPassword ?? "");
    if (!ok) return json({ ok: false, error: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 401);
  }
  await setPassword(db, target, password, nowIso());
  return json({ ok: true });
}
__name(handleUserPassword, "handleUserPassword");
async function handleGhTokenSave(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  if (r.auth.role !== "owner") {
    return json({ ok: false, error: "\uB300\uD45C \uACC4\uC815\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "\uC798\uBABB\uB41C \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 400);
  }
  const token = (body.token ?? "").trim();
  if (!token) return json({ ok: false, error: "\uD1A0\uD070\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694." }, 400);
  const verify = await verifyGitHubPat(token);
  if (!verify.ok) {
    return json({ ok: false, error: `GitHub \uC774 \uC774 \uD1A0\uD070\uC744 \uAC70\uBD80\uD588\uC2B5\uB2C8\uB2E4: ${verify.reason}` }, 400);
  }
  const allowed = env2.ADMIN_GH_LOGIN || "bangbongfather-sys";
  if (verify.login !== allowed) {
    return json({ ok: false, error: `\uC774 \uC800\uC7A5\uC18C\uC758 \uD1A0\uD070\uC774 \uC544\uB2D9\uB2C8\uB2E4 (${verify.login}).` }, 400);
  }
  await setGitHubToken(db, token);
  return json({ ok: true, login: verify.login });
}
__name(handleGhTokenSave, "handleGhTokenSave");
async function handleGhTokenStatus(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  const token = await getGitHubToken(db, env2.ADMIN_GH_PAT);
  return json({
    ok: true,
    saved: Boolean(token),
    source: env2.ADMIN_GH_PAT ? "secret" : token ? "database" : null
  });
}
__name(handleGhTokenStatus, "handleGhTokenStatus");
async function handleUserDelete(req, env2, url) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const db = requireDb(env2);
  if (!db) return json({ ok: false, error: "\uACC4\uC815 \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 503);
  if (r.auth.role !== "owner") {
    return json({ ok: false, error: "\uACC4\uC815 \uC0AD\uC81C\uB294 \uB300\uD45C \uACC4\uC815\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403);
  }
  const target = (url.searchParams.get("id") ?? "").trim();
  if (!target) return json({ ok: false, error: "\uC9C0\uC6B8 \uACC4\uC815\uC744 \uC9C0\uC815\uD574 \uC8FC\uC138\uC694." }, 400);
  if (target.toLowerCase() === r.auth.id.toLowerCase()) {
    return json({ ok: false, error: "\uC790\uAE30 \uACC4\uC815\uC740 \uC9C0\uC6B8 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 400);
  }
  const found = await findUser(db, target);
  if (!found) return json({ ok: false, error: "\uC5C6\uB294 \uACC4\uC815\uC785\uB2C8\uB2E4." }, 404);
  if (found.account.role === "owner" && await countOwners(db) <= 1) {
    return json({ ok: false, error: "\uB9C8\uC9C0\uB9C9 \uB300\uD45C \uACC4\uC815\uC740 \uC9C0\uC6B8 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 400);
  }
  await deleteUser(db, target);
  return json({ ok: true });
}
__name(handleUserDelete, "handleUserDelete");
async function handleSession(req, env2) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  return json({ ok: true, id: r.auth.id, mode: r.auth.mode, role: r.auth.role });
}
__name(handleSession, "handleSession");
async function handleGitHubProxy(req, env2, url) {
  const r = await authenticate(req, env2);
  if (!r.ok) return r.res;
  const rest = url.pathname.slice("/api/admin/gh".length);
  if (rest.includes("..")) {
    return new Response("Invalid path", { status: 400, headers: corsHeaders() });
  }
  const target = `https://api.github.com/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}${rest}${url.search}`;
  const headers = new Headers({
    Authorization: `token ${r.auth.ghToken}`,
    Accept: req.headers.get("Accept") || "application/vnd.github+json",
    "User-Agent": "nj-safety-admin"
  });
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : void 0
  });
  const out = new Headers(corsHeaders());
  const upstreamCt = upstream.headers.get("Content-Type");
  if (upstreamCt) out.set("Content-Type", upstreamCt);
  out.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
__name(handleGitHubProxy, "handleGitHubProxy");
async function handleUpload(req, env2) {
  const denied = await requireAdmin(req, env2);
  if (denied) return denied;
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response("Missing ?key=", { status: 400, headers: corsHeaders() });
  }
  if (!KEY_RE.test(key) || key.includes("..")) {
    return new Response(`Invalid key: ${key}`, { status: 400, headers: corsHeaders() });
  }
  const blob = await req.arrayBuffer();
  if (blob.byteLength === 0) {
    return new Response("Empty body", { status: 400, headers: corsHeaders() });
  }
  if (blob.byteLength > 20 * 1024 * 1024) {
    return new Response("File too large (max 20 MB)", { status: 413, headers: corsHeaders() });
  }
  const contentType = req.headers.get("Content-Type") ?? "application/octet-stream";
  try {
    await env2.IMAGES_R2.put(key, blob, { httpMetadata: { contentType } });
  } catch (e) {
    return new Response(`R2 put failed: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: corsHeaders()
    });
  }
  const base = (env2.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const publicUrl = `${base}/${key}`;
  return new Response(JSON.stringify({ ok: true, key, publicUrl, size: blob.byteLength }), {
    status: 200,
    headers: { ...corsHeaders(), "Content-Type": "application/json" }
  });
}
__name(handleUpload, "handleUpload");
var INQUIRY_LABELS = {
  quote: "\uC81C\uD488\xB7\uACAC\uC801 \uBB38\uC758",
  b2b: "B2B \uB2E8\uCCB4 \uC8FC\uBB38",
  oem: "OEM\xB7ODM \uC81C\uC791",
  cert: "\uC778\uC99D\uC11C\xB7\uC2DC\uD5D8\uC131\uC801\uC11C",
  as: "A/S\xB7\uAD50\uD658\xB7\uBC18\uD488"
};
var ALLOWED_EXTS = /\.(pdf|jpe?g|png|webp|gif|ai|eps|zip|svg|heic)$/i;
var MAX_FILE_BYTES = 20 * 1024 * 1024;
var MAX_FILES = 5;
function sanitizeFilename(name) {
  return name.replace(/[\\/]/g, "-").replace(/[\x00-\x1f<>:"|?*]+/g, "").replace(/\s+/g, "-").slice(0, 80);
}
__name(sanitizeFilename, "sanitizeFilename");
var INBOX_PREFIX = "inquiries/";
var DEFAULT_CONTACT_TO = "njsafety91@naver.com";
var DEFAULT_RESEND_FROM = "NJ SAFETY \uBB38\uC758 <onboarding@resend.dev>";
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHtml, "escapeHtml");
async function notifyNewInquiry(env2, r) {
  if (!env2.RESEND_API_KEY) return;
  const rows = [
    ["\uBB38\uC758 \uC720\uD615", r.inquiryLabel],
    ["\uD68C\uC0AC\uBA85", r.company],
    ["\uB2F4\uB2F9\uC790", r.contactName],
    ["\uC5F0\uB77D\uCC98", r.phone],
    ["\uC774\uBA54\uC77C", r.email]
  ];
  const when = new Date(r.receivedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const inboxUrl = "https://njfashion.co.kr/admin/inquiries/";
  const textBody = [
    `\uC0C8 \uBB38\uC758\uAC00 \uC811\uC218\uB418\uC5C8\uC2B5\uB2C8\uB2E4 \u2014 ${r.inquiryLabel}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `\uC811\uC218 \uC2DC\uAC01: ${when}`,
    "",
    "\u2500\u2500 \uBB38\uC758 \uB0B4\uC6A9 \u2500\u2500",
    r.message,
    ...r.attachments.length ? ["", "\u2500\u2500 \uCCA8\uBD80 \u2500\u2500", ...r.attachments.map((a) => `${a.name}: ${a.url}`)] : [],
    "",
    `\uC811\uC218\uD568\uC5D0\uC11C \uBCF4\uAE30: ${inboxUrl}`
  ].join("\n");
  const htmlBody = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;color:#1c1c1e"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden"><div style="background:#1c1c1e;color:#fff;padding:20px 24px"><div style="font-size:12px;letter-spacing:.18em;color:#ff6b1a">NEW INQUIRY</div><div style="font-size:20px;font-weight:700;margin-top:6px">${escapeHtml(r.inquiryLabel)}</div></div><div style="padding:24px"><table style="width:100%;border-collapse:collapse;font-size:14px">` + rows.map(
    ([k, v]) => `<tr><td style="padding:8px 0;color:#71717a;width:96px">${escapeHtml(k)}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(v)}</td></tr>`
  ).join("") + `<tr><td style="padding:8px 0;color:#71717a">\uC811\uC218 \uC2DC\uAC01</td><td style="padding:8px 0">${escapeHtml(when)}</td></tr></table><div style="margin-top:20px;padding:16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(r.message)}</div>` + (r.attachments.length ? `<div style="margin-top:16px;font-size:13px"><b>\uCCA8\uBD80</b><br>` + r.attachments.map(
    (a) => `<a href="${escapeHtml(a.url)}" style="color:#ff6b1a">${escapeHtml(a.name)}</a>`
  ).join("<br>") + `</div>` : "") + `<a href="${inboxUrl}" style="display:inline-block;margin-top:24px;background:#ff6b1a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:4px">\uC811\uC218\uD568\uC5D0\uC11C \uBCF4\uAE30 \u2192</a></div></div></body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env2.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env2.RESEND_FROM || DEFAULT_RESEND_FROM,
        to: [env2.CONTACT_TO || DEFAULT_CONTACT_TO],
        subject: `[NJ SAFETY \uBB38\uC758] ${r.company} \xB7 ${r.inquiryLabel}`,
        text: textBody,
        html: htmlBody,
        // Replying in the mail client goes straight to the customer.
        reply_to: `${r.contactName} <${r.email}>`
      })
    });
    if (!res.ok) {
      console.error("inquiry mail failed:", res.status, (await res.text()).slice(0, 300));
    }
  } catch (e) {
    console.error("inquiry mail error:", e instanceof Error ? e.message : String(e));
  }
}
__name(notifyNewInquiry, "notifyNewInquiry");
async function handleContact(req, env2, ctx) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid form data" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }
  const get = /* @__PURE__ */ __name((k) => String(form.get(k) ?? "").trim(), "get");
  const data = {
    inquiry_type: get("inquiry_type") || "quote",
    company: get("company"),
    contact_name: get("contact_name"),
    phone: get("phone"),
    email: get("email"),
    message: get("message"),
    agreed: form.get("agreed") === "on" || form.get("agreed") === "true"
  };
  const required = [
    ["company", "\uD68C\uC0AC\uBA85"],
    ["contact_name", "\uB2F4\uB2F9\uC790\uBA85"],
    ["phone", "\uC5F0\uB77D\uCC98"],
    ["email", "\uC774\uBA54\uC77C"],
    ["message", "\uBB38\uC758 \uB0B4\uC6A9"]
  ];
  const missing = required.filter(([k]) => !data[k]).map(([, label]) => label);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ ok: false, error: `\uD544\uC218 \uD56D\uBAA9 \uB204\uB77D: ${missing.join(", ")}` }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  if (!data.agreed) {
    return new Response(
      JSON.stringify({ ok: false, error: "\uAC1C\uC778\uC815\uBCF4 \uC218\uC9D1 \uC57D\uAD00\uC5D0 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694." }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    return new Response(
      JSON.stringify({ ok: false, error: "\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4." }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  const base = (env2.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const attachments = [];
  const files = form.getAll("attachments").filter((v) => v instanceof File && v.size > 0);
  if (files.length > MAX_FILES) {
    return new Response(
      JSON.stringify({ ok: false, error: `\uCCA8\uBD80 \uD30C\uC77C\uC740 \uCD5C\uB300 ${MAX_FILES}\uAC1C\uAE4C\uC9C0 \uAC00\uB2A5\uD569\uB2C8\uB2E4.` }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ ok: false, error: `\uD30C\uC77C '${f.name}'\uC774 20MB\uB97C \uCD08\uACFC\uD569\uB2C8\uB2E4.` }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
    if (!ALLOWED_EXTS.test(f.name)) {
      return new Response(
        JSON.stringify({ ok: false, error: `\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uD655\uC7A5\uC790: '${f.name}'` }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
    const ts = Date.now();
    const safe = sanitizeFilename(f.name);
    const dayKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const key = `contact/${dayKey}/${ts}-${safe}`;
    try {
      await env2.IMAGES_R2.put(key, await f.arrayBuffer(), {
        httpMetadata: { contentType: f.type || "application/octet-stream" }
      });
      attachments.push({ name: f.name, url: `${base}/${key}`, size: f.size });
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: `R2 \uC5C5\uB85C\uB4DC \uC2E4\uD328: ${e instanceof Error ? e.message : String(e)}` }),
        { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
  }
  const receivedAt = (/* @__PURE__ */ new Date()).toISOString();
  const id = `${receivedAt.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    receivedAt,
    status: "new",
    inquiryType: data.inquiry_type,
    inquiryLabel: INQUIRY_LABELS[data.inquiry_type] ?? data.inquiry_type,
    company: data.company,
    contactName: data.contact_name,
    phone: data.phone,
    email: data.email,
    message: data.message,
    attachments
  };
  try {
    await env2.IMAGES_R2.put(`${INBOX_PREFIX}${id}.json`, JSON.stringify(record), {
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
    console.log("inquiry stored:", `${INBOX_PREFIX}${id}.json`);
    ctx.waitUntil(notifyNewInquiry(env2, record));
  } catch (e) {
    console.error("inquiry store failed:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "\uBB38\uC758 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC2DC\uAC70\uB098 02-777-3079 \uB85C \uC5F0\uB77D \uC8FC\uC138\uC694."
      }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ ok: true, attachments: attachments.length }),
    { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
  );
}
__name(handleContact, "handleContact");
var CANONICAL_HOST = "njfashion.co.kr";
var ALIAS_HOSTS = /* @__PURE__ */ new Set(["www.njfashion.co.kr", "m.njfashion.co.kr"]);
function canonicalHostRedirect(url) {
  if (!ALIAS_HOSTS.has(url.hostname)) return null;
  const target = new URL(url.toString());
  target.hostname = CANONICAL_HOST;
  return Response.redirect(target.toString(), 301);
}
__name(canonicalHostRedirect, "canonicalHostRedirect");
var LEGACY_REDIRECTS = {
  "/pages/about": "/ko/about",
  "/pages/history": "/ko/about",
  "/pages/service": "/ko/products",
  "/pages/contact": "/ko/contact",
  // Named "news" by the page builder but titled 자료실 on the old site —
  // a board of 시험성적서 · 사이즈표 · E-카탈로그. The Naver sitelink for it
  // still reads 자료실, so it has to land on the resources page, not
  // 공지사항. (Verified against the pre-migration capture in
  // ~/클로드/njfashion-backup/screenshots/pages-news.png.)
  "/pages/news": "/ko/resources",
  // The old builder's home. Not covered by any keyword rule below —
  // "main" says nothing about what the visitor wanted.
  "/main": "/ko",
  // Shop/account pages that no longer exist. The footer linked the two
  // policy pages on every page, so they are the likeliest to be indexed;
  // privacy is the only equivalent the new site has.
  "/members/policy": "/ko/privacy",
  "/members/terms": "/ko/privacy"
};
var LEGACY_DEAD_PREFIXES = ["/members", "/mypages", "/cart"];
var LEGACY_KEYWORD_RULES = [
  [/size|사이즈|치수/i, "/ko/resources/size-guide"],
  [/test.?report|성적서|시험/i, "/ko/resources/test-reports"],
  [/dealer|agency|store|대리점|판매|매장/i, "/ko/dealers"],
  // 자료실 before 공지사항: board builders route every board through the
  // same `/bbs/board.php`, so the generic word "board" says nothing —
  // the table name in the query (`bo_table=data`) is the real signal.
  [/data|pds|download|catalog|자료|다운로드|카탈로그/i, "/ko/resources"],
  [/notice|news|공지|소식|뉴스/i, "/ko/notices"],
  [/contact|inquir|estimate|qna|문의|견적|상담/i, "/ko/contact"],
  [/histor|연혁/i, "/ko/about"],
  [/about|company|intro|greeting|ceo|회사|소개|인사/i, "/ko/about"],
  // Season lines and every other product-ish word land on the catalogue.
  [/summer|winter|spring|하계|동계|춘추|방한|여름|겨울/i, "/ko/products"],
  [/product|item|goods|service|shop|제품|상품|방염|작업복|용접/i, "/ko/products"]
];
function decodePath(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
__name(decodePath, "decodePath");
function legacyRedirect(url) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p.startsWith("/ko") || p.startsWith("/en") || p.startsWith("/api")) {
    return null;
  }
  const mapped = LEGACY_REDIRECTS[p];
  let target = mapped ?? (/^\/categories\/\d+$/.test(p) ? "/ko/products" : null);
  if (!target && LEGACY_DEAD_PREFIXES.some((d) => p === d || p.startsWith(`${d}/`))) {
    target = "/ko";
  }
  if (!target) {
    const haystack = decodePath(p + url.search);
    for (const [re, dest] of LEGACY_KEYWORD_RULES) {
      if (re.test(haystack)) {
        target = dest;
        break;
      }
    }
  }
  if (!target) return null;
  return Response.redirect(`${url.origin}${target}/`, 301);
}
__name(legacyRedirect, "legacyRedirect");
function isPageRequest(req, url) {
  if (url.pathname.startsWith("/api/")) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return false;
  return (req.headers.get("accept") ?? "").includes("text/html");
}
__name(isPageRequest, "isPageRequest");
var INQUIRY_ID_RE = /^[0-9TZa-z-]{1,80}$/;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    // no-store: 로그인 응답과 접수함 목록 모두 캐시되면 곤란하다.
    headers: { ...corsHeaders(), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(json, "json");
async function handleInquiryList(req, env2) {
  const denied = await requireAdmin(req, env2);
  if (denied) return denied;
  const items = [];
  let cursor;
  do {
    const page = await env2.IMAGES_R2.list({ prefix: INBOX_PREFIX, limit: 1e3, cursor });
    const bodies = await Promise.all(page.objects.map((o) => env2.IMAGES_R2.get(o.key)));
    for (const body of bodies) {
      if (!body) continue;
      try {
        items.push(JSON.parse(await body.text()));
      } catch {
        console.error("inquiry parse failed:", body.key);
      }
    }
    cursor = page.truncated ? page.cursor : void 0;
  } while (cursor);
  items.sort((a, b) => a.receivedAt < b.receivedAt ? 1 : -1);
  return json({ ok: true, items });
}
__name(handleInquiryList, "handleInquiryList");
async function handleInquiryStatus(req, env2) {
  const denied = await requireAdmin(req, env2);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const id = body.id ?? "";
  const status = body.status;
  if (!INQUIRY_ID_RE.test(id)) return json({ ok: false, error: "invalid id" }, 400);
  if (status !== "new" && status !== "done") return json({ ok: false, error: "invalid status" }, 400);
  const key = `${INBOX_PREFIX}${id}.json`;
  const existing = await env2.IMAGES_R2.get(key);
  if (!existing) return json({ ok: false, error: "not found" }, 404);
  const record = JSON.parse(await existing.text());
  record.status = status;
  await env2.IMAGES_R2.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  return json({ ok: true, item: record });
}
__name(handleInquiryStatus, "handleInquiryStatus");
async function handleInquiryDelete(req, env2) {
  const denied = await requireAdmin(req, env2);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!INQUIRY_ID_RE.test(id)) return json({ ok: false, error: "invalid id" }, 400);
  await env2.IMAGES_R2.delete(`${INBOX_PREFIX}${id}.json`);
  return json({ ok: true });
}
__name(handleInquiryDelete, "handleInquiryDelete");
var worker_default = {
  async fetch(req, env2, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method === "GET" || req.method === "HEAD") {
      const hostRedirect = canonicalHostRedirect(url);
      if (hostRedirect) return hostRedirect;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      const redirect = legacyRedirect(url);
      if (redirect) return redirect;
    }
    if (url.pathname === "/api/admin/login" && req.method === "POST") {
      return handleLogin(req, env2);
    }
    if (url.pathname === "/api/admin/session" && req.method === "GET") {
      return handleSession(req, env2);
    }
    if (url.pathname === "/api/admin/users") {
      if (req.method === "GET") return handleUserList(req, env2);
      if (req.method === "POST") return handleUserCreate(req, env2);
      if (req.method === "DELETE") return handleUserDelete(req, env2, url);
    }
    if (url.pathname === "/api/admin/gh-token") {
      if (req.method === "GET") return handleGhTokenStatus(req, env2);
      if (req.method === "POST") return handleGhTokenSave(req, env2);
    }
    if (url.pathname === "/api/admin/users/password" && req.method === "POST") {
      return handleUserPassword(req, env2);
    }
    if (url.pathname.startsWith("/api/admin/gh/")) {
      return handleGitHubProxy(req, env2, url);
    }
    if (url.pathname === "/api/admin/upload-image" && req.method === "PUT") {
      return handleUpload(req, env2);
    }
    if (url.pathname === "/api/admin/inquiries") {
      if (req.method === "GET") return handleInquiryList(req, env2);
      if (req.method === "DELETE") return handleInquiryDelete(req, env2);
    }
    if (url.pathname === "/api/admin/inquiries/status" && req.method === "POST") {
      return handleInquiryStatus(req, env2);
    }
    if (url.pathname === "/api/contact" && req.method === "POST") {
      return handleContact(req, env2, ctx);
    }
    if (url.pathname === "/products-index.json" && req.method === "GET") {
      const res2 = await env2.ASSETS.fetch(req);
      const headers = new Headers(res2.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "public, max-age=300");
      return new Response(res2.body, { status: res2.status, headers });
    }
    const res = await env2.ASSETS.fetch(req);
    if (res.status === 404 && (req.method === "GET" || req.method === "HEAD") && isPageRequest(req, url)) {
      return Response.redirect(`${url.origin}/`, 302);
    }
    return res;
  }
};

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-QQB46Q/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-QQB46Q/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
