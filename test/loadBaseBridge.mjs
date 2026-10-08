import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import 'reflect-metadata'

const require = createRequire(import.meta.url)
const sourceRoot = fileURLToPath(new URL('../library/src/main/ets/', import.meta.url))

// Execute the production TypeScript and its helpers. Only platform APIs are
// stubbed: this is a host regression, not an ArkWeb/device runtime test.
export function loadBaseBridge() {
  const modules = new Map()
  const logs = []
  const stubs = {
    '@ohos.router': { back() {} },
    '@ohos.hilog': {
      info(_domain, _tag, message) { logs.push(message) },
      error(_domain, _tag, message) { logs.push(message) }
    },
    '@kit.ArkUI': { Prompt: { showToast() {} } },
    '@kit.ArkTS': { JSON }
  }

  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const module = { exports: {} }
    modules.set(filename, module)
    const source = readFileSync(filename, 'utf8')
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        experimentalDecorators: true
      }
    })
    const localRequire = (specifier) => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier]
      if (specifier.startsWith('.')) {
        return load(path.resolve(path.dirname(filename), `${specifier}.ts`))
      }
      return require(specifier)
    }
    const execute = new vm.Script(
      `(function(require, module, exports) {\n${outputText}\n})`, { filename }
    ).runInThisContext()
    execute(localRequire, module, module.exports)
    return module.exports
  }

  return {
    ...load(path.join(sourceRoot, 'core', 'BaseBridge.ts')),
    ...load(path.join(sourceRoot, 'core', 'Entity.ts')),
    logs
  }
}
