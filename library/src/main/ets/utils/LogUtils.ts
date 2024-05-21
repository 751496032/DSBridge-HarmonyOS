import hilog from '@ohos.hilog'

export class LogUtils {
  private static readonly LOG_TAG: string = "LogUtils"
  private static enable: boolean = true

  static logEnable(enabled: boolean) {
    this.enable = enabled
  }

  static dTag(tag: string, msg: any) {
    if (!this.enable) {
      return
    }
    hilog.debug(0x0001, tag, msg)
  }


  static d(msg: any) {
    this.dTag(this.LOG_TAG, msg)
  }

  static eTag(tag: string, msg: any) {
    if (!this.enable) {
      return
    }
    hilog.error(0x0001, tag, msg)
  }

  static e(msg: any) {
    this.eTag(this.LOG_TAG, msg)
  }
}

