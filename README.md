[toc]

## 介绍

HarmonyOS版的DSBridge，通过本库可以在鸿蒙原生与JavaScript完成交互，相互调用彼此的功能。

目前兼容Android、iOS第三方DSBridge库的核心功能，基本保持原来的使用方式，可以放心接入到项目中，后续会持续迭代保持与Android库相同的功能，减少前端和客户端的适配工作。

特性：

- 支持以类的方式集中统一管理API；
- 支持同步和异步调用；
- 支持进度回调/回传：一次调用，多次返回；
- 支持API是否存在的测试；
- 支持Javascript关闭页面事件的监听与拦截，
- 暂不支持API命名空间，后续会根据需求决定是否支持。


源码：

* [DSBridge-HarmonyOS](https://github.com/751496032/DSBridge-HarmonyOS)
* [DSBridge-Android](https://github.com/wendux/DSBridge-Android)
* [DSBridge-IOS](https://github.com/wendux/DSBridge-IOS)


>由于DSBridge库作者已经停止维护了，Android端建议使用 https://github.com/751496032/DSBridge-Android ，目前本人在维护。


## 安装

安装远程仓库：

```text
ohpm install @hzw/ohos-dsbridge
```

> 如果是依赖本地文件夹，在切换安装时建议clear下项目，避免启动应用时报错`please check the request path.`，这应该是IDE的bug。

## 使用

### Native

1、在原生新建一个类继承`BaseBridge`，实现业务API
, 通过类来集中统一管理API，方法用`@JavaScriptInterface()`标注，是不是很眼熟呢，加一个`@JavaScriptInterface()`标注主要为了使用规范，是自定义的装饰器，与Android保持一致性。
```typescript
export class JsBridge extends BaseBridge {
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

其中方法中的形参`CompleteHandler`，可用于异步回调。

2、在原生Web初始化，通过API类将JS代理对象注入到JS中，如下：

```typescript
private controller: WebviewController = new webView.WebviewController()
private jsBridge = new JsBridge(this.controller)

Web({ src: this.localPath, controller: this.controller })
          .javaScriptAccess(true)
          .javaScriptProxy(this.jsBridge.javaScriptProxy)

)        

```

3、在JavaScript中通过dsBridge对象调用原生API，第一个参数是原生方法名称，第二参数是原生方法接收的参数，异步方法有第三个参数，是回调函数，会接收`CompleteHandler`异步回调结果。

```typescript
// 同步
let msg = dsBridge.call('testSync', JSON.stringify({data: 100}))

// 异步
dsBridge.call('testAsync', JSON.stringify({data: 200}), (msg) => {
  updateMsg(msg)
})
```



### JavaScript

1、在JavaScript中初始化dsBridge，通过cdn或者npm安装都可以。

如果项目没有历史包袱，建议直接用`m-dsbridge`包。

```
npm i m-dsbridge
// 或者cdn引入
<script src="https://cdn.jsdelivr.net/npm/m-dsbridge@1.1.0/dsBridge.js"></script>
```

或者直接用原Android或iOS的[DSBridge库](https://github.com/wendux/DSBridge-Android)的JS脚本也行，暂不支持命名空间API。

```typescript
https://cdn.jsdelivr.net/npm/dsbridge/dist/dsbridge.js
```

2、通过dsBridge对象注册Js函数，供原生调用。

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

其中异步的callback函数，如果最后一个参数返回true则完成整个链接的调用，false则可以一直回调给原生，这个就是JavaScript端的一次调用，多次返回。比如需要将JavaScript端进度数据不间断同步到原生，这时就可以派上用场了。

3、原生通过API实现类来调用JavaScript所注册的函数。

```typescript
Button("调用js函数-同步")
        .onClick(() => {
          this.jsBridge.callJs("showAlert", [1, 2, '666'], (v) => {
            this.msg = v + ""
          })
        })

      Button("调用js函数-异步")
        .onClick(() => {
          this.jsBridge.callJs("showAlertAsync", [1, 2, '666'], (v) => {
            this.msg = v + ""
          })
        })
    }
```

`callJs()`方法有三个形参，第一个是Js注册的函数名称，第二个是Js接收函数的参数，是一个数组类型，第三个是监听Js函数返回结果的函数。
另外也提供了与Android库一样调用函数`callHandler()`。


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
    this.jsBridge.setClosePageListener(() => {
      return true; // false 会拦截关闭页面
    })
  }
```

在回调函数中如果返回false，会拦截掉关闭页面的事件。

## 销毁中断

如果异步任务还在执行中，比如`setProgressData`，此时关闭页面返回就会闪退，为了避免这种情形，建议在组件的生命周期函数`aboutToDisappear()`中中断任务。

```typescript
  aboutToDisappear(){
    this.jsBridge.destroy()
  }

```





























