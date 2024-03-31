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

        Button('NativeAndJsCalls2')
          .margin({ top: 20 })
          .onClick(() => {
            router.pushUrl({ url: "pages/NativeAndJsCallsPage2" })
          })

      }
      .width('100%')
    }
    .height('100%')
  }
}