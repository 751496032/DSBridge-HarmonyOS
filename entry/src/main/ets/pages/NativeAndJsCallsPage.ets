import { LogUtils } from '../utils/LogUtils'

import { JavaScriptInterface, WebViewControllerProxy } from '@hzw/ohos-dsbridge'
import { JsBridge } from '../bridge/JsBridge'
import { JsBridgeNamespace } from '../bridge/JsBridgeNamespace'
import { promptAction } from '@kit.ArkUI'

@Component
@Entry
struct NativeAndJsCallsPage {
  private controller: WebViewControllerProxy = WebViewControllerProxy.createController()
  private url: string = "https://mp.weixin.qq.com/s/kAtQ98mhdbYheo-SIIaFOQ"
  private localPath = $rawfile('index.html')
  @State isLoading: boolean = true
  @State msg: string = ""

  aboutToAppear() {
    this.controller.addJavascriptObject(new JsBridge())
    this.controller.addJavascriptObject(new JsBridgeNamespace(), "namespace")
    // this.controller.addJavascriptObject(this)
    this.controller.setClosePageListener(() => {
      return true; // false 会拦截关闭页面
    })
    this.controller.setGlobalErrorMessageListener((err: string) => {
      promptAction.showDialog({title:`err: ${err}`})
    })
  }

  @JavaScriptInterface(false)
  testNoArg(): boolean {
    LogUtils.d('testNoArg')
    return true
  }


  aboutToDisappear() {
    this.controller.destroy()
  }

  build() {
    // 注意需要请求网络权限
    Column() {
      Stack() {
        Web({ src: this.localPath, controller: this.controller.getWebViewController() })
          .javaScriptAccess(true)
          .javaScriptProxy(this.controller.javaScriptProxy)
          .onAlert((event) => {
            // AlertDialog.show({ message: event.message })
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

      Column() {
        Text(this.msg ? "js返回的数据: " + this.msg : "")
          .padding(20)
        Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Center }) {
          Button("调用js函数-同步")
            .margin({ top: 10 })
            .onClick(() => {
              this.controller.callJs("showAlert", [1, 2, '666'], (v: string) => {
                this.msg = v + ""
              })
            })

          Button("调用js函数-异步")
            .margin({ top: 10 })
            .onClick(() => {
              this.controller.callJs("showAlertAsync", [1, 2, '666'], (v: string) => {
                this.msg = v + ""
              })
            })

          Button("检测js注册的函数1")
            .margin({ top: 10 })
            .onClick(async () => {
              let has = await this.controller.hasJavascriptMethod("showAlert")
              this.msg = `showAlert: ${has}`
            })
          Button("检测js注册的函数2")
            .margin({ top: 10 })
            .onClick(async () => {
              let has = await this.controller.hasJavascriptMethod("showAlertAy")
              this.msg = `showAlertAy: ${has}`
            })

          Button("命名空间：调用js函数-同步")
            .margin({ top: 10 })
            .onClick(async () => {
              this.controller.callJs("sync.test", [1, 2], (value: string) => {
                this.msg = value
              })
            })

          Button("命名空间：调用js函数-异步")
            .margin({ top: 10 })
            .onClick(async () => {
              this.controller.callJs("asny.test", [3, 2], (value: string) => {
                this.msg = value
              })
            })

        }
        .width('100%')
      }
      .width('100%')
      .alignItems(HorizontalAlign.Center)

    }
    .width('100%')
    .height('100%')
  }
}

