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
      }
      .width('100%')
    }
    .height('100%')
  }
}