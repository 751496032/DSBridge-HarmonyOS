import { JavaScriptProxy, OnCloseWindowListener, OnReturnValue } from './Entity2';

export interface WebViewInterface {
  runJavaScript(script: string): Promise<string>

  registerJavaScriptProxy(object: object, name: string, methodList: Array<string>): void;

  refresh(): void;

}

export interface IBridge {

  setWebViewControllerProxy(controller: WebViewInterface)

  javaScriptProxy(): JavaScriptProxy

  destroy(): void;

  callJs(method: string, args?: any[], jsReturnValueHandler?: OnReturnValue)

  setClosePageListener(listener: OnCloseWindowListener): void

  hasJavascriptMethod(method: string): Promise<boolean>

  callHandler(method: string, args?: any[], jsReturnValueHandler?: OnReturnValue)

}