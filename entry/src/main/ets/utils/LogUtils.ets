import hilog from '@ohos.hilog'


export class LogUtils{
  private static readonly LOG_TAG: string = "LogUtils"

  static d(msg: string) {
    // hilog.debug(0x0001, this.LOG_TAG, msg)
  }

  static e(msg: string) {
    // hilog.error(0x0001, this.LOG_TAG, msg)
  }




}

