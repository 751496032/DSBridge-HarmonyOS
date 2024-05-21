/**
 * BaseSendable子类的属性只支持number、boolean、string、SendableClass
 *
 */
@Sendable
export class BaseSendable {
  public enableLog: boolean = false
  public key: string = `key_${Date.now()}`
  public tag: string = "BaseSendable"
  private _isCompleted: boolean = false

  public get isCompleted(): boolean {
    return this._isCompleted
  }


  /**
   * 不能手动调用complete()、run()方法
   */
  async complete() {
    this._isCompleted = true
  }

  async run(): Promise<void> {
  }
}