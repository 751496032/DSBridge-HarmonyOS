import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAsyncCallbackScript,
  createAsyncCompleteHandler,
  dispatchAsyncNativeCall,
  nextDsCallbackStub,
  allocLegacyWindowCallIdStub
} from './asyncCallbackHelper.mjs'

function parseCallbackScript(script) {
  const match = script.match(/^(dscall\d+)\((\{.*\})\.data\);(delete window\.(dscall\d+))?$/)
  assert.ok(match, `unexpected script: ${script}`)
  const stub = match[1]
  const payload = JSON.parse(match[2])
  const deleted = match[4] ?? null
  return { stub, payload, deleted }
}

describe('concurrent async native callbacks', () => {
  it('keeps independent stubs and results for 6 out-of-order completions', () => {
    const pending = []
    const api = {
      fetch(data, handler) {
        pending.push({ data, handler })
      }
    }
    const scripts = []
    const runScript = (script) => scripts.push(script)

    for (let i = 0; i < 6; i++) {
      dispatchAsyncNativeCall(
        { data: { req: i }, _dscbstub: `dscall${i}` },
        api.fetch,
        api,
        runScript
      )
    }
    assert.equal(pending.length, 6)

    const order = [3, 0, 5, 1, 4, 2]
    for (const i of order) {
      pending[i].handler.complete({ req: i, body: `res-${i}` })
    }

    assert.equal(scripts.length, 6)
    const seen = new Set()
    for (const script of scripts) {
      const { stub, payload, deleted } = parseCallbackScript(script)
      const req = payload.data.req
      assert.equal(stub, `dscall${req}`)
      assert.equal(payload.code, 0)
      assert.deepEqual(payload.data, { req, body: `res-${req}` })
      assert.equal(deleted, stub)
      assert.equal(seen.has(stub), false)
      seen.add(stub)
    }
    assert.equal(seen.size, 6)
  })

  it('captures _dscbstub at call time so later jsParam mutation cannot retarget', () => {
    const scripts = []
    const jsParam = { data: 'a', _dscbstub: 'dscall0' }
    const handler = createAsyncCompleteHandler(jsParam._dscbstub, (s) => scripts.push(s))

    jsParam._dscbstub = 'dscall1'
    handler.complete('value-for-0')

    assert.equal(scripts.length, 1)
    const { stub, payload } = parseCallbackScript(scripts[0])
    assert.equal(stub, 'dscall0')
    assert.equal(payload.data, 'value-for-0')
  })

  it('does not mutate a shared last-result slot when completing in parallel', () => {
    const lastResult = { code: -1, data: 'stale' }
    const scripts = []
    const a = createAsyncCompleteHandler('dscall0', (s) => scripts.push(s))
    const b = createAsyncCompleteHandler('dscall1', (s) => scripts.push(s))

    a.complete({ id: 'A' })
    b.complete({ id: 'B' })

    assert.deepEqual(lastResult, { code: -1, data: 'stale' })
    assert.equal(parseCallbackScript(scripts[0]).payload.data.id, 'A')
    assert.equal(parseCallbackScript(scripts[1]).payload.data.id, 'B')
    assert.notEqual(parseCallbackScript(scripts[0]).payload, parseCallbackScript(scripts[1]).payload)
  })

  it('setProgressData keeps the stub; complete deletes it', () => {
    const scripts = []
    const handler = createAsyncCompleteHandler('dscall2', (s) => scripts.push(s))
    handler.setProgressData('p1')
    handler.setProgressData('p2')
    handler.complete('done')

    assert.equal(scripts.length, 3)
    const p1 = parseCallbackScript(scripts[0])
    const p2 = parseCallbackScript(scripts[1])
    const done = parseCallbackScript(scripts[2])
    assert.equal(p1.stub, 'dscall2')
    assert.equal(p1.payload.data, 'p1')
    assert.equal(p1.deleted, null)
    assert.equal(p2.payload.data, 'p2')
    assert.equal(p2.deleted, null)
    assert.equal(done.payload.data, 'done')
    assert.equal(done.deleted, 'dscall2')
  })

  it('does not dispatch JS when H5 omitted a callback stub', () => {
    let ran = false
    const handler = createAsyncCompleteHandler(undefined, () => {
      ran = true
    })
    handler.complete('x')
    handler.setProgressData('y')
    assert.equal(ran, false)
    assert.equal(buildAsyncCallbackScript(undefined, 'x'), undefined)
    assert.equal(buildAsyncCallbackScript('', 'x'), undefined)
  })
})

describe('H5 callback-id allocator', () => {
  it('issues unique stubs for 6 rapid allocations', () => {
    const state = { callId: 0 }
    const stubs = []
    for (let i = 0; i < 6; i++) {
      stubs.push(nextDsCallbackStub(state))
    }
    assert.deepEqual(stubs, ['dscall0', 'dscall1', 'dscall2', 'dscall3', 'dscall4', 'dscall5'])
    assert.equal(state.callId, 6)
    assert.equal(new Set(stubs).size, 6)
  })

  it('does not collide when window.callID is reset or reused by the page', () => {
    const win = { callID: 0 }
    const state = { callId: 0 }
    const isolated = []
    const legacy = []
    for (let i = 0; i < 6; i++) {
      win.callID = 0
      isolated.push(nextDsCallbackStub(state))
      legacy.push(allocLegacyWindowCallIdStub(win))
    }
    assert.equal(new Set(isolated).size, 6)
    assert.equal(new Set(legacy).size, 1)
    assert.equal(legacy[0], 'dscall0')
    assert.equal(legacy[5], 'dscall0')
  })
})
