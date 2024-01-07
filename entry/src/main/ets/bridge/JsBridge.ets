
import Prompt from '@system.prompt';
import { LogUtils } from '../utils/LogUtils';
import { BaseBridge } from 'library';
import { CompleteHandler, JavaScriptInterface } from 'library';
export class JsBridge extends BaseBridge{
  private cHandler: CompleteHandler = null

  /**
   * 同步模版
   * @param p
   * @returns
   */
  @JavaScriptInterface(false)
  testSync(p: string): string {
    LogUtils.d("testSync: " + JSON.stringify(p))
    return "hello native"
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
    let counter = 0
    setInterval(() => {
      if (counter < 5) {
        counter++
        handler.setProgressData("异步返回的数据--" + counter)
      } else {
        this.cHandler.complete("异步返回的数据--结束")
        this.cHandler.complete("异步返回的数据--结束2")
      }
    }, 1000)


  }



}

