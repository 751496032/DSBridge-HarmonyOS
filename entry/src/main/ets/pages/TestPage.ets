import { LogUtils } from '../utils/LogUtils'

import { CompleteHandler, JavaScriptInterface, WebViewControllerProxy } from '@hzw/ohos-dsbridge'
import { JsBridge } from '../bridge/JsBridge'
import { webview } from '@kit.ArkWeb'
import { promptAction, router } from '@kit.ArkUI'
import { JsBridge2 } from '../bridge/JsBridge2'

/**
 * @author: HZWei
 * @date: 2024/11/20
 * @desc:
 */
@Component
@Entry
struct TestPage {
  private proxy: WebViewControllerProxy = WebViewControllerProxy.createController()
  private url: string = "https://www.harmonyos.com/"
  @State isLoading: boolean = true
  @State msg: string = ""

  aboutToAppear() {

    // 开启调试模式
    webview.WebviewController.setWebDebuggingAccess(true);
  }




  aboutToDisappear() {
    this.proxy.destroy()
  }

  build() {
    Column({space:20}) {
      Stack() {
        Web({ src: this.url, controller: this.proxy.webviewController })
          .javaScriptAccess(true)
          .javaScriptProxy(this.proxy.javaScriptProxy)
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

      Button("back").onClick((event: ClickEvent) => {
         if (this.proxy.webviewController.accessBackward()){
           this.proxy.webviewController.backward()
         }else {
           router.back()
         }
      })



    }
    .width('100%')
    .height('100%')
  }
}



