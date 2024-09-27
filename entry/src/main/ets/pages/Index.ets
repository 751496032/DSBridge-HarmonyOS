import router from '@ohos.router'
@Entry
@Component
struct Index {
  @State message: string = 'Hello World'

  build() {
    Row() {
      Column() {
        Button('NativeAndJsCalls - DSBridge3.0')
          .onClick(() => {
            router.pushUrl({ url: "pages/NativeAndJsCallsPage" })
          })

        Button('UseInComponent - DSBridge3.0')
          .margin('10vp')
          .onClick(() => {
            router.pushUrl({ url: "pages/UseInComponentsPage" })
          })

        Button('UseInJs2 - 适配DSBridge2.0脚本')
          .margin('10vp')
          .onClick(() => {
            router.pushUrl({ url: "pages/UseInJs2Page" })
          })
      }
      .width('100%')
    }
    .height('100%')
  }
}