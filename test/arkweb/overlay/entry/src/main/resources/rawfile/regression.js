/* This harness runs inside real ArkWeb. It never substitutes a native bridge. */
(function () {
  'use strict';
  var mode = window.REGRESSION_MODE;
  var started = Date.now();
  var cases = [];
  var jsErrors = [];
  var timeoutMs = 5000;

  function errorText(error) { return error && error.message ? error.message : String(error); }
  window.addEventListener('error', function (event) {
    jsErrors.push(event.message || 'Unknown JavaScript error');
  });
  window.addEventListener('unhandledrejection', function (event) {
    jsErrors.push(errorText(event.reason));
  });
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function assert(condition, detail) { if (!condition) { throw new Error(detail); } }
  function equal(actual, expected, label) {
    assert(actual === expected, label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
  function call(method, data, callback) { return window.dsBridge.call(method, data, callback); }
  function reset() { equal(call('reset', {}), 'reset', 'native reset'); }
  function stats() { return JSON.parse(call('stats', {})); }
  function append(entry) {
    var node = document.createElement('li');
    node.className = entry.status;
    node.textContent = entry.status.toUpperCase() + ': ' + entry.name + (entry.error ? ' — ' + entry.error : '');
    document.getElementById('cases').appendChild(node);
  }
  async function test(name, run) {
    var start = Date.now();
    var entry = { name: name, status: 'pass', durationMs: 0 };
    try { await run(); } catch (error) { entry.status = 'fail'; entry.error = errorText(error); }
    entry.durationMs = Date.now() - start;
    cases.push(entry);
    append(entry);
  }
  function callbackKeys() {
    return Object.keys(window).filter(function (key) { return /^dscall\d+$|^dscb\d+$/.test(key); });
  }
  function asyncCall(method, data, onProgress) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('Native callback missing after ' + timeoutMs + 'ms')); }, timeoutMs);
      try {
        call(method, data, function (value) {
          if (typeof value === 'string' && value.indexOf('working:') === 0) {
            if (onProgress) { onProgress(value); }
            return;
          }
          clearTimeout(timer);
          resolve(value);
        });
      } catch (error) { clearTimeout(timer); reject(error); }
    });
  }
  async function assertMismatch(method) {
    reset();
    var callbacks = 0;
    var result = call(method, { value: 1 }, function () { callbacks++; });
    await wait(80);
    equal(callbacks, 0, 'rejected call must not dispatch callback');
    var state = stats();
    equal(state.syncCalls, 0, 'rejected call must not invoke sync native business method');
    equal(state.asyncCalls, 0, 'rejected call must not invoke async native business method');
    equal(state.errors.length, 1, 'error listener must run exactly once');
    var error = state.errors[0];
    assert(error.indexOf('call failed: ' + method + ' is registered with @JavaScriptInterface(false)') === 0,
      'diagnostic must include full method / namespace and actual native annotation');
    assert(error.indexOf('dsBridge.call("' + method + '", data) without a callback') >= 0,
      'diagnostic must give the exact sync call correction');
    assert(error.indexOf('@JavaScriptInterface() and CompleteHandler') >= 0,
      'diagnostic must give the async registration correction');
    if (mode === 'DS3') {
      equal(result, undefined, 'DS3 wrapper exposes undefined on rejected invocation');
    } else {
      var rejection = JSON.parse(result);
      equal(rejection.code, -1, 'DS2 rejection code');
      equal(rejection.errMsg, error, 'DS2 result and error listener must agree');
    }
  }

  async function run() {
    document.getElementById('state').textContent = 'Running inside ArkWeb: ' + mode;
    await test('real ArkWeb proxy and bundled bridge ready', async function () {
      var until = Date.now() + 4000;
      while ((!window._dsbridge || !window.dsBridge) && Date.now() < until) { await wait(40); }
      assert(window._dsbridge && typeof window._dsbridge.call === 'function', 'Real JavaScriptProxy _dsbridge.call is unavailable');
      assert(window.dsBridge && typeof window.dsBridge.call === 'function', 'Bundled dsBridge.call is unavailable');
      equal(call('reset', {}), 'reset', 'sync proxy handshake');
    });
    await test('sync object parameters preserve documented mode', function () {
      reset();
      equal(call('sync', { value: 1 }), 'sync:{"value":1}', 'object parameter result');
      var state = stats();
      equal(state.syncCalls, 1, 'sync native call count');
      equal(state.lastInput, '{"value":1}', 'native receives expected JSON business payload');
      equal(state.errors.length, 0, 'no native diagnostic for valid sync');
    });
    await test('sync native with JS callback rejected before invocation', function () { return assertMismatch('sync'); });
    if (mode === 'DS3') {
      await test('namespaced sync callback mismatch reports full namespace', function () { return assertMismatch('shop.orders.sync'); });
      await test('namespaced valid sync still works', function () {
        reset();
        equal(call('shop.orders.sync', { value: 2 }), 'sync:{"value":2}', 'namespace sync');
        equal(stats().syncCalls, 1, 'namespace business invocation');
      });
    }
    await test('normal async native callback and payload', async function () {
      reset();
      equal(await asyncCall('delayed', { value: 'normal', delay: 40 }), 'done:normal', 'async result');
      var state = stats();
      equal(state.asyncCalls, 1, 'async native call count');
      equal(state.completedCalls, 1, 'native completion count');
      equal(JSON.parse(state.lastInput).value, 'normal', 'async business value');
      assert(state.lastInput.indexOf('_dscbstub') < 0, 'internal callback stub must not leak into native business parameters');
      equal(state.errors.length, 0, 'no native diagnostic for valid async');
    });
    await test('async progress precedes completion and completed stub is removed', async function () {
      reset();
      var before = callbackKeys();
      var values = [];
      var result = await asyncCall('delayed', { value: 'progress', delay: 60, progress: true }, function (value) { values.push(value); });
      values.push(result);
      equal(JSON.stringify(values), '["working:progress","done:progress"]', 'progress then complete');
      await wait(25);
      equal(JSON.stringify(callbackKeys().sort()), JSON.stringify(before.sort()), 'complete deletes only its callback stub');
    });
    await test('concurrent async callbacks preserve out-of-order values', async function () {
      reset();
      var order = [];
      var first = asyncCall('delayed', { value: 'first', delay: 150 }).then(function (value) { order.push(value); return value; });
      var second = asyncCall('delayed', { value: 'second', delay: 30 }).then(function (value) { order.push(value); return value; });
      var result = await Promise.all([first, second]);
      equal(JSON.stringify(result), '["done:first","done:second"]', 'each promise owns its result');
      equal(JSON.stringify(order), '["done:second","done:first"]', 'completion order reflects separate native delays');
      equal(stats().completedCalls, 2, 'native completes both calls');
    });
    await test('page-owned callID counters cannot collide with callbacks', async function () {
      reset();
      window.callID = 0;
      window.dscb = 0;
      var first = asyncCall('delayed', { value: 'counter-a', delay: 100 });
      window.callID = 0;
      window.dscb = 0;
      var second = asyncCall('delayed', { value: 'counter-b', delay: 20 });
      equal(JSON.stringify(await Promise.all([first, second])), '["done:counter-a","done:counter-b"]', 'bundled callback counters remain isolated');
    });
    await test('async native without JS callback remains fire-and-forget', async function () {
      reset();
      call('delayed', { value: 'fire-and-forget', delay: 20 });
      await wait(100);
      equal(stats().asyncCalls, 1, 'fire-and-forget business invocation');
      equal(stats().completedCalls, 1, 'fire-and-forget completes natively');
      equal(stats().errors.length, 0, 'fire-and-forget does not trigger mismatch');
    });
    await test('zero argument sync result remains supported', function () {
      reset();
      equal(call('noArgument'), mode === 'DS3' ? 7 : '7', 'no-argument sync result');
      equal(stats().syncCalls, 1, 'no-argument native invocation');
    });
    await test('falsy sync values remain supported', function () {
      reset();
      equal(call('zero', {}), mode === 'DS3' ? 0 : '0', 'zero result');
      equal(call('falseValue', {}), mode === 'DS3' ? false : 'false', 'false result');
      equal(call('empty', {}), '', 'empty string result');
      equal(stats().errors.length, 0, 'falsy values do not trigger diagnostics');
    });
    if (mode === 'DS2') {
      await test('DS2 sync receives original JSON rather than DS3 data unwrapping', function () {
        reset();
        equal(call('sync', { data: { nested: 1 }, sibling: 2 }), 'sync:{"data":{"nested":1},"sibling":2}', 'DS2 original parameter contract');
        equal(stats().lastInput, '{"data":{"nested":1},"sibling":2}', 'DS2 sync native original params');
      });
      await test('DS2 async strips stub but preserves ordinary data field', async function () {
        reset();
        equal(await asyncCall('delayed', { value: 'ds2-data', delay: 20, data: { nested: 1 } }), 'done:ds2-data', 'DS2 async value');
        var input = JSON.parse(stats().lastInput);
        equal(input.data.nested, 1, 'DS2 async preserves data field');
        assert(!Object.prototype.hasOwnProperty.call(input, '_dscbstub'), 'DS2 async removes callback field');
      });
    } else {
      await test('DS3 primitive data is forwarded without JSON wrapping', function () {
        reset();
        equal(call('sync', 'plain-text'), 'sync:plain-text', 'DS3 primitive payload');
        equal(stats().lastInput, 'plain-text', 'DS3 primitive native argument');
      });
    }
    await test('no uncaught JavaScript / callback dispatch errors', async function () {
      await wait(40);
      equal(jsErrors.length, 0, 'uncaught errors: ' + JSON.stringify(jsErrors));
    });
    var report = {
      schemaVersion: 1, mode: mode, origin: 'arkweb-javascript', state: 'complete',
      passed: cases.filter(function (entry) { return entry.status === 'pass'; }).length,
      failed: cases.filter(function (entry) { return entry.status === 'fail'; }).length,
      durationMs: Date.now() - started, cases: cases, jsErrors: jsErrors.slice()
    };
    document.getElementById('report').textContent = JSON.stringify(report, null, 2);
    var receipt = call('report', { report: JSON.stringify(report) });
    equal(receipt, 'saved', 'native receipt acknowledgement');
    document.getElementById('state').textContent = 'Saved: ' + report.passed + ' passed / ' + report.failed + ' failed';
    window.__dsbridgeRegressionReport = report;
  }
  run().catch(function (error) {
    var message = 'Harness/report failure: ' + errorText(error);
    jsErrors.push(message);
    document.getElementById('state').textContent = message;
    console.error(message);
    // Native watchdog remains responsible if the real bridge cannot persist the report.
  });
}());
