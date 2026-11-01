import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  HAS_JAVASCRIPT_METHOD_TIMEOUT_MS,
  resolveHasJavascriptMethod
} from './hasJavascriptMethodHelper.mjs'

describe('resolveHasJavascriptMethod', () => {
  it('returns false immediately when DS2 is enabled (no undefined)', async () => {
    let invoked = false
    const result = await resolveHasJavascriptMethod(true, () => {
      invoked = true
    })
    assert.equal(result, false)
    assert.equal(invoked, false)
  })

  it('resolves with the JS callback value and clears the timeout', async () => {
    const result = await resolveHasJavascriptMethod(false, (onResult) => {
      onResult(true)
    }, 200)
    assert.equal(result, true)
  })

  it('does not hang when JS never responds; resolves false after timeout', async () => {
    const started = Date.now()
    const result = await resolveHasJavascriptMethod(false, () => {
      // no callback — page without dsbridge
    }, 200)
    const elapsed = Date.now() - started
    assert.equal(result, false)
    assert.ok(elapsed >= 200, `expected timeout wait, elapsed=${elapsed}`)
    assert.ok(elapsed < 1000, `should not deadlock, elapsed=${elapsed}`)
  })

  it('ignores a late JS callback after timeout has already resolved false', async () => {
    let lateCallback
    const result = await resolveHasJavascriptMethod(false, (onResult) => {
      lateCallback = onResult
    }, 200)
    assert.equal(result, false)
    lateCallback(true)
    assert.equal(result, false)
  })

  it('uses the default 200–500ms timeout', () => {
    assert.ok(HAS_JAVASCRIPT_METHOD_TIMEOUT_MS >= 200)
    assert.ok(HAS_JAVASCRIPT_METHOD_TIMEOUT_MS <= 500)
  })
})
