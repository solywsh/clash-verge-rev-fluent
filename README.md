<h1 align="center">
  <img src="./src-tauri/icons/icon.png" alt="Clash Verge Rev Fluent" width="128" />
  <br>
  Clash Verge Rev · Fluent
  <br>
</h1>

<h3 align="center">
基于 <a href="https://github.com/clash-verge-rev/clash-verge-rev">Clash Verge Rev</a> 的 Fluent UI 分支 —— 一个使用 <a href="https://github.com/tauri-apps/tauri">Tauri 2</a> 构建的 Clash Meta (mihomo) GUI。
</h3>

<p align="center">
  Languages:
  <a href="./README.md">简体中文</a> ·
  <a href="./docs/README_en.md">English</a> ·
  <a href="./docs/README_es.md">Español</a> ·
  <a href="./docs/README_ru.md">Русский</a> ·
  <a href="./docs/README_ja.md">日本語</a> ·
  <a href="./docs/README_ko.md">한국어</a> ·
  <a href="./docs/README_fa.md">فارسی</a>
</p>

## 这是什么

本仓库是 [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) 的一个**界面分支**：

- **后端跟随上游**：Rust 后端、内核管理、配置生成等直接采用上游 Clash Verge Rev（当前对齐 **v2.5.1**），以降低维护成本、保持功能与稳定性。
- **前端换肤为 Fluent UI**：界面从 MUI 迁移到 [`@fluentui/react-components`](https://react.fluentui.dev/)（Windows 11 风格),支持 **Mica 半透明**、**深色/浅色/跟随系统** 主题、随系统强调色生成的品牌色。
- **主要面向 Windows**（x64/x86）。

> 与上游功能基本对齐:主页仪表盘、代理/订阅/连接/规则/日志、DNS 覆写、轻量模式、Tunnels、本地备份、流媒体解锁检测、诊断信息导出等。

## 预览

| Dark                             | Light                             |
| -------------------------------- | --------------------------------- |
| ![预览](./docs/preview_dark.png) | ![预览](./docs/preview_light.png) |

> ⚠️ 上方截图为上游旧界面占位图，请替换为本分支 Fluent UI 的实际截图（覆盖 `docs/preview_dark.png` / `docs/preview_light.png`）。

## 安装

请到本仓库的发布页面下载对应安装包：[Release page](https://github.com/solywsh/clash-verge-rev-fluent/releases)<br>
支持 Windows (x64/x86)、Linux (x64/arm64) 与 macOS 11+ (intel/apple)（主测 Windows）。

| 版本      | 特征                                     | 链接                                                                                  |
| :-------- | :--------------------------------------- | :------------------------------------------------------------------------------------ |
| Stable    | 正式版，适合日常使用。                   | [Release](https://github.com/solywsh/clash-verge-rev-fluent/releases)                 |
| AutoBuild | 滚动更新版，适合测试反馈，可能存在缺陷。 | [AutoBuild](https://github.com/solywsh/clash-verge-rev-fluent/releases/tag/autobuild) |

应用内自动更新走本仓库的 release（见 [发布与更新流程](./docs/release.md)）。
后端/内核相关的使用说明与常见问题，可参考上游[文档站](https://clash-verge-rev.github.io/)（后端一致）。

## 功能

- 基于性能强劲的 Rust 与 Tauri 2。
- 内置 [Clash.Meta (mihomo)](https://github.com/MetaCubeX/mihomo) 内核（作为 sidecar 随包发布）。
- **Fluent UI** 界面：Mica 半透明、深色/浅色/跟随系统、随系统强调色生成主题色。
- 主页仪表盘（流量统计、订阅信息、代理模式、网络开关、系统/IP 信息等）。
- 配置文件管理与增强（Merge / Script），配置语法提示（Monaco）。
- 系统代理与守卫、`TUN(虚拟网卡)` 模式。
- DNS 覆写、轻量模式、Tunnels、外部控制器 CORS 设置。
- 可视化节点与规则编辑、延迟测试、流媒体解锁检测。
- 本地备份 与 WebDAV 配置备份/同步、诊断信息导出。

## 开发

需先安装好 **Tauri** 的全部前置依赖，然后：

```shell
pnpm i               # 安装依赖
pnpm run check       # 下载 mihomo 内核 / 服务 / geodata 到 src-tauri（首次必跑）
pnpm dev             # 运行开发版；pnpm dev:diff 可同时跑第二实例
pnpm build           # 生产构建，产物在 src-tauri/target/release/bundle/
```

仅类型检查：`pnpm web:build`（`tsc --noEmit` + vite build）。
更多见 [CONTRIBUTING.md](./CONTRIBUTING.md)、[发布与更新流程](./docs/release.md)。

## 贡献

欢迎 Issue 和 PR！

## 致谢

本项目基于以下项目，或受其启发：

- [clash-verge-rev/clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev): 本分支的上游，后端与核心机制来源。
- [Daydreamer-riri/clash-verge-rev-fluent](https://github.com/Daydreamer-riri/clash-verge-rev-fluent): Fluent UI 迁移的上游来源。
- [tauri-apps/tauri](https://github.com/tauri-apps/tauri): 用 Web 前端构建更小、更快、更安全的桌面应用。
- [MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo): 基于规则的 Go 隧道内核。
- [microsoft/fluentui](https://github.com/microsoft/fluentui): Fluent UI React 组件库。
- [vitejs/vite](https://github.com/vitejs/vite): 下一代前端工具链。

## 许可证

GPL-3.0 License. 详见 [License](./LICENSE)。
