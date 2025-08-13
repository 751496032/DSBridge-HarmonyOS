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
    if (obj) {
      this.addJavascriptObject(obj)
    }
  }

  /**
   * 设置全局错误监听
   * @param listener
   */
  setGlobalErrorMessageListener(listener: OnErrorMessageListener): void {
    this.bridge.setGlobalErrorMessageListener(listener)
  }

  /**
   * 启用DS2.0脚本
   * @param enable
   */
  supportDS2(enable: boolean): void {
    this.bridge.supportDS2(enable)
  }

  /**
   * 注入DS2.0的JS， 默认是3.0
   */
  injectDS2Js(): void {
    this.bridge.injectDS2Js()
  }


  /**
   * 添加注入桥接接口对象
   */
  addJavascriptObject = (obj: object, namespace: string = '') => {
    if (obj) {
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

  /**
   * 判断JS方法是否存在
   * @param method
   * @returns
   */
  hasJavascriptMethod(method: string): Promise<boolean> {
    return this.bridge.hasJavascriptMethod(method)
  }



  /**
   * 调用JS方法，有参数
   * @param method
   * @param args
   * @param jsReturnValueHandler
   */
  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue) {
    this.bridge.callJs(method, args, jsReturnValueHandler)
  }


  /**
   * 调用JS方法，无参数
   * @param method
   * @param jsReturnValueHandler
   */
  callJsNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callJsNoParam(method, jsReturnValueHandler)
  }

  /**
   * 调用JS方法，有参数
   * @param method
   * @param args
   * @param jsReturnValueHandler
   */
  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callHandler(method, args, jsReturnValueHandler)
  }

  /**
   * 调用JS方法，无参数
   * @param method
   * @param jsReturnValueHandler
   */
  callHandlerNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void {
    this.bridge.callHandlerNoParam(method, jsReturnValueHandler)
  }


  /**
   * 设置关闭页面监听
   * @param listener
   */
  setClosePageListener(listener: OnCloseWindowListener) {
    this.bridge.setClosePageListener(listener)
  }


  /**
   * 回收资源
   */
  destroy() {
    this.javaScriptNamespaceInterfaces.clear()
    this.bridge.destroy()
  }

  /**
   * 运行JS脚本
   * @param script
   * @returns
   */
  runJavaScript(script: string): Promise<string> {
    return this.controller.runJavaScript(script);
  }

  /**
   * 注册JavaScript代理，不建议使用
   * @param object
   * @param name
   * @param methodList
   */
  registerJavaScriptProxy(object: object, name: string, methodList: string[]) {
    this.controller.registerJavaScriptProxy(object, name, methodList);
    this.refresh()
  }

  refresh() {
    this.controller.refresh()
  }

  /**
   * @deprecated
   * @see webviewController
   * @returns
   */
  getWebViewController(): webview.WebviewController {
    return this.controller
  }

  /**
   * 获取webview控制器
   * @returns
   */
  get webviewController(): webview.WebviewController {
    return this.controller
  }

  /**
   * 获取JavaScript代理
   * @deprecated
   * @see javaScriptProxy
   * @returns
   */
  getJavaScriptProxy(): JavaScriptProxy {
    let javaScriptProxy: JavaScriptProxy = {
      object: this.bridge.javaScriptProxy().object,
      name: this.bridge.javaScriptProxy().name,
      methodList: this.bridge.javaScriptProxy().methodList,
      controller: this.controller
    }
    return javaScriptProxy
  }

  /**
   * 获取JavaScript代理对象
   * @returns
   */
  get javaScriptProxy(): JavaScriptProxy {
    return {
      object: this.bridge.javaScriptProxy().object,
      name: this.bridge.javaScriptProxy().name,
      methodList: this.bridge.javaScriptProxy().methodList,
      controller: this.controller
    }
  }


  /**
   * 创建代理
   * @param obj 要注入的对象
   * @returns
   */
  static createController(obj?: object): WebViewControllerProxy {
    return new WebViewControllerProxy(new webview.WebviewController(), obj)
  }

  /**
   * 创建代理
   * @param controller webview控制器
   * @param obj 要注入的对象
   * @returns
   */
  static createProxy(controller: webview.WebviewController, obj?: object): WebViewControllerProxy {
    return new WebViewControllerProxy(controller, obj)
  }
}

/**
 * 鸿蒙webview相关的api
 */
export interface IOhosWebviewController {
  /**
   * @deprecated
   * @returns
   */
  getWebViewController(): webview.WebviewController

  /**
   * @deprecated
   * @returns
   */
  getJavaScriptProxy(): JavaScriptProxy

  get webviewController(): webview.WebviewController

  get javaScriptProxy(): JavaScriptProxy
}

export interface JavaScriptProxy {
  object: JsInterface,
  name: string,
  methodList: Array<string>,
  controller: webview.WebviewController
}