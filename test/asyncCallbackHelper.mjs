/**
 * Extracted host-side helper mirroring
 * library/src/main/ets/utils/AsyncCallbackHelper.ts
 *
 * Concurrent H5 → native async calls must keep independent callback stubs
 * and result snapshots. Do not mutate call()'s last-result object or re-read
 * jsParam._dscbstub at complete() time.
 */

export function buildAsyncCallbackScript(callbackStub, value, complete = true) {
  if (!callbackStub) {
    return undefined
  }
  const payload = { code: 0, data: value }
  const args = JSON.stringify(payload)
  let script = `${callbackStub}(${args}.data);`
  if (complete) {
    script += "delete window." + callbackStub
  }
  return script
}

export function createAsyncCompleteHandler(callbackStub, runScript) {
  return {
    complete(value) {
      const script = buildAsyncCallbackScript(callbackStub, value, true)
      if (script) {
        runScript(script)
      }
    },
    setProgressData(value) {
      const script = buildAsyncCallbackScript(callbackStub, value, false)
      if (script) {
        runScript(script)
      }
    }
  }
}

/**
 * Mirrors BaseBridge.call() async branch after the method is resolved:
 * capture _dscbstub now, give the native method its own handler.
 */
export function dispatchAsyncNativeCall(jsParam, method, obj, runScript) {
  const callbackStub = jsParam._dscbstub
  const handler = createAsyncCompleteHandler(callbackStub, runScript)
  const data = jsParam.data
  method.call(obj, data, handler)
}

/**
 * Isolated H5 callback-id allocator (dsBridge 3.0).
 * Must not read or write window.callID.
 */
export function nextDsCallbackStub(state, prefix = 'dscall') {
  const id = state.callId
  state.callId = id + 1
  return prefix + id
}

/**
 * Legacy DS3 allocator: window.callID + falsy reset.
 * Concurrent / page-owned callID reuse collides stubs.
 */
export function allocLegacyWindowCallIdStub(win) {
  if (!win.callID) {
    win.callID = 0
  }
  const callName = 'dscall' + (win.callID++)
  return callName
}
