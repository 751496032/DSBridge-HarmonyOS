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
  Args,
  OnErrorMessageListener,
  NativeMethodParam
} from './Entity'
import "reflect-metadata"
import { LogUtils } from '../utils/LogUtils'
import router from '@ohos.router'
import { IBaseBridge, IWebViewControllerProxy } from './WebViewInterface'
import { ToastUtils } from '../utils/ToastUtils'
import { JSON } from '@kit.ArkTS'

export class BaseBridge implements JsInterface, IBaseBridge {

  private controller: IWebViewControllerProxy
  private name: string = "_dsbridge"
  private isInject: boolean = true
  private callID: number = 0
  private handlerMap = new Map<number, OnReturnValue>()
  private jsClosePageListener?: OnCloseWindowListener
  private interrupt = false
  private _isSupportDS2: boolean = false


  private onErrorListener?: OnErrorMessageListener

  supportDS2(enable: boolean): void {
    this._isSupportDS2 = enable
  }

  public get isSupportDS2(): boolean {
    return this._isSupportDS2
  }

  setWebViewControllerProxy(controller: IWebViewControllerProxy){
    this.controller = controller
  }

  setGlobalErrorMessageListener(listener: OnErrorMessageListener): void {
    this.onErrorListener = listener
  }


  javaScriptProxy(): JavaScriptProxy {
    let list = this._isSupportDS2 ? ['call', 'returnValue'] : ['call']
    return <JavaScriptProxy> {
      object: this,
      name: this.name,
      methodList: list,
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

  private isNotEmpty(val: Object): boolean {
    return !this.isEmpty(val)
  }

  private isEmpty(val: Object): boolean {
    let isEmpty = val === undefined || val === null
    if (typeof val === 'string') {
      return isEmpty || val.trim().length <= 0
    }
    return isEmpty
  }


  /**
   *
   * @param methodName 原生方法名
   * @param params js携带的参数 对应实体类Parameter
   * @returns result#code == 0, 则整个流程正常调用
   */
  call = (methodName: string, params: string): string => {
    const error = "Js bridge  called, but can't find a corresponded " +
      "JavascriptInterface object , please check your code!"
    let result: CallResult = { code: -1 }
    if (this.isEmpty(methodName)) {
      return this.handlerError(result, error)
    }
    const m = this.parseNamespace(methodName)
    const obj = this.controller.javaScriptNamespaceInterfaces.get(m[0])
    methodName = m[1]
    LogUtils.d("call methodName: " + methodName + " params: " + params + ' ' + (obj === this))
    if (this.isEmpty(obj)) {
      return this.handlerError(result, error)
    }
    const method = Reflect.get(this.isNotEmpty(obj) ? obj : this, methodName);

    if (typeof method !== 'function') {
      const err = `call failed: ${methodName} is not a method  or is not defined`
      return this.handlerError(result, err)
    }
    let async: boolean = false
    if (this.isNotEmpty(method)) {
      const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
      if (!decorator) {
        const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
        return this.handlerError(result, err)
      }
      async = <boolean> Reflect.getMetadata(MetaData.ASYNC, method) ?? false
    } else {
      const err = `call failed:  【${methodName}】 method is undefined `
      return this.handlerError(result, err)
    }

    let jsParam: Parameter = this.safeParse(params)
    async = (this.isNotEmpty(jsParam._dscbstub)) || async
    LogUtils.d(`call async: ${async}`)
    let data: string = (this.isObject(jsParam.data) ? JSON.stringify(jsParam.data) : jsParam.data) as string
    if (this._isSupportDS2) {
      if (async) {
        let newParam = this.safeParse(JSON.stringify(jsParam))
        delete newParam._dscbstub
        data = JSON.stringify(newParam)
      } else {
        data = params
      }

    }
    if (async) {
      const handler = <CompleteHandler> {
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

      }
      try {
        let len = method.length

        if (len === 0) {
          result.code = 0
          method.call(obj)
        } else if (len === 1) {
          result.code = 0
          method.call(obj, handler)
        } else if (len === 2) {
          result.code = 0
          method.call(obj, data, handler)
        } else {
          const err = `call failed: (${methodName}) method parameter number error`
          return this.handlerError(result, err)
        }
      } catch (e) {
        return this.handlerError(result, JSON.stringify(e))
      }

    } else {
      const r = method.call(obj, data);
      result.code = 0
      result.data = r
    }

    return this._isSupportDS2 ? result.data?.toString() : JSON.stringify(result)

  }


  private handlerError(result: CallResult, err: string) {
    result.errMsg = err
    LogUtils.e(err)
    // 不再弹出toast，由业务自行处理
    // ToastUtils.show(err)
    this.onErrorListener?.(err)
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
    if (this.isEmpty(json)) {
      return data
    }

    try {
      data = JSON.parse(json)
    } catch (e) {
      LogUtils.e(e)
      const msg = JSON.stringify(e)
      this.handlerError({ errMsg: msg } as CallResult, msg)
    }
    return data

  }

  private callbackToJs = (jsParam: Parameter, result: CallResult, complete: boolean = true) => {
    if (this.interrupt) return;
    let args = JSON.stringify(result)
    let callbackName = jsParam._dscbstub
    LogUtils.d(`callbackToJs : ${callbackName}(${args})`)
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
    let script = `(window._dsf.${method}||window.${method}).apply(window._dsf||window,${JSON.stringify(args)})`
    if (jsReturnValueHandler != null) {
      if (this._isSupportDS2) {
        script = `${this.name}.returnValue(${callInfo.callbackId},${script})`
      }
      this.handlerMap.set(callInfo.callbackId, jsReturnValueHandler)
    }
    if (this._isSupportDS2) {
      this.controller.runJavaScript(script)
    }else {
      const arg = JSON.stringify(callInfo)
      this.controller.runJavaScript(`window._handleMessageFromNative(${arg})`)
    }

  }

  callJsNoParam(method: string, jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, [], jsReturnValueHandler)
  }

  callHandler(method: string, args?: any[], jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, args, jsReturnValueHandler)
  }

  callHandlerNoParam(method: string, jsReturnValueHandler?: OnReturnValue) {
    this.callJs(method, [], jsReturnValueHandler)
  }

  hasJavascriptMethod(method: string): Promise<boolean> {
    if (this.checkIfDS2()) {
      return
    }
    return new Promise((resolve, reject) => {
      let handler: OnReturnValue = (has: boolean) => {
        resolve(has)
      }
      this.callHandler("_hasJavascriptMethod", [method], handler)
    })
  }


  @JavaScriptInterface(false)
  private returnValue(param: string, value?: string) {
    if (this._isSupportDS2) {
      let id = Number.parseInt(param)
      if (id && this.handlerMap.has(id)) {
        let handler = this.handlerMap.get(id)
        handler(value)
        this.handlerMap.delete(id)
      }
      return
    }
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
    if (this.checkIfDS2()) {
      return
    }
    const result: {
      code: number,
      msg: string
    } = { code: -1, msg: "" };
    try {
      const p = JSON.parse(param) as NativeMethodParam
      const m = this.parseNamespace(p.name)
      let methodName = m[1]
      const obj = this.controller.javaScriptNamespaceInterfaces.get(m[0])
      const method = Reflect.get(this.isNotEmpty(obj) ? obj : this, methodName);
      LogUtils.d(this + " " + methodName + " " + param  + ' ' + obj)
      if (typeof method !== 'function') {
        const err = `call failed: ${methodName} is not a method  or is not defined`
        result.msg = err
      } else {
        if (this.isNotEmpty(method)) {
          const decorator = Reflect.getMetadata(MetaData.METHOD_DECORATE, method)
          if (!decorator) {
            const err = `call failed: please add @JavaScriptInterface decorator in the ${methodName} method`
            result.msg = err
          } else {
            const async = <boolean> Reflect.getMetadata(MetaData.ASYNC, method) ?? false
            result.code = (async && p.type === 'syn') || (!async && p.type === 'asyn') ? 1 : 0
          }
        } else {
          const err = `call failed: ${methodName} method does not exist`
          result.msg = err
        }
      }

    } catch (e) {
      result.msg = e
    }
    if (this.isNotEmpty(result.msg)) {
      LogUtils.e(result.msg)
      this.handlerError({ errMsg: result.msg } as CallResult, result.msg)
    }
    return result.code === 0
  }

  setClosePageListener(listener: OnCloseWindowListener) {
    this.jsClosePageListener = listener
  }

  @JavaScriptInterface(false)
  private closePage(param: any) {
    if (this.checkIfDS2()) {
      return
    }
    if (this.jsClosePageListener == null || this.jsClosePageListener() === true) {
      router.back()
      this.destroy()
    }
  }

  private checkIfDS2(): boolean {
    if (this._isSupportDS2) {
      ToastUtils.show('DS2.0脚本不支持该功能，请前端引入DS3.0脚本')
      return true
    }
    return false
  }

  destroy(){
    this.interrupt = true
    this.jsClosePageListener = null
    this.handlerMap.clear()
    this._isSupportDS2 = false
    this.onErrorListener = null
  }

  injectDS2Js(){
    if (this._isSupportDS2) {
      let script =
        "function getJsBridge(){window._dsf=window._dsf||{};return{call:function(b,a,c){\"function\"==typeof a&&(c=a,a={});if(\"function\"==typeof c){window.dscb=window.dscb||0;var d=\"dscb\"+window.dscb++;window[d]=c;a._dscbstub=d}a=JSON.stringify(a||{});return window._dswk?prompt(window._dswk+b,a):\"function\"==typeof _dsbridge?_dsbridge(b,a):_dsbridge.call(b,a)},register:function(b,a){\"object\"==typeof b?Object.assign(window._dsf,b):window._dsf[b]=a}}}dsBridge=getJsBridge();"
       this.controller.runJavaScript(script)
    }

  }

}