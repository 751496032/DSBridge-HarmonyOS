import { Args, JavaScriptProxy, OnCloseWindowListener, OnReturnValue,OnErrorMessageListener } from './Entity';

/**
 * web组件api的代理接口，不能涉及到ohos的相关属性
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

  destroy(): void;

  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  callJsNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void

  setClosePageListener(listener: OnCloseWindowListener): void

  hasJavascriptMethod(method: string): Promise<boolean>

  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  callHandlerNoParam(method: string, jsReturnValueHandler?: OnReturnValue): void

  setGlobalErrorMessageListener(listener: OnErrorMessageListener): void
}


