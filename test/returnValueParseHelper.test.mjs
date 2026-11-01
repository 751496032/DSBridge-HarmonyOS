import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseReturnValueParam,
  returnValueDS3
} from './returnValueParseHelper.mjs'

describe('parseReturnValueParam / returnValue DS3', () => {
  it('parses a valid DS3 callback payload', () => {
    const p = parseReturnValueParam(JSON.stringify({
      id: 3,
      complete: true,
      data: 'ok'
    }))
    assert.equal(p.id, 3)
    assert.equal(p.complete, true)
    assert.equal(p.data, 'ok')
  })

  it('does not throw on malformed JSON', () => {
    const samples = ['{', '{id:', 'not-json', '{"id":', '[', undefined, null, '', '   ']
    for (const sample of samples) {
      assert.doesNotThrow(() => parseReturnValueParam(sample))
      const parsed = parseReturnValueParam(sample)
      assert.deepEqual(parsed, {})
    }
  })

  it('logs via onError and returns {} on malformed JSON (no-op)', () => {
    const errors = []
    const parsed = parseReturnValueParam('{broken', (e) => errors.push(e))
    assert.deepEqual(parsed, {})
    assert.equal(errors.length, 1)
    assert.ok(errors[0] instanceof SyntaxError)
  })

  it('does not throw when JSON.parse would yield null or a non-object', () => {
    assert.doesNotThrow(() => parseReturnValueParam('null'))
    assert.deepEqual(parseReturnValueParam('null'), {})
    assert.deepEqual(parseReturnValueParam('123'), {})
    assert.deepEqual(parseReturnValueParam('true'), {})
    assert.deepEqual(parseReturnValueParam('"str"'), {})
  })

  it('returnValueDS3 delivers data for a valid payload', () => {
    const seen = []
    const handlerMap = new Map()
    handlerMap.set(7, (data) => seen.push(data))
    assert.doesNotThrow(() => {
      returnValueDS3(JSON.stringify({ id: 7, complete: true, data: { n: 1 } }), handlerMap)
    })
    assert.deepEqual(seen, [{ n: 1 }])
    assert.equal(handlerMap.has(7), false)
  })

  it('returnValueDS3 does not throw or invoke handlers on malformed JSON', () => {
    let invoked = false
    const errors = []
    const handlerMap = new Map()
    handlerMap.set(1, () => {
      invoked = true
    })
    let escaped = false
    try {
      returnValueDS3('{not-json', handlerMap, (e) => errors.push(e))
    } catch {
      escaped = true
    }
    assert.equal(escaped, false)
    assert.equal(invoked, false)
    assert.equal(handlerMap.has(1), true)
    assert.equal(errors.length, 1)
  })

  it('keeps the handler when complete is false (progress callback)', () => {
    const seen = []
    const handlerMap = new Map()
    handlerMap.set(2, (data) => seen.push(data))
    returnValueDS3(JSON.stringify({ id: 2, complete: false, data: 1 }), handlerMap)
    returnValueDS3(JSON.stringify({ id: 2, complete: true, data: 2 }), handlerMap)
    assert.deepEqual(seen, [1, 2])
    assert.equal(handlerMap.has(2), false)
  })
})
