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
  OnCloseWindowListener,
  Args
} from './Entity'
import "reflect-metadata"
import Prompt from '@system.prompt'
import { LogUtils } from '../utils/LogUtils'
import router from '@ohos.router'
import { IBaseBridge, IWebViewControllerProxy } from './WebViewInterface'
import { ToastUtils } from '../utils/ToastUtils'

export class BaseBridge implements JsInterface, IBaseBridge {
  private controller: IWebViewControllerProxy
  private name: string = "_dsbridge"
  private isInject: boolean = true
  private callID: number = 0
  private handlerMap = new Map<number, OnReturnValue>()
  private jsClosePageListener?: OnCloseWindowListener
  private interrupt = false


  setWebViewControllerProxy(controller: IWebViewControllerProxy){
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
   * @param pexport arams js参数 对应实体类Parameter
   * @returns 如果同步调用，则result#code == 0, 异步返回值result值是没有意义的
   */
  call = (methodName: string, params: string): string => {
    const  error = "Js bridge  called, but can't find a corresponded " +
                    "JavascriptInterface object , please check your code!"
    let result: CallResult = { code: -1 }
    if (!methodName) {
      return this.handlerError(result, error)
    }
    const m = this.parseNamespace(methodName)
    const obj = this.controller.javaScriptNamespaceInterfaces.get(m[0])
    methodName = m[1]
    LogUtils.d(this + " " + methodName + " " + params  + ' ' + obj)
    if (obj == null || obj === undefined) {
      return this.handlerError(result, error)
    }
    // const prototype = Reflect.getPrototypeOf(this);
    const method = Reflect.get(obj != undefined && obj != null  ? obj : this, methodName);

    if (typeof method !== 'function') {
      const err = `call failed: ${methodName} is not a method attribute or is not defined`
      return this.handlerError(result, err)
    }
    let async: boolean = false
    if (method != null && method !== undefined) {
      const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
      if (!decorator) {
        const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
        return this.handlerError(result, err)
      }
      async = <boolean> Reflect.getMetadata(MetaData.ASYNC, method)?? false
    } else {
      const err = `call failed: native undefined ${methodName} method`
      return this.handlerError(result, err)
    }

    if (method != null) {
      let jsParam: Parameter = this.safeParse(params)
      // todo 待优化
      async = (jsParam._dscbstub != null && jsParam._dscbstub !== undefined) || async
      LogUtils.d("async: " + async + " --- " + methodName)
      let data: string = (this.isObject(jsParam.data) ? JSON.stringify(jsParam.data) : jsParam.data) as string
      if (async) {
        method.call(obj, data, <CompleteHandler> {
          complete: (value: Args) => {
            result.code = 0
            result.data = value
            this.callbackToJs(jsParam, result)
          },
          setProgressData: (value: Args) => {
            result.code = 0
            result.data = value
            this.callbackToJs(jsParam, result, false)
          },

        })
      } else {
        const r = method.call(obj, data);
        result.code = 0
        result.data = r
      }

    } else {
      const err = `call failed: native undefined ${methodName} method`
      result.errMsg = err
    }
    return JSON.stringify(result)

  }


  private handlerError(result: CallResult, err: string) {
    result.errMsg = err
    LogUtils.e(err)
    ToastUtils.show(err)
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

  callHandlerWithoutParam(method: string, jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, [], jsReturnValueHandler)
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
        type: 'syn' | 'asyn' | 'all'
      } = JSON.parse(param);
      const m = this.parseNamespace(p.name)
      let methodName = m[1]
      const obj = this.controller.javaScriptNamespaceInterfaces.get(m[0])
      const method = Reflect.get(obj != null && obj != undefined ? obj : this, methodName);
      LogUtils.d(this + " " + methodName + " " + param  + ' ' + obj)
      if (typeof method !== 'function') {
        const err = `call failed: ${methodName} is not a method attribute or is not defined`
        result.msg = err
      } else {
        if (method != null) {
          const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
          if (!decorator) {
            const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
            result.msg = err
          } else {
            const async = <boolean> Reflect.getMetadata(MetaData.ASYNC, method)?? false
            result.code = (async && p.type==='syn') || (!async && p.type==='asyn') ? 1 : 0
          }
        } else {
          const err = `call failed: ${methodName} native method does not exist`
          result.msg = err
        }
      }

    } catch (e) {
      result.msg = e
    }

    return result.code === 0
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