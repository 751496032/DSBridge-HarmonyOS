import webview from '@ohos.web.webview'
import {
  CallResult,
  MetaData,
  JsInterface,
  JavaScriptProxy,
  Parameter,
  NativeCallInfo,
  OnReturnValue,
  CompleteHandler,
  JavaScriptInterface,
  OnCloseWindowListener
} from './Entity2'
import "reflect-metadata"
import Prompt from '@system.prompt'
import { LogUtils } from '../utils/LogUtils2'
import router from '@ohos.router'
import { IBridge, WebViewInterface } from './WebViewInterface'

export class BaseBridge2 implements JsInterface, IBridge {
  private controller: WebViewInterface
  private name: string = "_dsbridge"
  private isInject: boolean = true
  private callID: number = 0
  private handlerMap = new Map<number, OnReturnValue>()
  private jsClosePageListener?: OnCloseWindowListener
  private interrupt = false

  constructor() {
  }

   setWebViewControllerProxy(controller: WebViewInterface){
     this.controller = controller
   }


   javaScriptProxy(): JavaScriptProxy {
    return <JavaScriptProxy> {
      object: this,
      name: this.name,
      methodList: ['call'],
      controller: this.controller
    }
  }

  /**
   * @deprecated
   */
  injectJavaScript = (name: string) => {
    if (this.isInject) {
      this.controller.registerJavaScriptProxy(this, name,
        ['call'])
      this.controller.refresh()
      this.isInject = false
    }

  }

  private isObject(val: Object) {
    return val !== null && typeof val === 'object';
  }


  /**
   *
   * @param methodName 原生方法名
   * @param params js参数 对应实体类Parameter
   * @returns 如果同步调用，则result#code == 0, 异步返回值result则是没有意义
   */
  call = (methodName: string, params: string): any => {
    const m = this.parseNamespace(methodName)
    methodName = m[1]
    LogUtils.d(this + " " + methodName + " " + params)
    let result: CallResult = { code: -1 }
    // const prototype = Reflect.getPrototypeOf(this);
    const method = Reflect.get(this,methodName) as Function ;

    let async: boolean = false
    if (method != null && method !== undefined) {
      const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
      if (!decorator) {
        const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
        throw new Error(err)
      }
      async = <boolean> Reflect.getMetadata(MetaData.ASYNC, method)?? false
    } else {
      Prompt.showToast({ message: `原生${methodName}方法未定义` })
    }

    if (method != null) {
      let jsParam: Parameter = this.safeParse(params)
      async = (jsParam._dscbstub != null && jsParam._dscbstub !== undefined) || async
      LogUtils.d("async: " + async + " --- " + methodName)
      let data: string = (this.isObject(jsParam.data) ? JSON.stringify(jsParam.data) : jsParam.data) as string
      if (async) {
        method.call(this, data, <CompleteHandler> {
          complete: (value: string | boolean | number) => {
            result.code = 0
            result.data = value
            this.callbackToJs(jsParam, result)
          },
          setProgressData: (value: string | boolean | number) => {
            result.code = 0
            result.data = value
            this.callbackToJs(jsParam, result, false)
          },

        })
      } else {
        const r = method.call(this, data);
        result.code = 0
        result.data = r
        // // js检查原生方法是否存在
        // if (methodName.includes("hasNativeMethod")) {
        //   return r.code === 0
        // }
      }

    } else {
      const err = `call failed: ${methodName} native method does not exist`
      result.errMsg = err
    }
    return JSON.stringify(result)

  }

  private parseNamespace(method: string): string[] {
    let pos = method.lastIndexOf('.')
    let namespace = ''
    if (pos != -1) {
      namespace = method.substring(0, pos)
      method = method.substring(pos + 1)
    }
    return [namespace, method]
  }

  private safeParse(json: string): Parameter {
    let data: Parameter = {}
    if (!json || json === undefined) {
      return data
    }

    try {
      data = JSON.parse(json)
    } catch (e) {
      LogUtils.e(e)
    }
    return data

  }

  private callbackToJs = (jsParam: Parameter, result: CallResult, complete: boolean = true) => {
    if (this.interrupt) return;
    let args = JSON.stringify(result)
    let callbackName = jsParam._dscbstub
    LogUtils.d(`${callbackName}(${args})`)
    let script = `${callbackName}(${args}.data);`
    if (complete) {
      script += "delete window." + callbackName
    }
    this.controller.runJavaScript(script)
  }

  callJs(method: string, args?: any[], jsReturnValueHandler?: OnReturnValue) {
    if (this.interrupt) return;
    const callInfo = <NativeCallInfo> {
      method,
      callbackId: ++this.callID,
      data: args ? JSON.stringify(args) : ''
    }
    if (jsReturnValueHandler != null) {
      this.handlerMap.set(callInfo.callbackId, jsReturnValueHandler)
    }
    const callInfoStr = JSON.stringify(callInfo)
    this.controller.runJavaScript(`window._handleMessageFromNative(${callInfoStr})`)
  }

  callJsMethodWithoutParam(method: string, jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, [], jsReturnValueHandler)
  }

  callHandler(method: string, args?: any[], jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, args, jsReturnValueHandler)
  }

  hasJavascriptMethod(method: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let handler: OnReturnValue = (has: boolean) => {
        resolve(has)
      }
      this.callHandler("_hasJavascriptMethod", [method], handler)
    })
  }


  @JavaScriptInterface(false)
  private returnValue(param: string) {
    let p: {
      id?: number,
      complete?: boolean,
      data?: any
    } = JSON.parse(param)
    if (p.id && this.handlerMap.has(p.id)) {
      let handler = this.handlerMap.get(p.id)
      handler(p.data)
      if (p.complete) {
        this.handlerMap.delete(p.id)
      }

    }

  }

  @JavaScriptInterface(false)
  private dsinit(param: string) {

  }

  @JavaScriptInterface(false)
  private hasNativeMethod(param: string): boolean {
    const result: {
      code: number,
      msg: string
    } = { code: -1, msg: "" };
    try {
      const p: {
        name: string,
        type
      } = JSON.parse(param);
      const m = this.parseNamespace(p.name)
      let methodName = m[1]
      const prototype = Reflect.getPrototypeOf(this);
      const method = prototype[methodName];
      if (method != null) {
        const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
        if (!decorator) {
          const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
          result.msg = err
        } else {
          result.code = 0
        }
      } else {
        const err = `原生${methodName}方法未定义`
        result.msg = err
      }
    } catch (e) {
      result.msg = e
    }

    return result.code ===0
  }

  setClosePageListener(listener: OnCloseWindowListener) {
    this.jsClosePageListener = listener
  }

  @JavaScriptInterface(false)
  private closePage(param: any) {
    if (this.jsClosePageListener == null || this.jsClosePageListener() === true) {
      router.back()
      this.destroy()
    }
  }

  destroy(){
    this.interrupt = true
    this.jsClosePageListener = null
    this.handlerMap.clear()
  }

}






