import { Prompt } from '@kit.ArkUI'

export class ToastUtils {
  static show(msg: string) {
    Prompt.showToast({ message: msg })
  }

}