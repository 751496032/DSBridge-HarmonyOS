# 2026-10-03 验证记录

生产代码版本：修改前 `83fbbdd`，修改后 `fba6188`。本目录记录 API 12 工具链构建和 ArkWeb 真机运行两项独立验证。

| 检查 | 修改前 | 修改后 |
| --- | --- | --- |
| 原项目 API 12 工具链构建 library HAR | 通过 | 通过 |
| Mate 真机 ArkWeb，DS3 | 12 通过、2 失败 | 14 通过、0 失败 |
| Mate 真机 ArkWeb，DS2 | 12 通过、1 失败 | 13 通过、0 失败 |
| Node 回归测试 | 新增诊断断言在原版失败 | 42 通过、0 失败 |

原版的 3 项真机失败均为新增诊断断言：DS3 普通同步方法、DS3 命名空间同步方法和 DS2 同步方法使用 callback 时，旧错误没有完整方法名及同步注册提示。同步/异步正常调用、progress、并发乱序、回调清理及参数传递均通过。修改后这 3 项也通过，原来的拒绝规则保持不变。

## API 12 工具链

使用华为官方 Linux CLI `5.0.3.906`，下载包 SHA-256 与官方校验文件一致。完整 SDK 在独立 Linux 目录解压，实际版本为 HarmonyOS 5.0.0 Release / API 12，ETS 和 toolchains 均为 `5.0.0.71`；hvigor `5.8.9`、ohpm `5.0.8`、Node `18.20.1`。

两份源代码分别来自对应 Git 提交的 archive，只在本地副本去掉开发者签名，保留原项目 `compatibleSdkVersion`、`targetSdkVersion` 的 `5.0.0(12)`。执行：

```sh
hvigorw assembleHar --mode module -p module=library@default -p product=default -p buildMode=debug --no-daemon
```

两次退出码均为 0，生成 `dsbridge.har`。产物尺寸、SHA-256、工具包来源与构建日志的校验值见 [manifest.json](manifest.json)。构建日志已移除本机路径及终端颜色码。

两版都保留原项目 `BaseSendable.ets` 关于 `@Sendable in js har` 的警告；本次诊断修改没有调整 HAR 类型或该类。

## ArkWeb 真机

设备为 Huawei Mate（BRA-AL00），系统 `6.1.0.105(SP36C01E105R8P8)`，运行时 API 23。回归包由 SDK API 24 编译，兼容及目标版本为 API 12，使用生产源码依赖。

本地 H5 通过真实 `Web.javaScriptProxy` 调用原生装饰器方法，分别运行仓库自带的 DSBridge 3.0 / 2.0；未替换手机桥接实现。H5 生成逐项报告，native 保存并聚合为 JSON：

- [原版逐项结果](baseline-arkweb.json)
- [修改版逐项结果](candidate-arkweb.json)
- [修改版手机截图](candidate-arkweb.jpeg)
- [可复现的回归夹具](../../arkweb/README.md)

公开夹具的 13 个 overlay 文件与本次手机测试项目一致，规范化换行后的文件校验值列在 manifest 中。原版、改版的源提交、BaseBridge Git blob、HAP 及报告 SHA-256 也已绑定。

经过设备所有者确认，本次临时替换了一个旧测试 App；每轮结束后均恢复原 HAP，并核对设备中的 HAP 与备份哈希一致，未清除应用数据。证书、profile、私钥、设备标识和签名 HAP 不进入公开仓库。

验证范围：API 12 **library HAR 构建**及上述 Mate 的 **ArkWeb 源码集成运行**。没有声称已在 API 12 系统运行，也没有声称真机消费了本次 API 12 生成的 HAR。
