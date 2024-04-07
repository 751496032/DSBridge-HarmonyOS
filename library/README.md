
## 介绍

HarmonyOS版的DSBridge，通过本库可以在鸿蒙原生与JavaScript完成交互，相互调用彼此的功能。

目前兼容Android、iOS第三方DSBridge库的核心功能，基本保持原来的使用方式，后续会持续迭代保持与Android库相同的功能，减少前端和客户端的适配工作。

特性：

- **已适配鸿蒙API11语法；**
- 支持以类的方式集中统一管理API；
- 支持同步和异步调用；
- 支持进度回调/回传：一次调用，多次返回；
- 支持API是否存在检测；
- 支持Javascript关闭页面的监听与拦截，
- 支持命名空间API。


源码：

* [DSBridge-HarmonyOS](https://github.com/751496032/DSBridge-HarmonyOS)
* [DSBridge-Android](https://github.com/wendux/DSBridge-Android)
* [DSBridge-IOS](https://github.com/wendux/DSBridge-IOS)


>由于DSBridge库作者已经停止维护了，Android端建议使用 https://github.com/751496032/DSBridge-Android ，目前本人在维护。


## 安装

安装库：

```text
ohpm install @hzw/ohos-dsbridge
```

> 如果是依赖本地文件夹，在切换安装时建议clear下项目，避免启动应用时报错`please check the request path.`，这应该是IDE的bug。

## 使用

### Native

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

其中方法的形参`CompleteHandler`，可用于异步回调。

2、在原生Web组件初始化时，通过`WebViewControllerProxy`类来获取`WebviewController`实例和JS注入实例，然后将其设置到Web组件中，接着将API管理类(JsBridge)注入到`WebViewControllerProxy`中。

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

3、在JavaScript中通过`dsBridge`对象调用原生API，第一个参数是原生方法名称，第二参数是原生方法接收的参数，异步方法有第三个参数是回调函数，会接收`CompleteHandler`异步回调结果。

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

3、原生通过`WebViewControllerProxy`实例来调用JavaScript所注册的函数。

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

## 销毁中断

如果异步任务还在执行中，比如`setProgressData`，此时关闭页面返回就会闪退，为了避免这种情形，建议在组件的生命周期函数`aboutToDisappear()`中中断任务。

```typescript
  aboutToDisappear(){
    this.jsBridge.destroy()
  }

```

## 命名空间

命名空间可以帮助你更好的管理API，这在API数量多的时候非常实用，支持你通过命名空间将API分类管理，不同级之间只需用'.' 分隔即可。支持同步与异步方式使用。


### 原生API命令空间

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

## 最后

感谢[@name718](https://github.com/name718)等各位同学的支持与反馈。欢迎大家多多反馈，一起支持完善鸿蒙生态。


























