# 验证记录

日期：2026-11-26。目标：Win7 SP1 x64、本机桌面、内网 OpenAI 兼容模型、默认 `ds`。

## 当前已执行

- 社区 Harness 导入 tree 与固定社区提交的 tree 一致：`f7c784931e545510a3ee1673a422df210bdef145`。
- 根目录测试 **12 项通过**，覆盖内网策略、URL、默认模型、密钥、真实 PowerShell 离线发行整理、二进制来源校验、原生文件保护、最终 ASAR 清单校验和 Windows 路径列表。
- 社区源码的 11 组相关回归测试通过：**366 项**。覆盖真实的基础/Web/全部预设配置组合、profile 配置层、pi-ai 适配器（含本机模拟 OpenAI 服务）、更新协调器、欢迎窗口/启动/本机设置、更新打包配置、打包前置校验、模型表单及同一 NSIS 依赖实例的模板补丁。修正浏览器构建依赖后，相关欢迎流程 **14 项**复测通过。
- `pnpm run build`：**10 个阶段全部通过，0 失败、0 跳过**。包括开发机原生锁模块、Host/Client 类型检查、Host/Desktop/Client bundle、Web 构建。Linux 开发工具与目标 Win7 二进制分开。
- 打包脚本复核修正后的 `pnpm run build:check`：Host / Client 两阶段通过。真实 ASAR 3.4.1 的嵌套 unpack、代码替换及最终清单集成检查在 **Linux 和 Windows** 均通过。
- 社区固定安装包大小及 SHA256 与 GitHub Release 记录一致；新打包流程校验源文件、重建清单并保护复用的原生文件。
- 已从干净提交 `374eaaf63e722370f85fa6cf0ba7aa0bfc3806ef` 整理应用：复用的 **31 个** dsh 原生文件不变；最终 ASAR / unpacked 中 **20,619 个**运行时文件全部与新清单匹配；无 `app-update.yml` 或强制更新策略。
- **Windows 11 x64 开发机**：通过打包 Host 的真实冷启动、已认证本机前端访问、内网模型 bundle / bootstrap 检查和正常退出。测试对 Host Node socket 调用的观察窗口内，未出现非 loopback 连接尝试。
- **Windows 11 x64 开发机**：实际打开完整 Electron 界面及模型设置，确认默认自定义 API、OpenAI Chat Completions、`intranet-deepseek` 和 `ds`，网址 / 密钥保留手动输入；已检查 [截图](assets/intranet-model-form.png)。调试连接建立后的页面请求观察窗口内未见外网 URL。此项不代替启动前和整机流量抓包。
- 独立复核发现并修正社区包的样例 Chromium credits：以经过官方压缩包 SHA256 和文件 SHA256 两层校验的同版 Electron 44.2.0 声明文本替换（约 20 MB），不替换任何运行时可执行文件。Windows 打包入口强制未签名，关闭重新注入提权辅助程序。
- 官方对照 checkout 无修改；本项目 origin 仅指向 Sebastian6848/DeepSeek-Harness-in-Win7。

## 仍需完成

- 本项目 Windows 安装包：整理、构建与产物验证进行中，完成后追加记录。
- Win7 真机/虚拟机、单位接口及外网零请求验收：未执行，当前环境不能替代这些测试。
- ACL 继承及其他社区已知问题：只记录风险和回归方向，没有声称已全部修复。

原型的 Python 测试不计入以上结果，也不用于认证当前社区基线。
