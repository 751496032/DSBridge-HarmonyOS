import { LogUtils } from '../utils/LogUtils';
import { CompleteHandler, JavaScriptInterface } from '@hzw/ohos-dsbridge';

export class JsBridgeNamespace {
  private cHandler?: CompleteHandler

  /**
   * 同步模版
   * @param p
   * @returns
   */
  @JavaScriptInterface(false)
  testSync(p: string): string {
    LogUtils.d("namespace testSync: " + JSON.stringify(p))
    return "namespace: 原生同步testSync方法返回的数据"
  }
  /**
   * 异步模版
   * @param p
   * @param handler
   */
  @JavaScriptInterface()
  testAsync(p: string, handler: CompleteHandler) {
    LogUtils.d("namespace testAsync: " + JSON.stringify(p))
    this.cHandler = handler
    this.countdown(5, (time:number) => {
      if (time === 0) {
        handler.complete("namespace: 原生异步testAsync方法返回的数据--结束")
        handler.complete("namespace: 原生异步testAsync方法返回的数据--结束2") // 不会被调用 会报错 Uncaught ReferenceError: xxx is not defined
      } else {
        handler.setProgressData("namespace: 原生异步testAsync方法返回的数据--" + time)
      }
    })


  }

  countdown(seconds: number, callback: (counter: number) => void) {
    let count = seconds;
    const interval = setInterval(() => {
      if (count === 0) {
        clearInterval(interval);
        LogUtils.d("Finished");
        return;
      }
      count--
      callback(count)
    }, 1000);
  }
}

