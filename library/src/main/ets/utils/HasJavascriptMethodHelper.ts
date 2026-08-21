/**
 * Promise helper for hasJavascriptMethod.
 * Do not hang when JS never responds; resolve false instead of deadlock.
 */
export const HAS_JAVASCRIPT_METHOD_TIMEOUT_MS = 300

export type HasJavascriptMethodInvoker = (onResult: (has: boolean) => void) => void

export function resolveHasJavascriptMethod(
  isDS2: boolean,
  invoke: HasJavascriptMethodInvoker,
  timeoutMs: number = HAS_JAVASCRIPT_METHOD_TIMEOUT_MS
): Promise<boolean> {
  if (isDS2) {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
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
    invoke((has: boolean) => {
      finish(has)
    })
  })
}
