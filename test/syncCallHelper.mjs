/**
 * Extracted host-side helper mirroring
 * library/src/main/ets/utils/SyncCallHelper.ts
 *
 * Sync native throws must become an error payload (code -1 + errMsg),
 * not escape the bridge. Matches async call() catch → handlerError and
 * Android DSBridge method.invoke catch.
 */

export function invokeSyncNativeMethod(method, obj, data) {
  try {
    const r = method.call(obj, data)
    return { code: 0, data: r }
  } catch (e) {
    return { code: -1, errMsg: JSON.stringify(e) }
  }
}

/**
 * Mirrors BaseBridge.handlerError JSON payload (code stays -1).
 */
export function handlerError(result, err) {
  result.errMsg = err
  return JSON.stringify(result)
}

/**
 * Mirrors BaseBridge.call() sync branch after method lookup.
 */
export function callSync(method, obj, data) {
  const result = { code: -1 }
  const invoked = invokeSyncNativeMethod(method, obj, data)
  if (invoked.code !== 0) {
    return handlerError(result, invoked.errMsg ?? '')
  }
  result.code = 0
  result.data = invoked.data
  return JSON.stringify(result)
}
