# ArkWeb 真机回归验证

这套夹具补充 `test/` 的 Node 测试，使用真实 `Web.javaScriptProxy`、生产 `WebViewControllerProxy` / `BaseBridge` 和仓库自带的 DSBridge 2.0 / 3.0 脚本。全部 HTML 和脚本来自本地 rawfile，不依赖 CDN、账号或模型 Key。

打开应用后先运行 DS3，再切换到独立 Web 运行 DS2，共 **27 项**断言：DS3 14 项，DS2 13 项。UI 显示累计通过和失败数量；H5 产生的结果通过 native `report` 写入应用私有 `files/`。

## 生成独立项目

在仓库根目录用 PowerShell 执行：

```powershell
.\test\arkweb\stage-fixture.ps1 -OutputDirectory D:\temp\dsbridge-arkweb
```

输出目录必须在仓库之外，且不存在或为空。脚本复制当前仓库的 `entry`、`library`、`AppScope` 和必要工程文件，再覆盖 `overlay/` 的测试页面。生产库和 bundled DS2/DS3 脚本直接取自当前 checkout，`test/arkweb` 不保存生产库的另一份副本。

生成项目默认使用独立 bundle `com.hreyulog.dsbridge.regression`，未配置签名。脚本重新生成 root `build-profile.json5`，保留原项目的 `compatibleSdkVersion`、`targetSdkVersion`（目前均为 `5.0.0(12)`）；原项目未指定 `compileSdkVersion` 时继续交由 DevEco 环境选择。它不复制 root 的签名配置、证书、私钥或构建缓存。

需要指定本机编译 SDK 时，可以使用：

```powershell
.\test\arkweb\stage-fixture.ps1 -OutputDirectory D:\temp\dsbridge-arkweb-sdk24 `
  -CompileSdkVersion '6.1.1(24)'
```

该参数只调整编译 SDK，保留原项目 API 12 的兼容/目标版本。工程声明 API 12 不等于已经完成 API 12 真机验证；具体结论必须注明实际 SDK、系统版本和报告。

## 签名与安装

在 DevEco Studio 打开输出目录，使用自己的有效调试签名并构建、安装。需要匹配已登记测试应用时，可传入自己的 `-BundleName`，同时检查 profile 是否覆盖该 bundle 和测试设备。测试应用不应覆盖其他业务应用。

也可以在仓库之外自行准备私有 JSON 签名配置，通过 `-SigningConfigPath` 加载。文件需有两个顶层字段：`signingConfigs`（DevEco 签名配置数组）和 `signingConfig`（选用的配置名称）；配置名称必须唯一，选用名称必须存在，签名材料路径使用已存在文件的绝对路径。私有配置也应放在输出工程之外。

```powershell
.\test\arkweb\stage-fixture.ps1 -OutputDirectory D:\temp\dsbridge-arkweb-signed `
  -SigningConfigPath D:\private\dsbridge-signing.json
```

脚本只把该配置写入生成目录的本地 build profile，不输出密码，不执行编译、签名、安装或设备操作。私有配置和生成的签名工程不要提交仓库。脚本不删除已有目录，也不修改原工程。

## 断言范围

| 范围 | DS3 | DS2 |
| --- | --- | --- |
| 真实 proxy 握手、同步对象参数、无参数、0/false/空字符串返回 | 有 | 有 |
| callback 调用同步 native：业务调用 0 次、错误监听 1 次、建议可直接照用 | 有 | 有 |
| 错误包含完整命名空间、正常命名空间同步调用 | 有 | 公开 API 不支持 |
| async、progress→complete、完成后删除 callback stub | 有 | 有 |
| 并发乱序回调、页面计数器不污染 bundled counter | 有 | 有 |
| async native 无 JS callback 的 fire-and-forget | 有 | 有 |
| DS3 直接转发原始字符串 | 有 | 不适用 |
| DS2 同步保留原始 JSON，异步去掉内部 stub 并保留普通 data 字段 | 不适用 | 有 |
| 无未捕获 JS / Promise 错误 | 有 | 有 |

DS2 的 `WebViewControllerProxy` 明确禁止注册命名空间，夹具遵循这一边界。callback 最多等待 5 秒，单套 watchdog 为 90 秒。

## 收集结果

应用启动时先写 `pending`，随后生成：

```text
context.filesDir/
  dsbridge-regression-ds3.json
  dsbridge-regression-ds2.json
  dsbridge-regression-final.json
```

H5 正常跑完的单套报告包含 `origin: "arkweb-javascript"`、`state: "complete"`、每项断言和耗时。native watchdog / 文件错误分别标为 `native-watchdog` / `native-storage`，不能算作 H5 通过。最终报告聚合两套结果，`failed: 0` 才表示全部通过。

通过 HDC 获取应用 `context.filesDir` 下的 JSON，具体方式取决于调试系统：支持 `run-as` 时可用该入口；部分系统允许直接读取 `/data/app/el2/100/base/<bundle>/haps/entry/files/`。不把无法读取结果、`pending`、构建成功或 Node 测试通过当作真机通过。

生成目录的 `arkweb-fixture-manifest.json` 记录当前 Git 提交、复制的生产源码/脚本和测试 harness SHA-256、bundle 和 SDK 声明。收集者还应记录实际 SDK、手机系统版本、安装包 SHA-256、测试起止时间，并将这些与手机 JSON 绑定。报告和公共夹具不包含账号、Key、设备 serial 或签名材料。

要证明诊断修复，可分别从修改前和修改后的源代码生成两个项目并运行。旧版的 sync+callback 用法已经会被拒绝；新增断言只要求错误包含实际同步注册、完整方法名和两种修正方式，因此旧版应在这几个诊断断言失败，改版应通过。它不改变原有调用规则。
