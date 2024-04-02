import hilog from '@ohos.hilog'

export class LogUtils{
  private static readonly LOG_TAG: string = "LogUtils"

  static d(msg: any) {
    hilog.debug(0x0001, LogUtils.LOG_TAG, msg)
  }

  static e(msg: any) {
    hilog.error(0x0001, LogUtils.LOG_TAG, msg)
  }
}

