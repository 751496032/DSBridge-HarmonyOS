import { Args, JavaScriptProxy, OnCloseWindowListener, OnReturnValue } from './Entity';

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

// export interface IAttachProxy {
//   setWebViewControllerProxy(controller: IWebViewControllerProxy)
//   javaScriptProxy(): JavaScriptProxy
// }

export interface IBaseBridge  {
  destroy(): void;

  callJs(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  callJsMethodWithoutParam(method: string, jsReturnValueHandler?: OnReturnValue): void

  setClosePageListener(listener: OnCloseWindowListener): void

  hasJavascriptMethod(method: string): Promise<boolean>

  callHandler(method: string, args?: Args[], jsReturnValueHandler?: OnReturnValue): void

  callHandlerWithoutParam(method: string, jsReturnValueHandler?: OnReturnValue): void
}


