import { LogUtils } from '../utils/LogUtils'

import { CompleteHandler, JavaScriptInterface, WebViewControllerProxy } from '@hzw/ohos-dsbridge'
import { JsBridge } from '../bridge/JsBridge'
import { webview } from '@kit.ArkWeb'
import { promptAction } from '@kit.ArkUI'

/**
 * @author: HZWei
 * @date: 2024/6/24
 * @desc:  在组件中定义桥接函数示例
 */

@Component
@Entry
struct UseInComponentsPage {
  private controller: WebViewControllerProxy = WebViewControllerProxy.createController()
  private url: string = "https://www.harmonyos.com/"
  private localPath = $rawfile('use-in-components.html')
  @State isLoading: boolean = true
  @State msg: string = ""

  aboutToAppear() {
    // 在一个组件内只能存在一个无命名空间类
    this.controller.addJavascriptObject(this)
    this.controller.setGlobalErrorMessageListener((err: string) => {
      promptAction.showDialog({title:`${err}`})
    })


    // 开启调试模式
    webview.WebviewController.setWebDebuggingAccess(true);
  }

  @JavaScriptInterface(false)
  testComponentSync(args: string): string {
    return `组件中的同步方法: ${args}`
  }

  @JavaScriptInterface()
  testComponentAsync(args: string, handler: CompleteHandler) {
    handler.complete(`组件中的异步方法: ${args}`)
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

    }
    .width('100%')
    .height('100%')
  }
}

