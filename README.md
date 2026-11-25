# DeepSeek Harness in Win7

本项目维护在 [Sebastian6848/DeepSeek-Harness-in-Win7](https://github.com/Sebastian6848/DeepSeek-Harness-in-Win7)，目标为 **Windows 7 SP1 x64 本机运行 + 单位内网 OpenAI 兼容模型**。

主线复用 [factfinding/dsh-win7](https://github.com/factfinding/dsh-win7) 的兼容运行时、构建脚本和桌面应用适配。另参考 [czh869452912/deepseek-harness-win7](https://github.com/czh869452912/deepseek-harness-win7) 的问题记录。这里不另写 Agent，不向官方或社区仓库推送改动。固定来源和比较结果见 [sources.lock.json](sources.lock.json) 与 [社区评估](docs/community-assessment.md)。

官方尚无非预发布稳定版；当前固定基线为社区已适配的 **0.2.2-rc.5**。这是开发中的内网适配项目，源码检查、完整安装包和真实 Win7 验收分别记录，不能互相替代。当前进度见 [验证记录](docs/validation.md)。

## 本项目的内网默认值

- 使用现成的桌面界面、会话、工作区、文件工具和受权限控制的终端。
- “设置 → 模型 → 添加模型提供商”默认打开“自定义模型 API”。提供商 ID 预填 `intranet-deepseek`，协议为 OpenAI Chat Completions，模型名预填 **`ds`**；网址、模型和密钥均可手动修改。
- 网址支持服务根地址（自动补 `/v1`）、自定义 API 前缀和完整 `/chat/completions` 地址。使用现有提供商的编辑页时，填写 API 根地址，如 `http://10.0.0.10:8000/v1`。
- 无认证的自定义 Chat Completions 服务可留空 API Key。SDK 层会使用非秘密占位值 `intranet-no-auth`，不会查询公网凭据。若服务启用了认证，填写实际 Key；实际凭据优先。
- 默认禁用 `web_search`、`web_fetch`、对应提供端、DeepSeek 公网模型与账号、会话上报、遥测、插件市场及 MCP 自动启动。策略覆盖普通工具和各个 Agent 预设，重新载入配置时仍适用。
- 桌面端跳过公网登录引导和账号订阅，不启动自动更新或强制更新请求。打包时不生成更新源，发行整理默认只生成离线安装包和 SHA256 清单。
- 不会因为用户未填网址而回退到官网模型接口。请填写单位管理员提供的服务网址。

离线默认值不是操作系统防火墙。保留的终端能够执行用户批准的系统命令；其他应用、自定义代码和明确输入的服务地址仍由单位网络策略管理。开发机可联网构建，目标机运行不得依赖临时下载。

## 使用流程

本项目安装包发布在 [GitHub Releases](https://github.com/Sebastian6848/DeepSeek-Harness-in-Win7/releases)。当前为未签名的内网适配预览版，Win7 真机及单位服务验收状态见 [验证记录](docs/validation.md)。安装包复用固定社区二进制，并包含本项目编译的修改。

1. 先按社区适配的系统要求离线准备 Win7 SP1 x64、KB2533623（或替代更新）、KB4474419 和对应 VC++/UCRT 组件。版本和来源保留在 [社区原说明](docs/community/factfinding-readme.md)，不要在办公电脑上运行在线安装器。
2. 安装本项目构建并校验过的包，打开设置中的模型页。
3. 填写内网网址，如 `http://10.0.0.10:8000/v1`，模型名默认为 `ds`；需要认证时填写 API Key。
4. 保存自定义提供商，选择该模型和本机工作目录后开始工作。模型服务须支持工具调用，才能执行文件/终端任务。

不需要单位接口或真实 API Key 才能运行自动测试；测试使用本机模拟服务。

实际桌面模型配置界面见 [界面截图](docs/assets/intranet-model-form.png)。

## 目录

| 路径 | 内容 |
| --- | --- |
| `deepseek-harness/` | 社区 Win7 fork 的完整固定源码快照，加本项目修改；普通目录，不是指向官方的子模块 |
| `scripts/`、`shim/`、`win7-fixes/` | 复用的社区构建、兼容层和第三方补丁 |
| `tests/intranet.test.mjs` | 本项目的内网策略和输入处理测试 |
| `sources.lock.json` | 仓库、提交、初始 Git tree 和许可来源 |
| `docs/` | 评估、构建及验证记录 |

此前独立 Python 原型与官方对照 checkout 只保留在被忽略的本机目录中，不属于当前源码或发行内容。

## 开发与验证

开发机使用 Node.js 24.9 以上及源码锁定的 pnpm 11.28.5，目标机则使用社区已适配的运行时。开发依赖的 Node 版本要求不代表官方 Node 可以直接用于 Win7。

```bash
git clone https://github.com/Sebastian6848/DeepSeek-Harness-in-Win7.git
cd DeepSeek-Harness-in-Win7
npm test
cd deepseek-harness
pnpm install --frozen-lockfile
pnpm exec vitest run packages/boot/app-boot/tests/intranet.spec.ts packages/boot/app-boot/tests/profile.spec.ts packages/llm/llm-pi-ai/tests/adapter.spec.ts apps/desktop/tests/update-coordinator.spec.ts apps/desktop/tests/welcome-window.spec.ts apps/desktop/tests/welcome-startup.spec.ts apps/desktop/tests/welcome-host.spec.ts apps/desktop/tests/win7-update-feed.spec.ts apps/desktop/tests/desktop-package-environment.spec.ts packages/client/ui-settings-models/tests/provider-form.client.spec.tsx
pnpm run build
```

构建 Windows 安装包复用社区流程，见 [构建说明](docs/building.md)。完整构建 Electron 的成本很高；优先复用**精确匹配基线且经来源和校验核对的**社区运行时输入，不重新开发兼容层。普通办公电脑不承担这些构建步骤。

## 许可与来源

本仓库保留 [dsh-win7 contributors 的 MIT 许可](LICENSE)，Harness 源码保留 [DeepSeek 的 MIT 许可](deepseek-harness/LICENSE)。复用的 Electron、Node、PythonVista、PowerShell、winpty、Office/PDF 等组件保留其各自许可；其中社区自带 PyMuPDF 为 AGPL-3.0。实际发布时还需随精确产物附带相应第三方许可，不能仅用顶层 MIT 替代。
