import router from '@ohos.router'
@Entry
@Component
struct Index {
  @State message: string = 'Hello World'

  build() {
    Row() {
      Column({space:12}) {
        Button('NativeAndJsCalls - DSBridge3.0')
          .onClick(() => {
            router.pushUrl({ url: "pages/NativeAndJsCallsPage" })
          })

        Button('UseInComponent - DSBridge3.0')
          .onClick(() => {
            router.pushUrl({ url: "pages/UseInComponentsPage" })
          })

        Button('UseInJs2 - 适配DSBridge2.0脚本')
          .onClick(() => {
            router.pushUrl({ url: "pages/UseInJs2Page" })
          })

        Button("加载h5").onClick((event: ClickEvent) => {
          router.pushUrl({ url: "pages/TestPage" })
        })

      }
      .width('100%')
    }
    .height('100%')
  }
}