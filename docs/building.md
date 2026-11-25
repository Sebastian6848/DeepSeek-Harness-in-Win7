# 构建内网版

## 已复用的基础

本项目已经导入 factfinding 的 Win7 适配，不需要重新实现 Cordis、会话、终端、Win7 Node 或 Electron 补丁。原构建记录保留在 [community/factfinding-porting.md](community/factfinding-porting.md) 中；其中涉及原作者仓库发布、自动更新和本机目录的内容仅为历史参考，本项目以本文为准。

Windows 构建机需要 Visual Studio C++ 工具链、PowerShell 7、7-Zip 和开发用 Node 24。`deepseek-harness/` 是普通源码目录，不需要初始化子模块。所有提交和推送只面向本项目仓库。

## 精确的兼容运行时输入

### 优先路径：复用固定社区安装包内的二进制

`sources.lock.json` 的 `binary_seed` 固定社区安装包、大小及 SHA256。该包只在构建机下载和提取，不在目标机执行联网安装步骤。先在 `deepseek-harness/` 完成依赖安装和 `pnpm run build`，再在仓库根目录运行：

```powershell
node scripts/prepare-community-package.mjs --installer out/community/upstream-win7.exe --sevenzip <7z.exe的路径> --output out/prepared --version 0.2.2-rc.5.3
npm install --prefix out/package-tools --ignore-scripts --no-audit --no-fund --save-exact electron-builder@26.17.0 @electron/asar@3.4.1
node scripts/package-prepared-win7.mjs --prepared out/prepared/application --output out/installers --tools out/package-tools
```

准备脚本仅接受哈希完全匹配的来源和空输出目录；提取原包，验证原有运行时清单，覆盖本仓库编译的 boot、LLM、自定义模型界面和桌面 bundle，重建清单，再生成 ASAR。它保留原包的所有原生二进制和 unpack 位置，逐项校验覆盖文件，并删除 `app-update.yml`。包内 `INTRANET-BUILD.json` 记录来源、源码提交及是否有未提交修改。正式发布预览包前，先提交源码，再从干净工作区执行准备步骤。

Windows 打包步骤复用社区 NSIS 模板、目录提升/卸载逻辑及原生安装界面，使用 Visual Studio 编译安装辅助 DLL。安装包不带自动更新源，也不依赖目标机下载组件。此流程不会重新编译 Electron/Node；其平台支持仍来自固定的社区补丁。编译依赖和安装包都放在被 Git 忽略的 `out/` 下。

### 从零重建社区二进制

根目录 `scripts/package-desktop-win7.ps1` 复用社区的打包入口，要求已有以下输入：

- `out/node-v24.21.0-win-x64.zip`：社区 Win7 版 Node，目录结构及 SHA256 与源码 `scripts/primary-runtime/lock.json` 一致。
- `out/electron-v44.2.0-win32-x64.zip`：社区补丁版 Electron，不能使用官方 Windows 版代替。
- `out/win7-runtime-overlay/`：已核对原件和覆盖件哈希的原生模块覆盖层。
- `out/win7-python-wheels/`：与锁文件一致的 Win7 Python wheels。
- `out/pwsh/PowerShell-7.2.24-win-x64.zip` 及 `.sha256`。

这些输入的源码、补丁和构建方法已由社区提供，本项目当前采用上面的固定二进制复用路径。缺少任何输入时本节的原始打包脚本会明确失败，不能通过改哈希、下载官方不兼容运行时或忽略检查来绕过。不要把这些体积很大的编译产物提交进 Git。

在 `deepseek-harness/apps/desktop/.env.windows` 中配置本项目 App ID，例如：

```text
DSH_DESKTOP_APP_ID=local.sebastian.deepseek-harness-win7-intranet
```

默认内网构建无需配置公网更新服务器或强制更新策略。准备好匹配输入和开发依赖后，在根目录 PowerShell 中执行：

```powershell
.\scripts\package-desktop-win7.ps1
.\scripts\prepare-win7-release.ps1 -Version <实际安装包版本>
```

打包脚本清除继承的 `DSH_WIN7_UPDATE_URL`，设置 `DSH_ALLOW_EXTERNAL_NETWORK=0` 和 `DSH_TELEMETRY_DISABLED=1`；源码中同样默认关闭外部能力，不依赖启动环境记住这些变量。发行整理不再要求 `nightly.yml` / `stable.yml`，只整理安装包及校验清单。

`DSH_ALLOW_EXTERNAL_NETWORK=1` 是维护者显式恢复旧公网能力的部署选项，办公电脑不要设置它。普通 CLI/Web 源码调试默认也应用内网策略。公开提供商代码仍保留在导入源码中，不会因为移除代码而破坏社区升级路径，但默认不挂载公网 DeepSeek 路由。

## 必需的最终验收

1. 检查打包前后 Win7 运行时和原生模块的静态导入；复用 `scripts/check-win7-rtm-imports.ps1`。
2. 在 Win7 SP1 x64 上离线安装、启动、选择目录、对话、读写、权限确认、终端、会话恢复和退出。
3. 使用目标单位的 OpenAI 兼容模型测试无密钥/有密钥、模型名 `ds`、工具调用及长回复。
4. 在没有模型配置时启动并打开设置，确认没有外网连接尝试；配置内网后核对流量目标只包含预期的本机/内网服务，切换各预设再次核对。
5. 单独检查 Windows 工作区 ACL 继承及新建文件关闭后重读，不把社区尚未关闭的问题标为已修复。

开发机单测、社区已有发布或 Linux 上的构建成功均不能替代以上验收。完成前不得把包称作已验证的 Win7 内网正式版。
