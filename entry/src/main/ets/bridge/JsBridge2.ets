import { LogUtils } from '../utils/LogUtils';
import { BaseSendable, CompleteHandler, JavaScriptInterface, taskWait } from '@hzw/ohos-dsbridge';
import { JsParam } from '../pages/UseInJs2Page';

/**
 * @author: HZWei
 * @date: 2024/7/6
 * @desc: 测试DSBridge2.0脚本
 */

export class JsBridge2 {

  @JavaScriptInterface(false)
  testComponentSync(args: string): Object {
    const jsParam = JSON.parse(args) as JsParam
    LogUtils.d(jsParam.msg ?? '')
    // return `组件中的同步方法: ${jsParam.msg}`
    return `${jsParam.msg}`
  }

  @JavaScriptInterface(false)
  testNoArgSync(): number {
    return 1 + 2
  }

  @JavaScriptInterface()
  testComponentAsync(args: string, handler: CompleteHandler) {
    // LogUtils.d(args)
    const jsParam = JSON.parse(args) as JsParam
    handler.complete(`组件中的异步方法: ${jsParam.msg}`)
  }

  @JavaScriptInterface()
  testCallNoArgAsync(handler: CompleteHandler) {
    handler.complete(`无参异步方法返回值: 100`)
  }

  @JavaScriptInterface()
  testProgressAsync(handler: CompleteHandler) {
    this.countdown(5, (time: number) => {
      if (time === 0) {
        handler.complete("原生异步方法返回的数据--结束")
        handler.complete("原生异步方法返回的数据--结束2") // 不会被调用 会报错 Uncaught ReferenceError: xxx is not defined
      } else {
        handler.setProgressData("原生异步方法返回的数据--" + time)
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

