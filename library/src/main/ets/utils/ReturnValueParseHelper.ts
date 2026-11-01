/**
 * DS3 returnValue callback payload.
 * JS calls returnValue(JSON.stringify({ id, complete, data })).
 *
 * The DS3 path used to JSON.parse(param) without a guard. Malformed
 * payloads threw out of @JavaScriptInterface. call() already uses
 * safeParse; this helper is the same contract: never throw, empty
 * object on failure so the handler lookup is a no-op.
 */
export interface ReturnValueParam {
  id?: number
  complete?: boolean
  data?: Object | string | number | boolean
}

export type ParseErrorHandler = (error: Object) => void

/**
 * Parse DS3 returnValue JSON. Never throws.
 * Empty / malformed / non-object → {} (no-op for handler lookup).
 */
export function parseReturnValueParam(param: string, onError?: ParseErrorHandler): ReturnValueParam {
  if (param === undefined || param === null) {
    return {}
  }
  if (typeof param === 'string' && param.trim().length <= 0) {
    return {}
  }
  try {
    const parsed = JSON.parse(param)
    if (parsed === null || typeof parsed !== 'object') {
      return {}
    }
    return parsed as ReturnValueParam
  } catch (e) {
    onError?.(e)
    return {}
  }
}
