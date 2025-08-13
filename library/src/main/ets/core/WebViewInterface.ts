import { Args, JavaScriptProxy, OnCloseWindowListener, OnReturnValue,OnErrorMessageListener } from './Entity';

/**
 * webview相关的代理接口，定义时不能涉及到鸿蒙的相关属性
 */
export interface IWebViewControllerProxy {

  readonly javaScriptNamespaceInterfaces: Map<string, object>

  runJavaScript(script: string): Promise<string>

  /**
   * @deprecated
   * @param object
   * @param name
   * @param methodList
   */
  registerJavaScriptProxy(object: object, name: string, methodList: Array<string>): void;

  refresh(): void;

}



export interface IBaseBridge  {

  /**
   * 是否支持DSBridge2.0脚本
   * @param enable true：使用2.0脚本，false: 3.0脚本是默认的
   */
  supportDS2(enable: boolean): void

  /**
   * 回收资源
   */
  destroy(): void;

  /**
   * 调用js有参数的方法
   * @param method
   * @param args
   * @param jsReturnValueHandler
   */
  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  /**
   * 调用js无参数的方法
   * @param method
   * @param jsReturnValueHandler
   */
  callJsNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void

  /**
   * 设置关闭页面监听
   * @param listener
   */
  setClosePageListener(listener: OnCloseWindowListener): void

  /**
   * 判断js方法是否存在
   * @param method
   * @returns
   */
  hasJavascriptMethod(method: string): Promise<boolean>
  /**
   * 调用js有参数的方法
   * @param method
   * @param args
   * @param jsReturnValueHandler
   */
  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  /**
   * 调用js无参数的方法
   * @param method
   * @param jsReturnValueHandler
   */
  callHandlerNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void

  /**
   * 设置全局错误监听
   * @param listener
   */
  setGlobalErrorMessageListener(listener: OnErrorMessageListener): void
}


