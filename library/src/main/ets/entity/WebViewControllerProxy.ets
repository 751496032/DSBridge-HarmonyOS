import { JsInterface, OnCloseWindowListener, OnReturnValue } from './Entity2';
import { IBridge, WebViewInterface } from './WebViewInterface';

type P = number | string | boolean

export class WebViewControllerProxy implements WebViewInterface {
  private controller: WebviewController
  private bridge: IBridge

  constructor(controller: WebviewController, bridge: IBridge) {
    this.controller = controller
    this.bridge = bridge
    this.bridge.setWebViewControllerProxy(this)
  }


  callJs(method: string, args?: P[], jsReturnValueHandler?: OnReturnValue) {
    this.bridge.callJs(method, args, jsReturnValueHandler)
  }


  hasJavascriptMethod(method: string): Promise<boolean> {
    return this.bridge.hasJavascriptMethod(method)
  }

  callHandler(method: string, args?: P[], jsReturnValueHandler?: OnReturnValue):void {
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
}

export interface RealJavaScriptProxy {
  object: JsInterface,
  name: string,
  methodList: Array<string>,
  controller: WebviewController
}