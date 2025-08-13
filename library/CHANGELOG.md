
## 版本更新记录

### 2024/11/15 - 1.7.2

- 修复H5与原生端方法注册不一致的安全问题，增强安全性校验

### 2024/10/8 - 1.7.1

- 原生异步桥接函数支持无参定义

### 2024/9/27 - 1.7.0

- 新增异常信息监听功能，便于问题追踪和调试
- 命名空间注册新增校验检测，提高API注册安全性

### 2024/7/8 - 1.6.0

- 兼容DSBridge2.0 JS脚本

### 2024/6/13 - 1.5.2

- 取消报错toast，由业务自行处理

### 2024/5/27 - 1.5.1

- 修复GitHub Issue [#12](https://github.com/751496032/DSBridge-HarmonyOS/issues/12)

### 2024/5/21 - 1.5.0

- 修复GitHub Issue [#8](https://github.com/751496032/DSBridge-HarmonyOS/issues/8)和[#11](https://github.com/751496032/DSBridge-HarmonyOS/issues/11)相关问题
- 原生同步方法内支持异步串行并发任务，根据鸿蒙系统特性进行定制化设计

### 2024/4/19 - 1.3.0

- 修复GitHub Issue [#5](https://github.com/751496032/DSBridge-HarmonyOS/issues/5)和[#7](https://github.com/751496032/DSBridge-HarmonyOS/issues/7)相关问题

### 2024/4/6 - 1.2.0

- 重构代码以适配鸿蒙NEXT版本
- 支持命名空间API，提供更好的API组织方式

### 2024/1/14 - 1.1.0

- 支持检测API是否存在，避免调用不存在的方法
- 支持监听JavaScript关闭页面
- 修复退出页面时因异步任务导致的闪退问题

### 2024/1/7 - 1.0.0

- 鸿蒙原生与JS的桥接交互
- 兼容现有Android和iOS的dsBridge库的核心功能



