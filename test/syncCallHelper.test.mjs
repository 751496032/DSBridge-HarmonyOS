import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  invokeSyncNativeMethod,
  handlerError,
  callSync
} from './syncCallHelper.mjs'

describe('invokeSyncNativeMethod / callSync error payload', () => {
  it('returns code 0 and data when the sync method succeeds', () => {
    const obj = {
      ping(data) {
        return `ok:${data}`
      }
    }
    const invoked = invokeSyncNativeMethod(obj.ping, obj, 'hello')
    assert.equal(invoked.code, 0)
    assert.equal(invoked.data, 'ok:hello')
    assert.equal(invoked.errMsg, undefined)

    const payload = JSON.parse(callSync(obj.ping, obj, 'hello'))
    assert.equal(payload.code, 0)
    assert.equal(payload.data, 'ok:hello')
    assert.equal(payload.errMsg, undefined)
  })

  it('turns a thrown Error into handlerError payload and does not rethrow', () => {
    const obj = {
      boom() {
        throw new Error('native failed')
      }
    }
    assert.doesNotThrow(() => invokeSyncNativeMethod(obj.boom, obj, '{}'))

    const invoked = invokeSyncNativeMethod(obj.boom, obj, '{}')
    assert.equal(invoked.code, -1)
    assert.equal(invoked.errMsg, JSON.stringify(new Error('native failed')))

    const raw = callSync(obj.boom, obj, '{}')
    const payload = JSON.parse(raw)
    assert.equal(payload.code, -1)
    assert.equal(payload.errMsg, JSON.stringify(new Error('native failed')))
    assert.equal(payload.data, undefined)
  })

  it('turns a thrown object into handlerError payload like async call() catch', () => {
    const err = { message: 'permission denied', code: 403 }
    const obj = {
      deny() {
        throw err
      }
    }
    const invoked = invokeSyncNativeMethod(obj.deny, obj, '{}')
    assert.equal(invoked.code, -1)
    assert.equal(invoked.errMsg, JSON.stringify(err))

    const payload = JSON.parse(callSync(obj.deny, obj, '{}'))
    assert.deepEqual(payload, {
      code: -1,
      errMsg: JSON.stringify(err)
    })
  })

  it('handlerError keeps code -1 and stringifies the CallResult', () => {
    const result = { code: -1 }
    const raw = handlerError(result, '{"message":"native failed"}')
    assert.equal(raw, JSON.stringify({
      code: -1,
      errMsg: '{"message":"native failed"}'
    }))
  })

  it('does not leak the exception to the caller (WebView/JS crash path)', () => {
    const obj = {
      crash() {
        throw new Error('should stay inside the bridge')
      }
    }
    let escaped = false
    let raw
    try {
      raw = callSync(obj.crash, obj, '{"data":1}')
    } catch {
      escaped = true
    }
    assert.equal(escaped, false)
    assert.equal(typeof raw, 'string')
    const payload = JSON.parse(raw)
    assert.equal(payload.code, -1)
    assert.ok(typeof payload.errMsg === 'string' && payload.errMsg.length > 0)
  })
})
