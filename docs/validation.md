# 验证记录

日期：2026-11-26。目标：Win7 SP1 x64、本机桌面、内网 OpenAI 兼容模型、默认 `ds`。

## 当前已执行

- 社区 Harness 导入 tree 与固定社区提交的 tree 一致：`f7c784931e545510a3ee1673a422df210bdef145`。
- 根目录测试 **12 项通过**，覆盖内网策略、URL、默认模型、密钥、真实 PowerShell 离线发行整理、二进制来源校验、原生文件保护、最终 ASAR 清单校验和 Windows 路径列表。
- 社区源码的 11 组相关回归测试通过：**366 项**。覆盖真实的基础/Web/全部预设配置组合、profile 配置层、pi-ai 适配器（含本机模拟 OpenAI 服务）、更新协调器、欢迎窗口/启动/本机设置、更新打包配置、打包前置校验、模型表单及同一 NSIS 依赖实例的模板补丁。修正浏览器构建依赖后，相关欢迎流程 **14 项**复测通过。
- `pnpm run build`：**10 个阶段全部通过，0 失败、0 跳过**。包括开发机原生锁模块、Host/Client 类型检查、Host/Desktop/Client bundle、Web 构建。Linux 开发工具与目标 Win7 二进制分开。
- 打包脚本复核修正后的 `pnpm run build:check`：Host / Client 两阶段通过。真实 ASAR 3.4.1 的嵌套 unpack、代码替换及最终清单集成检查在 **Linux 和 Windows** 均通过。
- 社区固定安装包大小及 SHA256 与 GitHub Release 记录一致；新打包流程校验源文件、重建清单并保护复用的原生文件。
- 最终应用从干净提交 `d6b66f5066ba6f6293a7e3d8baf6a550c09e1931` 整理：复用的 **31 个** dsh 原生文件不变；最终 ASAR / unpacked 中 **20,619 个**运行时文件全部与新清单匹配；无 `app-update.yml` 或强制更新策略。
- **Windows 11 x64 开发机**：通过打包 Host 的真实冷启动、已认证本机前端访问、内网模型 bundle / bootstrap 检查和正常退出。测试对 Host Node socket 调用的观察窗口内，未出现非 loopback 连接尝试。
- **Windows 11 x64 开发机**：实际打开完整 Electron 界面及模型设置，确认默认自定义 API、OpenAI Chat Completions、`intranet-deepseek` 和 `ds`，网址 / 密钥保留手动输入；已检查 [截图](assets/intranet-model-form.png)。调试连接建立后的页面请求观察窗口内未见外网 URL。此项不代替启动前和整机流量抓包。
- 独立复核发现并修正社区包的样例 Chromium credits：以经过官方压缩包 SHA256 和文件 SHA256 两层校验的同版 Electron 44.2.0 声明文本替换（约 20 MB），不替换任何运行时可执行文件。Windows 打包入口强制未签名，关闭重新注入提权辅助程序。
- 最终 NSIS 安装包已在 Windows 构建成功；重新提取后的全部 **8,895 个物理文件**与准备目录逐项 SHA256 一致，内嵌运行时清单再次通过验证。Windows Authenticode 检查为 `NotSigned`，产品版本 `0.2.2-rc.5.3`。
- 最终打包 Host 的缺省环境复测通过：不设置 `DSH_ALLOW_EXTERNAL_NETWORK` / `DSH_TELEMETRY_DISABLED`，冷启动、前端和正常退出仍通过，测试观察窗口内没有非 loopback socket 尝试。
- 发行文件：`deepseek-harness-0.2.2-rc.5.3-win7-x64-intranet-unsigned.exe`，**500,033,272 字节**，SHA256：`05178e0e138b41568b82a0a3e0b1ef3ad2b9e277a82bdb71d613902026765ca2`。同时提供 `SHA256SUMS.txt`；不发布更新 feed 或 blockmap。
- 官方对照 checkout 无修改；本项目 origin 仅指向 Sebastian6848/DeepSeek-Harness-in-Win7。

## 用户实测 Win7 SP1 x64（`0.2.2-rc.5.3`）

- 2026-11-26 20:53–21:0x（北京时间），PowerShell 7.2.24。用户在无外网的 Win7 SP1 上通过 Agent 执行实际任务，验证了 PowerShell、文件读写编辑、长路径、沙箱写入边界、后台任务与取消、子代理、Python/Node 及中文 DOCX。
- 实测发现两层输出截断的提示不准确、Python 中文 stdout 乱码，以及包内工具未加入 PATH。`0.2.2-rc.5.4` 针对这些结果修正。新版本的 Win7 复测与单位模型端到端验收仍待进行。
- 本机 CIM/WMI 查询失败，PowerShell 的 HTTP 客户端访问 GUI 回环地址异常，而直接 HTTP 请求能收到预期的 401。现有证据不足以定位为 Harness 的实现故障。可用 `node -p "require('node:os').totalmem()"` 读取总内存，不依赖 WMI。
- Win7 上的 Node 和 Python 来自固定的社区兼容构建。升级运行时需要重新检查 Win7 兼容性。

## 仍需完成

- `0.2.2-rc.5.4` Win7 真机复测、单位接口及整机外网流量验收。
- ACL 继承及其他社区已知问题：只记录风险和回归方向，没有声称已全部修复。

原型的 Python 测试不计入以上结果，也不用于认证当前社区基线。
