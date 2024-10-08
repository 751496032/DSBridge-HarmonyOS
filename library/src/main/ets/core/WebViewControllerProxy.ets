import webview from '@ohos.web.webview';
import { ToastUtils } from '../utils/ToastUtils';
import { BaseBridge } from './BaseBridge';
import { Args, JsInterface, OnCloseWindowListener, OnErrorMessageListener, OnReturnValue } from './Entity';
import { IWebViewControllerProxy, IBaseBridge } from './WebViewInterface';


export class WebViewControllerProxy implements IWebViewControllerProxy, IOhosWebviewController, IBaseBridge {
  private controller: webview.WebviewController
  private bridge: BaseBridge = new BaseBridge()
  javaScriptNamespaceInterfaces: Map<string, object> = new Map();

  constructor(controller: webview.WebviewController, obj?: object) {
    this.controller = controller
    this.bridge.setWebViewControllerProxy(this)
    this.addJavascriptObject(this.bridge, "_dsb")
    if (obj != null) {
      this.addJavascriptObject(obj)
    }
  }

  setGlobalErrorMessageListener(listener: OnErrorMessageListener): void {
    this.bridge.setGlobalErrorMessageListener(listener)
  }

  supportDS2(enable: boolean): void {
    this.bridge.supportDS2(enable)
  }

  injectDS2Js(): void {
    this.bridge.injectDS2Js()
  }


  addJavascriptObject = (obj: object, namespace: string = '') => {
    if (obj != null) {
      if (this.javaScriptNamespaceInterfaces.has(namespace)) {
        ToastUtils.show(namespace + "注入失败：一个组件内不能同时存在两个相同的命名空间名称")
        return
      }
      if (this.bridge.isSupportDS2 && namespace && namespace.length > 0) {
        ToastUtils.show(namespace + "注入失败：DSBridge2.0不支持命名空间")
         return
      }
      this.javaScriptNamespaceInterfaces.set(namespace, obj)
    }

  }

  hasJavascriptMethod(method: string): Promise<boolean> {
    return this.bridge.hasJavascriptMethod(method)
  }



  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue) {
    this.bridge.callJs(method, args, jsReturnValueHandler)
  }


  callJsNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callJsNoParam(method, jsReturnValueHandler)
  }

  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callHandler(method, args, jsReturnValueHandler)

  }

  callHandlerNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callHandlerNoParam(method, jsReturnValueHandler)
  }


  setClosePageListener(listener: OnCloseWindowListener) {
    this.bridge.setClosePageListener(listener)
  }


  destroy() {
    this.javaScriptNamespaceInterfaces.clear()
    this.bridge.destroy()
  }

  runJavaScript(script: string): Promise<string> {
    return this.controller.runJavaScript(script);
  }

  registerJavaScriptProxy(object: object, name: string, methodList: string[]) {
    this.controller.registerJavaScriptProxy(object, name, methodList);
    this.refresh()
  }

  refresh() {
    this.controller.refresh()
  }

  getWebViewController(): webview.WebviewController {
    return this.controller
  }

  /**
   * @deprecated
   * @returns
   */
  getJavaScriptProxy(): RealJavaScriptProxy {
    let javaScriptProxy: RealJavaScriptProxy = {
      object: this.bridge.javaScriptProxy().object,
      name: this.bridge.javaScriptProxy().name,
      methodList: this.bridge.javaScriptProxy().methodList,
      controller: this.controller
    }
    return javaScriptProxy
  }

  get javaScriptProxy(): RealJavaScriptProxy {
    return {
      object: this.bridge.javaScriptProxy().object,
      name: this.bridge.javaScriptProxy().name,
      methodList: this.bridge.javaScriptProxy().methodList,
      controller: this.controller
    }
  }


  static createController(obj?: object): WebViewControllerProxy {
    return new WebViewControllerProxy(new webview.WebviewController(), obj)
  }
}

/**
 * ohos相关的api
 */
export interface IOhosWebviewController {
  getWebViewController(): webview.WebviewController

  /**
   * @deprecated
   * @returns
   */
  getJavaScriptProxy(): RealJavaScriptProxy

  get javaScriptProxy(): RealJavaScriptProxy
}

export interface RealJavaScriptProxy {
  object: JsInterface,
  name: string,
  methodList: Array<string>,
  controller: webview.WebviewController
}