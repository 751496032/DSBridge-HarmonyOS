/**
 * Concurrent H5 → native async callbacks.
 *
 * BaseBridge.call() used to close over one CallResult and re-read
 * jsParam._dscbstub in complete(). Parallel calls then shared a last-result
 * slot or the latest stub. Android DSBridge snapshots a fresh JSONObject and
 * a final callback name per complete().
 */

export interface AsyncCallbackPayload {
  code: number
  data?: Object | string | number | boolean
}

export type AsyncCallbackValue = Object | string | number | boolean

export type AsyncScriptRunner = (script: string) => void

/**
 * Build the JS snippet for one async completion. Fresh payload every time;
 * never mutate call()'s result object.
 */
export function buildAsyncCallbackScript(
  callbackStub: string | undefined,
  value: AsyncCallbackValue,
  complete: boolean = true
): string | undefined {
  if (!callbackStub) {
    return undefined
  }
  const payload: AsyncCallbackPayload = { code: 0, data: value }
  const args = JSON.stringify(payload)
  let script = `${callbackStub}(${args}.data);`
  if (complete) {
    script += "delete window." + callbackStub
  }
  return script
}

/**
 * CompleteHandler whose stub is captured at call time.
 * complete() / setProgressData() each snapshot an independent payload.
 */
export function createAsyncCompleteHandler(
  callbackStub: string | undefined,
  runScript: AsyncScriptRunner
): { complete: (value: AsyncCallbackValue) => void, setProgressData: (value: AsyncCallbackValue) => void } {
  return {
    complete: (value: AsyncCallbackValue) => {
      const script = buildAsyncCallbackScript(callbackStub, value, true)
      if (script) {
        runScript(script)
      }
    },
    setProgressData: (value: AsyncCallbackValue) => {
      const script = buildAsyncCallbackScript(callbackStub, value, false)
      if (script) {
        runScript(script)
      }
    }
  }
}

export interface DsCallbackIdState {
  callId: number
}

/**
 * Isolated H5 callback-id allocator.
 * Do not use window.callID — pages reuse that name and collide dscallN stubs.
 */
export function nextDsCallbackStub(
  state: DsCallbackIdState,
  prefix: string = 'dscall'
): string {
  const id = state.callId
  state.callId = id + 1
  return prefix + id
}
