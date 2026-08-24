/**
 * Extracted host-side helper mirroring
 * library/src/main/ets/utils/ReturnValueParseHelper.ts
 *
 * DS3 returnValue must not throw on malformed callback JSON.
 * Same contract as BaseBridge.safeParse used by call(): never throw,
 * empty object on failure so handler lookup is a no-op.
 */

export function parseReturnValueParam(param, onError) {
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
    return parsed
  } catch (e) {
    if (onError) {
      onError(e)
    }
    return {}
  }
}

/**
 * Mirrors BaseBridge.returnValue DS3 path (not DS2 id/value).
 */
export function returnValueDS3(param, handlerMap, onError) {
  const p = parseReturnValueParam(param, onError)
  if (p.id && handlerMap.has(p.id)) {
    const handler = handlerMap.get(p.id)
    handler(p.data)
    if (p.complete) {
      handlerMap.delete(p.id)
    }
  }
}
