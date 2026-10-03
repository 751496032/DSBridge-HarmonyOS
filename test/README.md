# 回归测试

需要 Node.js 18.6 或以上版本（已使用 Node.js 24 验证）。在本目录执行：

```sh
npm ci --ignore-scripts
npm test
```

`callRegistration.test.mjs` 转译并执行生产代码中的 `BaseBridge.ts`、装饰器和辅助类，使用真实的 `reflect-metadata`，同时运行仓库自带的 DSBridge2/3 JavaScript。只替换无法在 Node 环境加载的鸿蒙平台 API。

其他已有的 `*Helper.test.mjs` 使用辅助类的主机副本。Node 测试不编译 ArkTS，也不等同于 ArkWeb 真机验证。

## 自动化真机回归

参见 [ArkWeb 真机回归夹具](arkweb/README.md)。夹具在真实 `Web.javaScriptProxy` 上分别运行 DS3、DS2，共 27 项断言，并将 H5 实际产生的逐项结果保存为 JSON。需要使用有效的设备调试签名安装，签名材料不提交仓库。

[2026-10-03 验证记录](validation/2026-10-03/README.md) 包含原项目 API 12 工具链构建日志、Mate 真机原版/改版逐项结果和校验清单。

## 演示页手工复现

1. 打开 demo 的 `NativeAndJsCallsPage`。该页面已通过 `@JavaScriptInterface(false)` 注册 `testSync`，并显示全局桥接错误。
2. 在 `entry/src/main/resources/rawfile/index.html` 的 `callNative3` 中，使用注释中的 `dsBridge.call('testSync', ...)` callback 调用形式。
3. 点击同步调用按钮。错误应包含 `testSync`、实际同步注册方式，以及去掉 callback 的建议。原生业务方法和 callback 均不得执行。
4. 恢复不带 callback 的调用，应正常返回同步结果；异步调用按钮应继续通过 callback 返回结果。
