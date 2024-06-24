import router from '@ohos.router'
@Entry
@Component
struct Index {
  @State message: string = 'Hello World'

  build() {
    Row() {
      Column() {
        Button('NativeAndJsCalls')
          .onClick(() => {
            router.pushUrl({ url: "pages/NativeAndJsCallsPage" })
          })

        Button('在组件内定义桥接函数')
          .margin('10vp')
          .onClick(() => {
            router.pushUrl({ url: "pages/NativeAndJsCallsPage2" })
          })
      }
      .width('100%')
    }
    .height('100%')
  }
}