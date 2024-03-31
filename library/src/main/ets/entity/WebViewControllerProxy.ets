import webview from '@ohos.web.webview';
import { Args, JsInterface, OnCloseWindowListener, OnReturnValue } from './Entity2';
import { IBridge, IWebViewControllerProxy, IBaseBridge } from './WebViewInterface';


export class WebViewControllerProxy implements IWebViewControllerProxy, IOhosWebviewController, IBaseBridge {
  private controller: WebviewController
  private bridge: IBridge

  constructor(controller: WebviewController, bridge: IBridge ) {
    this.controller = controller
    this.bridge = bridge
    this.bridge.setWebViewControllerProxy(this)
  }



  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue) {
    this.bridge.callJs(method, args, jsReturnValueHandler)
  }


  hasJavascriptMethod(method: string): Promise<boolean> {
    return this.bridge.hasJavascriptMethod(method)
  }

  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue):void {
    return this.bridge.callHandler(method, args, jsReturnValueHandler)
  }

  setClosePageListener(listener: OnCloseWindowListener) {
    this.bridge.setClosePageListener(listener)
  }


  destroy() {
    this.bridge.destroy()
  }

  runJavaScript(script: string): Promise<string> {
    return this.controller.runJavaScript(script);
  }

  registerJavaScriptProxy(object: object, name: string, methodList: string[]) {
    this.controller.registerJavaScriptProxy(object, name, methodList);
  }

  refresh() {
    this.controller.refresh()
  }

  getWebViewController(): WebviewController {
    return this.controller
  }

  getJavaScriptProxy(): RealJavaScriptProxy {
    let javaScriptProxy: RealJavaScriptProxy = {
      object: this.bridge.javaScriptProxy().object,
      name: this.bridge.javaScriptProxy().name,
      methodList: this.bridge.javaScriptProxy().methodList,
      controller: this.controller
    }
    return javaScriptProxy
  }

  static createController(bridge: IBridge): WebViewControllerProxy {
    // @ts-ignore
    return new WebViewControllerProxy(new webview.WebviewController(), bridge)
  }
}

/**
 * 涉及ohos相关的api
 */
export interface IOhosWebviewController {
  getWebViewController(): WebviewController

  getJavaScriptProxy(): RealJavaScriptProxy
}

export interface RealJavaScriptProxy {
  object: JsInterface,
  name: string,
  methodList: Array<string>,
  controller: WebviewController
}