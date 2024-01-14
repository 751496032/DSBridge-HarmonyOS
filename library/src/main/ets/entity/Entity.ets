import "reflect-metadata"
export interface  JavaScriptProxy{
  object: JsInterface,
  name: string,
  methodList: Array<string>,
  controller: WebviewController
}

/**
 * 在js中统一用JavaScriptProxy#name来调用原生的call(x,x)方法
 */
export interface JsInterface {
/**
 * @param methodName  JS实际调用原生的方法
 * @param params  JS携带过来的参数，有一个callbackID参数
 * @returns
 */
  call(methodName: string, params: string): any
}


export interface CallResult {
  code: number,
  data?: string | boolean | number,
  errMsg?: string,
  async?: boolean,
}

export interface Parameter {
  data?: string | Object,
  _dscbstub?: string, // JS callback函数名称 ，挂载到window对象中
}

export interface CompleteHandler {
  /**
   * 只能使用一次
   * @param value
   */
  complete(value: string | boolean | number)
  /**
   * 可以使用多次
   * @param value
   */
  setProgressData(value: string | boolean | number)
}

export enum MetaData {
  METHOD_DECORATE = "bridge:JavaScriptInterface",
  ASYNC = "bridge:Async"
}

/**
 * @param asyncCall
 * @returns
 */
export function JavaScriptInterface(asyncCall: boolean = true): MethodDecorator {
  return (target, propertyKey, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(MetaData.METHOD_DECORATE, propertyKey, descriptor.value !)
    Reflect.defineMetadata(MetaData.ASYNC, asyncCall, descriptor.value !)
  }
}


export interface NativeCallInfo {
  data: string,
  callbackId: number,
  method: string
}

export type OnReturnValue = (any) => void

export type OnCloseWindowListener = () => boolean

