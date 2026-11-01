/**
 * Sync native method invoke.
 *
 * A throw from a @JavaScriptInterface method must become an error payload,
 * matching Android DSBridge (method.invoke is caught) and the async call()
 * branch. An uncaught throw escapes the bridge and can crash WebView/JS.
 */
export interface SyncNativeCallOutcome {
  code: number
  data?: Object | string | number | boolean
  errMsg?: string
}

/**
 * Invoke a sync native method. Never rethrows; failures use code -1 + errMsg.
 */
export function invokeSyncNativeMethod(method: Function, obj: Object, data: string): SyncNativeCallOutcome {
  try {
    const r = method.call(obj, data)
    return { code: 0, data: r }
  } catch (e) {
    // Same stringify as the async call() catch → handlerError path.
    return { code: -1, errMsg: JSON.stringify(e) }
  }
}
