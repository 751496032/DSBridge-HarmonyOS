import Prompt from '@system.prompt';
import { LogUtils } from '../utils/LogUtils';
import { BaseBridge } from '@hzw/ohos-dsbridge';
import { CompleteHandler, JavaScriptInterface } from '@hzw/ohos-dsbridge';

export class JsBridge extends BaseBridge {
  private cHandler: CompleteHandler = null

  /**
   * 同步模版
   * @param p
   * @returns
   */
  @JavaScriptInterface(false)
  testSync(p: string): string {
    LogUtils.d("testSync: " + JSON.stringify(p))
    return "原生同步testSync方法返回的数据"
  }
  /**
   * 异步模版
   * @param p
   * @param handler
   */
  @JavaScriptInterface()
  testAsync(p: string, handler: CompleteHandler) {
    LogUtils.d("testAsync: " + JSON.stringify(p))
    this.cHandler = handler
    this.countdown(5, (time) => {
      if (time === 0) {
        handler.complete("原生异步testAsync方法返回的数据--结束")
        handler.complete("原生异步testAsync方法返回的数据--结束2") // 不会被回调
      } else {
        handler.setProgressData("原生异步testAsync方法返回的数据--" + time)
      }
    })


  }

  countdown(seconds, callback) {
    let count = seconds;
    const interval = setInterval(() => {
      if (count === 0) {
        clearInterval(interval);
        console.log("Finished");
        callback(count)
        return;
      }
      count--
      callback(count)
    }, 1000);
  }
}

