import common from '@ohos.app.ability.common';
import { WebViewControllerProxy } from '@hzw/ohos-dsbridge';
import { RegressionNativeApi } from '../regression/RegressionNativeApi';
import { RegressionRunStore, SuiteReport } from '../regression/RegressionRunStore';

@Entry
@Component
struct Index {
  private controller3: WebViewControllerProxy = WebViewControllerProxy.createController();
  private controller2: WebViewControllerProxy = WebViewControllerProxy.createController();
  private store?: RegressionRunStore;
  @State activeMode: string = 'DS3';
  @State ready: boolean = false;
  @State status: string = '准备真实 ArkWeb 验证';
  @State passed: number = 0;
  @State failed: number = 0;
  @State complete: boolean = false;

  aboutToAppear(): void {
    try {
      const context = getContext(this) as common.UIAbilityContext;
      this.store = new RegressionRunStore(context.filesDir, (report: SuiteReport) => {
        this.passed += report.passed;
        this.failed += report.failed;
        this.status = report.mode + ': ' + report.passed + ' 通过 / ' + report.failed + ' 失败';
        if (report.mode === 'DS3') {
          setTimeout(() => {
            this.activeMode = 'DS2';
            this.store?.start('DS2');
          }, 500);
        } else {
          this.complete = true;
          this.status = this.failed === 0 ? '验证完成，报告已保存' : '验证完成，存在失败，请读取报告';
        }
      });
      const api3 = new RegressionNativeApi((raw: string): string =>
        this.store?.accept('DS3', raw) ?? 'store-unavailable');
      const api2 = new RegressionNativeApi((raw: string): string =>
        this.store?.accept('DS2', raw) ?? 'store-unavailable');
      this.controller3.addJavascriptObject(api3);
      this.controller3.addJavascriptObject(api3, 'shop.orders');
      this.controller3.setGlobalErrorMessageListener((error: string) => api3.recordError(error));
      this.controller2.supportDS2(true);
      this.controller2.addJavascriptObject(api2);
      this.controller2.setGlobalErrorMessageListener((error: string) => api2.recordError(error));
      this.ready = true;
      this.store.start('DS3');
    } catch (error) {
      this.status = '初始化失败: ' + String(error);
      this.failed = 1;
    }
  }

  aboutToDisappear(): void {
    this.store?.stop();
    this.controller3.destroy();
    this.controller2.destroy();
  }

  build() {
    Column({ space: 8 }) {
      Text('DSBridge / ArkWeb 真机回归').fontSize(20).fontWeight(FontWeight.Bold)
      Text(this.status).fontSize(15)
      Row({ space: 16 }) {
        Text('通过 ' + this.passed).fontColor('#147D45')
        Text('失败 ' + this.failed).fontColor(this.failed > 0 ? '#C53535' : '#666666')
        Text(this.complete ? '已完成' : '运行 ' + this.activeMode)
      }
      Text('本地 DS3 → DS2 自动运行；结果保存到应用 files/').fontSize(12).fontColor('#666666')
      if (this.ready) {
        if (this.activeMode === 'DS3') {
          Web({ src: $rawfile('ds3.html'), controller: this.controller3.webviewController })
            .javaScriptAccess(true)
            .javaScriptProxy(this.controller3.javaScriptProxy)
            .domStorageAccess(false)
            .width('100%')
            .layoutWeight(1)
        } else {
          Web({ src: $rawfile('ds2.html'), controller: this.controller2.webviewController })
            .javaScriptAccess(true)
            .javaScriptProxy(this.controller2.javaScriptProxy)
            .domStorageAccess(false)
            .width('100%')
            .layoutWeight(1)
        }
      }
    }
    .padding(16)
    .width('100%')
    .height('100%')
    .backgroundColor('#F7F8FA')
  }
}
