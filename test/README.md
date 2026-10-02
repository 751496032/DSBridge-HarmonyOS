# Host regression tests

Requires Node.js 18.6 or newer (verified with Node.js 24). From this directory:

```sh
npm ci --ignore-scripts
npm test
```

`callRegistration.test.mjs` transpiles and executes the production `BaseBridge.ts`, decorators and helpers, using the real `reflect-metadata` package. It also runs the bundled DSBridge2/3 JavaScript against that dispatcher. Only HarmonyOS platform imports are stubbed.

The other existing `*Helper.test.mjs` files use host copies of helpers. These tests do not compile ArkTS or exercise ArkWeb on a device.

## Device reproduction

1. Open the demo's `NativeAndJsCallsPage`. It already registers `testSync` with `@JavaScriptInterface(false)` and displays global bridge errors.
2. In `entry/src/main/resources/rawfile/index.html`, use the commented callback form of `dsBridge.call('testSync', ...)` in `callNative3`.
3. Tap the corresponding sync-call button. Expect an error containing `testSync`, its sync registration, and the suggestion to omit the callback. The native business method and callback must not run.
4. Restore the original call without a callback. It should return the native result as before. The async-call button should still return through its callback.

This recipe is for manual device verification; the host suite does not claim that it has run.
