# v2.5.1 升级进度与交接

> 配套文档:总体方案见 [`upgrade-v2.5.1-plan.md`](./upgrade-v2.5.1-plan.md)。
> 本文记录**实际执行进度、决策、踩坑与剩余事项**,供后续会话直接接手。
> 最后更新:2026-06-14。分支:`upgrade/v2.5.1`(基底 = 纯上游 `v2.5.1` tag)。

## 总体状态:P0 → P5 端到端跑通 ✅

从纯上游 v2.5.1 后端起,叠加 Fluent 前端,`pnpm dev:diff` 可完整运行。已验证:
编译通过、无白屏、强调色、内核启动(sidecar 回退)、配置验证/下发、**代理列表 72 节点+切换**、
实时流量/连接/日志(数据层走 mihomo 插件 IPC = 路径 A)、延迟测试、窗口按钮/Mica/图标、
updater 机制(连端点拿到"无更新")、profile 本地导入。

## 提交序列(在 `upgrade/v2.5.1` 上)

| 阶段 | commit(摘要)                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| P0   | 方案文档带到 v2.5.1 基底                                                                                                 |
| P1   | port Fluent 前端;reconcile package.json;更新 pnpm-lock                                                                   |
| P2   | 后端补 3 命令 + Fluent 窗口(decorum/Mica);removeUnusedCommands=false                                                     |
| P5/A | 前端数据层迁移到 mihomo 插件(api.ts + websocket.ts + 三个消费方)                                                         |
| 修复 | 还原 fork husky 钩子;还原 fork 图标;withGlobalTauri=true;锁内核 1.19.25;dev CDP 端口;日志下拉大小写+WARN;统一日志 buffer |

## 关键决策与踩坑(避免重复调研)

- **数据层 = 路径 A**(用户选定):前端经 `tauri-plugin-mihomo-api` 走 IPC,不开 HTTP 外部控制器。
  与上游 v2.5.1 一致(上游 api.ts 仅做 IP/地理检测,代理/连接/流量/日志都用插件)。
- **内核锁 1.19.25**(`scripts/check.mjs` 的 `META_VERSION_PINNED`):mihomo **1.19.26 新增内置
  `PassRule` 代理类型**,而 bundled `tauri-plugin-mihomo`(revert 分支)的 `ProxyType` 枚举不认识它
  → `plugin:mihomo|get_proxies` 整包反序列化失败("error decoding response body")→ 代理页空。
  1.19.25 是 PassRule 之前最后一版,也是上游 v2.5.1 ship 的版本。**插件支持 PassRule 后可解锁回 latest。**
- **`withGlobalTauri: true`**(tauri.conf.json):decorum 的窗口控制按钮(Win 最小/最大/关闭)依赖
  `window.__TAURI__`,否则 console 报 "DECORUM: Tauri API not found",按钮消失。Win 上 fork 不渲染
  React 版按钮(`_layout.tsx` 仅非 Win 渲染 `LayoutControl`),全靠 decorum。
- **更新器(updater)上游 v2.5.1 本就完整**(插件已注册、Cargo 依赖、conf 配置齐全),无需重建。
  ⚠️ 但 endpoints/pubkey 仍指向**上游官方** release,上线前必须换成本 fork 的。
- **proxy delay** 做成后端桥接 `Handle::mihomo().delay_proxy_by_name`(`cmd/clash.rs`
  `clash_api_get_proxy_delay`),路径 A/B 通用;前端去掉了 `encodeURIComponent`(插件内部已编码)。
- 不要移植 fork 的启动/服务补丁;上游已有更好实现。

## 剩余事项(均不阻塞,按需排期)

1. **订阅 URL 直接导入失败**(非迁移 bug,纯上游 `utils/network.rs`)。订阅商按出口 IP 拦截:经
   LAN 代理=200,直连=403/401。app 实际走了直连——`importProfile` 传了 `with_proxy:true`
   (→`ProxyType::System`),但 `Sysproxy::get_system_proxy()` 似乎没把 Windows 系统代理
   (`ProxyServer=10.4.0.120:6152`)喂给 reqwest。当前用**本地导入**绕过(已拿到 72 节点)。
   待办:查清 sysproxy 检测为何失效,让粘 URL 也能走代理。
2. **updater 基建**:生成 minisign 密钥对、CI 产出 `update.json` 上传到本 fork release、把
   tauri.conf.json 的 `pubkey`/`endpoints` 换成真实值(私钥走 `TAURI_SIGNING_PRIVATE_KEY`,不入库)。
3. **解锁内核版本**:等 `tauri-plugin-mihomo` 支持 PassRule 后,把 check.mjs 改回取 latest。
4. **§4 运行时签名**未专门测:`enhance_profiles`/`patch_profiles_config`→`ValidationOutcome`、
   `copy_icon_file`→`IconInfo`(导入/编辑配置若报错再看)。
5. **alpha 内核**:check.mjs 只锁了 stable;alpha(`verge-mihomo-alpha`)仍取 latest,若切到 alpha
   会同样踩 PassRule。app 默认用 stable,暂不影响。
6. **`removeUnusedCommands`**:迁移期设为 `false`,验证稳定后可改回 `true`。
7. **生产构建**未做:只跑了 `dev:diff`。`pnpm build` 出安装包待验证。

## 开发 / 调试环境(本机)

- **代理**:本地 clash 关着;用局域网代理 `http://10.4.0.120:6152`(http)/ `6153`(socks5)。
  联网编译前在同一 shell 设 `HTTPS_PROXY/HTTP_PROXY/CARGO_HTTP_PROXY`;git fetch 加 `-c http.proxy=...`。
- **工具链**:仓库 `rust-toolchain.toml` 锁 **Rust 1.91.0**(rustup 自动装);pnpm via corepack
  (`$LOCALAPPDATA\corepack-bin`);Node 24。vite dev 端口 3000(匹配 `devUrl`)。
- **单例**:用 `pnpm dev:diff`(verge-dev flag,独立 appdata `...clash-verge-rev.dev`)避免与正式版冲突。
- **内核/资源**:sidecar 二进制 + resources 在 `src-tauri/`(gitignored);`pnpm run check` 下载
  (现锁 1.19.25)。
- **自助调试(CDP)**:debug 构建给 WebView2 加了 `--remote-debugging-port=9222`。可用根目录的
  `node .cdp-eval.mjs "<js表达式>"`(未入库,node24 内置 WebSocket)连进真实 webview 执行 JS / 调
  IPC,例:`window.__TAURI__.core.invoke('plugin:mihomo|get_proxies')`。要看 mihomo 原始 HTTP JSON,
  先 `invoke('patch_verge_config',{payload:{enable_external_controller:true}})` 再 curl
  `127.0.0.1:9097`(secret `set-your-secret`),**用完记得还原为 false**。
