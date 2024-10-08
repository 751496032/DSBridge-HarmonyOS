import { LogUtils } from '../utils/LogUtils';
import { BaseSendable, CompleteHandler, JavaScriptInterface, taskWait } from '@hzw/ohos-dsbridge';
import { ToastUtils } from '@hzw/ohos-dsbridge/src/main/ets/utils/ToastUtils';

@Sendable
export class Param  extends BaseSendable{
  private a : number = 0
  private b : number = 0
  public sum: number = 0
  public enableLog: boolean = true

  constructor(a: number, b: number) {
    super();
    this.a = a;
    this.b = b;
  }

  async run(): Promise<void> {
    // let currentTime = Date.now()
    // while (true) {
    //   if (Date.now() - currentTime > 5000) {
    //       break
    //   }
    // }
    // throw new Error("ddd")
    // this.sum =  await this.add()
    // let target = this
    // this.sum = await new Promise<number>(async (resolve, reject) => {
    //   let sum = this.add()
    //   resolve(sum)
    // })
    this.sum = await this.addTest()

  }

  async addTest() :Promise<number>{
    return  new Promise<number>(async (resolve, reject) => {
      let sum = this.add()
      resolve(sum)
    })
  }

  async add(){
    return this.a + this.b
  }


}

export class JsBridge {
  private cHandler?: CompleteHandler

  /**
   * 同步模版
   * @param p
   * @returns
   */
  @JavaScriptInterface(false)
  testSync(p: string): string {
    LogUtils.d("testSync: " + JSON.stringify(p))
    return "原生同步testSync方法返回的数据"
  }

  /**
   * 同步方法中执行异步并发任务
   * @param args
   * @returns
   */
  @JavaScriptInterface(false)
  testTaskWait(args: string): number {
    let p = new Param(100, 200)
    let p1 = new Param(100, 300)
    taskWait(p)
    p1.tag = "Param"
    taskWait(p1)
    LogUtils.d(`testTaskWait sum: ${p.sum}  ${p1.sum}`)
    return p.sum + p1.sum
  }

  @JavaScriptInterface(false)
  testNoArg(): boolean {
    LogUtils.d('testNoArg')
    return true
  }

  @JavaScriptInterface()
  testNoArgAsync() {
    LogUtils.d('testNoArgAsync')
    ToastUtils.show("testNoArgAsync")
  }

  /**
   * 异步模版
   * @param args
   * @param handler
   */
  @JavaScriptInterface()
  testAsync(args: string, handler: CompleteHandler) {
    LogUtils.d("testAsync: " + JSON.stringify(args))
    this.cHandler = handler
    this.countdown(5, (time:number) => {
      if (time === 0) {
        handler.complete("原生异步testAsync方法返回的数据--结束")
        handler.complete("原生异步testAsync方法返回的数据--结束2") // 不会被调用 会报错 Uncaught ReferenceError: xxx is not defined
      } else {
        handler.setProgressData("原生异步testAsync方法返回的数据--" + time)
      }
    })


  }

  countdown(seconds: number, callback: (counter: number) => void) {
    let count = seconds;
    const interval = setInterval(() => {
      if (count === 0) {
        clearInterval(interval);
        LogUtils.d("Finished");
        return;
      }
      count--
      callback(count)
    }, 1000);
  }
}

