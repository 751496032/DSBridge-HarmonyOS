import { LogUtils } from '../utils/LogUtils'

import { CompleteHandler, JavaScriptInterface, WebViewControllerProxy } from '@hzw/ohos-dsbridge'
import { JsBridge } from '../bridge/JsBridge'
import { webview } from '@kit.ArkWeb'
import { promptAction } from '@kit.ArkUI'
import { JsBridge2 } from '../bridge/JsBridge2'

/**
 * @author: HZWei
 * @date: 2024/7/6
 * @desc: 测试dsBridge2的js
 */

@Component
@Entry
struct UseInJs2Page {
  private controller: WebViewControllerProxy = WebViewControllerProxy.createController()
  private url: string = "https://www.harmonyos.com/"
  private localPath = $rawfile('use-in-js2.html')
  @State isLoading: boolean = true
  @State msg: string = ""

  aboutToAppear() {
    // 如果是使用DSBridge2.0 ，调用supportDS2方法
    this.controller.supportDS2(true)
    // 以下两种注册方式都可以，任选其一
    this.controller.addJavascriptObject(this)
    // this.controller.addJavascriptObject(new JsBridge2())


    // DS2.0脚本不支持API命令空间 xx
    // this.controller.addJavascriptObject(new JsBridge2(),'js2')
    // 开启调试模式
    webview.WebviewController.setWebDebuggingAccess(true);

    this.controller.setGlobalErrorMessageListener((err: string) => {
      promptAction.showDialog({title:`${err}`})
    })

  }

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

  aboutToDisappear() {
    this.controller.destroy()
  }

  build() {
    Column() {
      Stack() {
        Web({ src: this.localPath, controller: this.controller.getWebViewController() })
          .javaScriptAccess(true)
          .javaScriptProxy(this.controller.javaScriptProxy)
          .onAlert((event) => {
            return false
          })
          .onProgressChange((event) => {
            if (event?.newProgress == 100) {
              this.isLoading = false
            }
          })
          .onConsole((event) => {
            LogUtils.d('getMessage:' + event?.message.getMessage());
            return false;
          })
          .width('100%')
          .height('100%')
          .backgroundColor("#ffeef5ee")

        if (this.isLoading) {
          LoadingProgress()
            .width(40)
            .height(40)
        }

      }
      .alignContent(Alignment.Center)
      .width('100%')
      .height('70%')

      Text(this.msg)
        .fontSize(18)
        .padding(10)

      Button("callJs").onClick((event: ClickEvent) => {
        this.controller.callHandler('addValue', [1, 2], (r: number) => {
           this.msg = r.toString()
        })
      })

      Button("callJs2").onClick((event: ClickEvent) => {
        this.controller.callHandlerNoParam('addValue2', () => {
          this.msg = 'addValue2'
        })
      })

    }
    .width('100%')
    .height('100%')
  }
}

export class JsParam {
  msg?: string
}

