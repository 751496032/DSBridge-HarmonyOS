/**
 * Extracted host-side helper mirroring
 * library/src/main/ets/utils/HasJavascriptMethodHelper.ts
 *
 * Do not hang when JS never responds; hasJavascriptMethod should return false,
 * not deadlock.
 */
export const HAS_JAVASCRIPT_METHOD_TIMEOUT_MS = 300

export function resolveHasJavascriptMethod(
  isDS2,
  invoke,
  timeoutMs = HAS_JAVASCRIPT_METHOD_TIMEOUT_MS
) {
  if (isDS2) {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      finish(false)
    }, timeoutMs)
    invoke((has) => {
      finish(has)
    })
  })
}
