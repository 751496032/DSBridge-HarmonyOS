import hilog from '@ohos.hilog'

export class LogUtils {
  private static readonly LOG_TAG: string = "LogUtils"
  private static enable: boolean = true

  static logEnable(enabled: boolean) {
    this.enable = enabled
  }

  static d(msg: any) {
    if (!this.enable) {
      return
    }
    hilog.debug(0x0001, LogUtils.LOG_TAG, msg)
  }

  static e(msg: any) {
    if (!this.enable) {
      return
    }
    hilog.error(0x0001, LogUtils.LOG_TAG, msg)
  }
}

