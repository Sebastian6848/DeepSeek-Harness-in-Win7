# 社区基线选择

2026-11-25 按用户提供的两个社区项目检查，目标为 Win7 x64 本机运行、保留已有 Harness 能力、内网 OpenAI 兼容模型及默认不访问外网。

| 项目 | 已有实现 | 与本项目相关的边界 |
| --- | --- | --- |
| czh869452912/deepseek-harness-win7 | Python 3.8.10 Host、固定上游 React 前端、CLI/Web/Desktop、便携包和离线前置组件 | 当前正式线基于 0.1.5-rc.3，另有 0.2.2 预览。文档明确披露 Windows 工作区 ACL 继承缺陷及尚未合入的修复，不能把其发行验收推广为所有场景。迁移协议与插件行为增加了长期维护面。 |
| factfinding/dsh-win7 | 保留 0.2.2-rc.5 原版主体；已有自行编译 Electron/Node、PythonVista、Win7 兼容 DLL、winpty 和系统导入检查 | 默认会访问 GitHub 自动更新，普通 Harness 的联网工具、账号、遥测仍需关闭。源码构建完整 Electron 需 Windows 工具链及大量磁盘；既有预编译运行时可复用，但须检查精确来源与校验值。 |

本项目选择 **factfinding** 为主线，不再开发独立的 Python Agent。复用其构建脚本、兼容层和已适配 Harness 源码，保留 `czh869452912` 的问题记录作为回归检查参考，不叠加第二套 Host。

固定提交见根目录 `sources.lock.json`。由于拉取社区 Harness 的 Git 连接不稳定，使用本机已有的官方 RC 对照快照施加社区 fork 的完整比较 diff，再计算 Git tree。导入 tree 为 `f7c784931e545510a3ee1673a422df210bdef145`，与 GitHub 对社区提交 `4ceb42e` 返回的 tree 完全一致。随后才开始本项目修改。官方对照 checkout 保持干净，仅作为被忽略的本地参考；此前 Python 原型移入被忽略的 `.archive/`，不作为当前发行内容。

社区仓库中的测试、视频或已发布安装包属于其作者的验收记录，不是本项目的新验收。本项目需要分别验证：内网默认配置、所有预设的联网工具、更新/遥测的零请求行为、现有会话及文件操作、Win7 系统前置组件和目标单位接口。无 Win7 测试机时必须明确报告未验收。

来源：[czh 项目](https://github.com/czh869452912/deepseek-harness-win7)、[factfinding 项目](https://github.com/factfinding/dsh-win7)、[工作区 ACL 问题](https://github.com/czh869452912/deepseek-harness-win7/issues/4)。
