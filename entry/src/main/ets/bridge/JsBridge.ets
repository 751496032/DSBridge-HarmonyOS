import { LogUtils } from '../utils/LogUtils';
import { BaseSendable, CompleteHandler, JavaScriptInterface, sleep } from '@hzw/ohos-dsbridge';

@Sendable
export class Param  extends BaseSendable{
  private a : number = 0
  private b : number = 0
  public sum: number = 0

  constructor(a: number, b: number) {
    super();
    this.a = a;
    this.b = b;
  }

  async run(): Promise<void> {
    this.sum =  await this.add()
    let currentTime = Date.now()
    while (Date.now() - currentTime < 5000) {

    }
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
   * 同步方法中使用Promise
   * @param args
   * @returns
   */
  @JavaScriptInterface(false)
  testSleep(args: string): number {
    let p = new Param(100, 200)
    let p1 = new Param(100, 300)
    sleep(p)
    sleep(p1)
    LogUtils.d(`testSleep sum: ${p.sum}  ${p1.sum}`)
    return p.sum + p1.sum
  }

  /**
   * 异步模版
   * @param p
   * @param handler
   */
  @JavaScriptInterface()
  testAsync(p: string, handler: CompleteHandler) {
    LogUtils.d("testAsync: " + JSON.stringify(p))
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

