
## 介绍

HarmonyOS版的DSBridge，通过本库可以在鸿蒙原生与JavaScript完成交互，可以相互调用彼此的功能。

目前兼容Android、iOS第三方DSBridge库的核心功能，基本保持原来的使用方式，后续会持续迭代保持与DSBridge库相同的功能，减少前端和客户端的适配工作，另外也会根据鸿蒙的特性做一些定制需求。

特性：

- **已适配鸿蒙NEXT版本；**
- **支持原生同步方法内执行串行异步并发任务，同步等待异步结果，根据鸿蒙特点设计的需求；**
- **兼容DSBridge2.0与3.0 JS脚本；**
- 支持以类的方式集中统一管理API，也支持原生自定义页面组件直接注册使用；
- 支持同步和异步调用；
- 支持进度回调/回传：一次调用，多次返回；
- 支持API是否存在检测；
- 支持Javascript关闭页面的监听与拦截，
- 支持命名空间API。


源码：

* [DSBridge-HarmonyOS](https://github.com/751496032/DSBridge-HarmonyOS)
* [DSBridge-Android](https://github.com/wendux/DSBridge-Android)
* [DSBridge-IOS](https://github.com/wendux/DSBridge-IOS)


>由于DSBridge库作者已停止维护，Android端建议使用 https://github.com/751496032/DSBridge-Android ，目前本人在维护。


## 安装

安装库：

```text
ohpm install @hzw/ohos-dsbridge
```

或者安装本地har包

```text
ohpm install ../libs/library.har
```

## 基本用法

### ArkTS原生侧

1、在原生新建一个类`JsBridge`，实现业务API
, 通过类来集中统一管理API，方法用`@JavaScriptInterface()`标注，是不是很眼熟呢，加一个`@JavaScriptInterface()`标注主要为了使用规范，是自定义的装饰器，与Android保持一致性。
```typescript
export class JsBridge{
  private cHandler: CompleteHandler = null

  /**
   * 同步
   * @param p
   * @returns
   */
  @JavaScriptInterface(false)
  testSync(p: string): string {
    LogUtils.d("testSync: " + JSON.stringify(p))
    return "hello native"
  }

  /**
   * 异步
   * @param p
   * @param handler
   */
  @JavaScriptInterface()
  testAsync(p: string, handler: CompleteHandler) {
    LogUtils.d("testAsync: " + JSON.stringify(p))
    this.cHandler = handler
  }
}
```

如果你不希望用一个类来管理API接口，可以在自定义页面组件Component中直接注册使用，然后在组件内定义API接口。

```typescript
@Component
@Entry
struct UseInComponentsPage{
  aboutToAppear()
  {
    // 在一个组件内只能存在一个无命名空间
    this.controller.addJavascriptObject(this)
    
  }

  @JavaScriptInterface(false)
  testComponentSync(args: string): string {
      return `组件中的同步方法: ${args}`
  }

  @JavaScriptInterface()
  testComponentAsync(args: string, handler: CompleteHandler) {
     handler.complete(`组件中的异步方法: ${args}`)
  }

}


```

**API同步方法是不支持用async/await声明，如果需要在同步方法内执行异步任务，可以使用`taskWait()`函数来加持完成，下面会介绍基本用法**；异步方法的形参`CompleteHandler`，可用于结果异步回调。

2、在原生Web组件初始化时，通过`WebViewControllerProxy`类来获取`WebviewController`实例来实现JS注入，然后将其关联到Web组件中，接着将API管理类(JsBridge)关联到`WebViewControllerProxy`中。

```typescript
private controller: WebViewControllerProxy = WebViewControllerProxy.createController()

aboutToAppear() {
  this.controller.addJavascriptObject(new JsBridge())
}


Web({ src: this.localPath, controller: this.controller.getWebViewController() })
  .javaScriptAccess(true)
  .javaScriptProxy(this.controller.getJavaScriptProxy())
  .onAlert((event) => {
    // AlertDialog.show({ message: event.message })
    return false
  })

)        

```

3、通过`WebViewControllerProxy`调用JavaScript函数。

```typescript
Button("调用js函数-同步")
        .onClick(() => {
          this.controller.callJs("showAlert", [1, 2, '666'], (v) => {
            this.msg = v + ""
          })
        })

      Button("调用js函数-异步")
        .onClick(() => {
          this.controller.callJs("showAlertAsync", [1, 2, '666'], (v) => {
            this.msg = v + ""
          })
        })
    }
```

`callJs()`方法有三个形参，第一个是Js注册的函数名称，第二个是Js接收函数的参数，是一个数组类型，第三个是监听Js函数返回结果的函数。
另外也提供了与Android库一样调用函数`callHandler()`。


如果前端使用的是DSBridge2.0的JS脚本，可以通过supportDS2()方法来兼容，如下：

```typescript
  aboutToAppear() {
    // 如果是使用DSBridge2.0 ，调用supportDS2方法
    this.controller.supportDS2(true)
    // 以下两种注册方式都可以，任选其一
    this.controller.addJavascriptObject(this)
    // this.controller.addJavascriptObject(new JsBridge2())
    // DS2.0脚本不支持API命令空间
    // this.controller.addJavascriptObject(new JsBridge2(),'js2')
    // 开启调试模式
    webview.WebviewController.setWebDebuggingAccess(true);
  }
```



### JavaScript侧

1、在JavaScript中初始化dsBridge，通过cdn或者npm安装都可以。

如果项目没有历史包袱，建议直接用`m-dsbridge`包。

```
npm i m-dsbridge
// 或者cdn引入
<script src="https://cdn.jsdelivr.net/npm/m-dsbridge/dsBridge.js"></script>
```

也支持直接用原Android或iOS的[DSBridge库](https://github.com/wendux/DSBridge-Android)的JS脚本。

```typescript
https://cdn.jsdelivr.net/npm/dsbridge/dist/dsbridge.js
```

2、通过`dsBridge`对象注册Js函数，供原生调用。

```typescript
// 注册同步函数
dsBridge.register('showAlert', function (a, b, c) {
        // return "原生调用JS showAlert函数"
         alert("原生调用JS showAlert函数" + a + " " + b + " " + c)
        return true
    })

// 注册异步函数
dsBridge.registerAsyn('showAlertAsync', function (a, b, c, callback) {
  let counter = 0
  let id = setInterval(() => {
    if (counter < 5) {
      callback(counter, false)
      alert("原生调用JS showAlertAsync函数" + a + " " + b + " " + c + " " + counter)
      counter++
    } else {
      callback(counter, true)
      alert("原生调用JS showAlertAsync函数" + a + " " + b + " " + c + " " + counter)
      clearInterval(id)
    }
  }, 1000)

})
```

其中异步的`callback`函数，如果最后一个参数返回`true`则完成整个链接的调用，`false`则可以一直回调给原生，这个就是JavaScript端的一次调用，多次返回。比如需要将JavaScript端进度数据不间断同步到原生，这时就可以派上用场了。


3、通过`dsBridge`对象调用原生API，第一个参数是原生方法名称，第二参数是原生方法接收的参数，异步方法有第三个参数是回调函数，会接收`CompleteHandler`异步回调结果。

```typescript
// 同步
let msg = dsBridge.call('testSync', JSON.stringify({data: 100}))

// 异步
dsBridge.call('testAsync', JSON.stringify({data: 200}), (msg) => {
  updateMsg(msg)
})
```




## 进度回调（一次调用，多次返回）

前面提到了JavaScript端的一次调用，多次回调的情况，在原生端也是支持的，还是有应用场景的，比如将原生的下载进度实时同步到js中，可以通过`CompleteHandler#setProgressData()`方法来实现。

```typescript
  @JavaScriptInterface()
  testAsync(p: string, handler: CompleteHandler) {
    LogUtils.d("testAsync: " + JSON.stringify(p))
    this.cHandler = handler
    let counter = 0
    setInterval(() => {
      if (counter < 5) {
        counter++
        handler.setProgressData("异步返回的数据--" + counter)
      } else {
        this.cHandler.complete("异步返回的数据--结束")
        this.cHandler.complete("异步返回的数据--结束2")
      }
    }, 1000)
```
JavaScript：

```typescript
dsBridge.call('testAsync', JSON.stringify({data: 200}), (msg) => {
  updateMsg(msg)
})
```

## 监听或拦截Javascript关闭页面

Js调用`close()`函数可以关闭当前页面，原生可以设置监听观察是否拦截。

```typescript
  aboutToAppear() {
    this.controller.setClosePageListener(() => {
      return true; // false 会拦截关闭页面
    })
  }
```

在回调函数中如果返回`false`，会拦截掉关闭页面的事件。

## 销毁结束任务

如果异步任务还在执行中，比如`setProgressData`，此时关闭页面返回就会闪退，为了避免这种情形，建议在组件的生命周期函数`aboutToDisappear()`中结束任务。

```typescript
  aboutToDisappear(){
    this.jsBridge.destroy()
  }

```

## 命名空间

命名空间可以帮助你更好的管理API，这在API数量多的时候非常实用，支持你通过命名空间将API分类管理，不同级之间只需用'.' 分隔即可。支持同步与异步方式使用。


### ArkTS API命令空间

原生用`WebViewControllerProxy#addJavascriptObject` 指定一个命名空间名称：

```typescript
  this.controller.addJavascriptObject(new JsBridgeNamespace(), "namespace")
```


在JavaScript中，用命名空间名称`.`对应的原生函数。

```javascript
    const callNative6 = () => {
        let msg =  dsBridge.call('namespace.testSync',{msg:'来自js命名空间的数据'})
        updateMsg(msg)
    }

      const callNative7 = () => {
          dsBridge.call('namespace.testAsync', 'test', (msg) => {
            updateMsg(msg)
        })
    }

```

### JavaScript API命令空间

用dsBridge对象注册js函数的命名空间。

```javascript
// namespace
dsBridge.register('sync', {
    test: function (a, b) {
        return "namespace:  " + (a + b)
    }
})

dsBridge.registerAsyn("asny",{
    test: function (a,b ,callback) {
        callback("namespace:  " + (a + b))
    }
})
```

第一个参数命名空间的名称，比如`sync`，第二个参数是API业务对象实例，支持字面量对象和Class类实例。

在原生调用方式：

```typescript

this.controller.callJs("sync.test", [1, 2], (value: string) => {
  this.msg = value
})

this.controller.callJs("asny.test", [3, 2], (value: string) => {
  this.msg = value
})
```

## 原生同步方法内执行串行异步并发任务

原生同步方法：

```typescript
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
```

如果要在同步方法内执行异步任务，并将异步结果立即返回给h5，上面的设计显然是无法满足需求的；在鸿蒙中异步任务基本与Promise和async/await有关联，然而桥接函数是不支持使用async/await声明（主要是受鸿蒙Web脚本注入机制的限制，也是为了考虑兼容Android/iOS项目而因此这样设计的）。

对此，设计了一个`taskWait()`函数来满足上述的需求，可以通过`taskWait()`函数在主线程的同步方法内执行串行并发异步任务，主线程会同步等待异步结果。

```typescript
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

```

其中`Param`类需要继承`BaseSendable`，同时用`@Sendable`装饰器声明，任务放在`run()`方法中执行。

```typescript
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
  // 异步任务执行
  async run(): Promise<void> {
    this.sum =  await this.add()
  }

  async add(){
    return this.a + this.b
  }


}
```

`taskWait()`函数是一个轻量级的同步等待函数，不建议执行耗时过长的任务，如果在3s内没有完成任务，会自动结束等待将结果返回，可能会存在数据丢失的情况；对于特别耗时的任务建议使用异步桥接函数。




## 最后

感谢[@name718](https://github.com/name718)、[@fjc0k](https://github.com/fjc0k)等各位大佬的支持与反馈。欢迎大家多多反馈，一起支持完善鸿蒙生态。


























