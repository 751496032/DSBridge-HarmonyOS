import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { loadBaseBridge } from './loadBaseBridge.mjs'

function fixture(ds2 = false, namespace = '') {
  const { BaseBridge, JavaScriptInterface, logs } = loadBaseBridge()
  const calls = []
  const scripts = []
  const errors = []
  const pending = []
  const api = {
    value: 'sync-result',
    sync(data) { calls.push(data); return this.value },
    async(data, handler) { calls.push(data); pending.push(handler) }
  }
  for (const [name, async] of [['sync', false], ['async', true]]) {
    JavaScriptInterface(async)(api, name, Object.getOwnPropertyDescriptor(api, name))
  }
  const bridge = new BaseBridge()
  bridge.supportDS2(ds2)
  bridge.setWebViewControllerProxy({
    javaScriptNamespaceInterfaces: new Map([[namespace, api]]),
    runJavaScript(script) { scripts.push(script); return Promise.resolve('') },
    registerJavaScriptProxy() {},
    refresh() {}
  })
  bridge.setGlobalErrorMessageListener((error) => errors.push(error))
  return { bridge, api, calls, scripts, errors, pending, logs }
}

for (const ds2 of [false, true]) {
  describe(`production BaseBridge registration contract (DS${ds2 ? 2 : 3})`, () => {
    it('rejects a callback on a sync method before executing native code', () => {
      const f = fixture(ds2)
      const result = JSON.parse(f.bridge.call('sync', JSON.stringify({
        data: 'request', _dscbstub: 'dscall0'
      })))
      assert.equal(result.code, -1)
      assert.match(result.errMsg, /sync is registered with @JavaScriptInterface\(false\)/)
      assert.match(result.errMsg, /dsBridge\.call\("sync", data\) without a callback/)
      assert.match(result.errMsg, /@JavaScriptInterface\(\) and CompleteHandler/)
      assert.deepEqual(f.calls, [])
      assert.deepEqual(f.scripts, [])
      assert.deepEqual(f.errors, [result.errMsg])
      assert.ok(f.logs.includes(result.errMsg))
    })

    it('includes the full namespace in the diagnostic', () => {
      const f = fixture(ds2, 'shop.orders')
      const result = JSON.parse(f.bridge.call('shop.orders.sync', JSON.stringify({
        data: 'request', _dscbstub: 'dscall1'
      })))
      assert.match(result.errMsg, /shop\.orders\.sync is registered/)
      assert.match(result.errMsg, /dsBridge\.call\("shop\.orders\.sync", data\)/)
      assert.deepEqual(f.calls, [])
    })

    it('keeps valid sync calls and their protocol-specific payloads', () => {
      const f = fixture(ds2)
      const params = JSON.stringify({ data: { value: 1 } })
      const result = f.bridge.call('sync', params)
      assert.equal(ds2 ? result : JSON.parse(result).data, 'sync-result')
      assert.deepEqual(f.calls, [ds2 ? params : '{"value":1}'])
      assert.deepEqual(f.errors, [])
    })

    it('does not reject an empty callback stub', () => {
      const f = fixture(ds2)
      f.bridge.call('sync', JSON.stringify({ data: 'request', _dscbstub: '' }))
      assert.equal(f.calls.length, 1)
      assert.deepEqual(f.errors, [])
    })

    it('preserves falsy sync results', () => {
      const f = fixture(ds2)
      for (const value of [0, false, '']) {
        f.api.value = value
        const raw = f.bridge.call('sync', '{"data":"request"}')
        assert.equal(ds2 ? raw : JSON.parse(raw).data, ds2 ? String(value) : value)
      }
      assert.deepEqual(f.errors, [])
    })

    it('preserves async native calls without a JS callback', () => {
      const f = fixture(ds2)
      f.bridge.call('async', '{"data":"request"}')
      assert.equal(f.calls.length, 1)
      f.pending[0].complete('unused')
      assert.deepEqual(f.errors, [])
      assert.deepEqual(f.scripts, [])
    })

    it('preserves independent async callbacks and out-of-order completion', () => {
      const f = fixture(ds2)
      for (const id of [0, 1]) {
        f.bridge.call('async', JSON.stringify({ data: { id }, _dscbstub: `dscall${id}` }))
      }
      f.pending[1].complete('second')
      f.pending[0].complete('first')
      assert.deepEqual(f.scripts, [
        'dscall1({"code":0,"data":"second"}.data);delete window.dscall1',
        'dscall0({"code":0,"data":"first"}.data);delete window.dscall0'
      ])
      assert.deepEqual(f.calls, ds2 ? ['{"data":{"id":0}}', '{"data":{"id":1}}'] : ['{"id":0}', '{"id":1}'])
      assert.deepEqual(f.errors, [])
    })

    it('keeps progress callbacks before the final completion', () => {
      const f = fixture(ds2)
      f.bridge.call('async', '{"data":"request","_dscbstub":"dscall0"}')
      f.pending[0].setProgressData('working')
      f.pending[0].complete('done')
      assert.deepEqual(f.scripts, [
        'dscall0({"code":0,"data":"working"}.data);',
        'dscall0({"code":0,"data":"done"}.data);delete window.dscall0'
      ])
      assert.deepEqual(f.errors, [])
    })

    it('runs the bundled H5 script against the real native dispatcher', () => {
      const f = fixture(ds2)
      const context = vm.createContext({
        _dsbridge: { call: (...args) => f.bridge.call(...args) },
        console: { log() {} }
      })
      context.window = context
      const scriptName = ds2 ? 'dsbridge2.0.js' : 'dsBridge3.0.js'
      const scriptUrl = new URL(`../entry/src/main/resources/rawfile/${scriptName}`, import.meta.url)
      vm.runInContext(readFileSync(scriptUrl, 'utf8'), context)
      assert.equal(vm.runInContext('dsBridge.call("sync", {value: 1})', context), 'sync-result')
      vm.runInContext('dsBridge.call("sync", {}, function() { window.rejectedCallbackRan = true })', context)
      assert.equal(f.calls.length, 1)
      assert.equal(context.rejectedCallbackRan, undefined)
      assert.equal(f.errors.length, 1)
      assert.match(f.errors[0], /sync is registered with @JavaScriptInterface\(false\)/)
      vm.runInContext('dsBridge.call("async", {}, function(value) { window.asyncValue = value })', context)
      f.pending[0].complete('async-result')
      for (const script of f.scripts) vm.runInContext(script, context)
      assert.equal(context.asyncValue, 'async-result')
    })
  })
}
