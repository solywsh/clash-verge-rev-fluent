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

## 前端功能补齐(方案 B:维持 Fluent 前端,逐个移植上游 v2.5.1 功能)

用户决策(2026-06-14):**维持当前 Fluent 前端架构**,把上游 v2.5.1 多出来的功能逐个移植进来,
**保持 Fluent 图标/风格统一**。差距:后端暴露 85 命令,上游前端接 68,fork 前端原本只接 47。
分 4 批(Home 最纠缠,放最后用 fork 自有 SWR 数据层重写,不引入上游 react-query app-data-context)。

**移植套路(已定型,后续照做):**

- 设置类 viewer = `forwardRef<DialogRef>`,渲染为 `<Expander left right />` 行片段(不是 BaseDialog 模态);
  在 setting-clash / setting-system 里用 `FluentSettingItem canExpand content={<Viewer ref={...}/>}` 内联展开。
- ⚠️ 内联展开**不会调用 `open()`**,所以 viewer 必须用 `useEffect` 从 hook 数据(clash/verge)初始化,
  不能只在 `useImperativeHandle.open()` 里初始化(上游 tun-viewer 那样在内联下会显示默认值)。
- i18n:fork 用**扁平 key**(`t("Allow Lan")`),上游是嵌套 key。移植时一律转扁平 key,并加到
  `src/locales/en.json` + `zh.json`(缺失会回退到 key 文本,英文可读但中文会显英文)。
- 用 `Notice`(@/components/base)替代上游 `showNotice`(notice-service);fork 没有 notice-service。
- fork 的 `base` **没有导出 MonacoEditor**,涉及 Monaco 的高级编辑模式直接砍掉,只留可视化表单。
- 新 verge/clash 字段加到 `src/services/types.d.ts`(后端已是 v2.5.1,字段都在,只是前端 type 旧)。
- Fluent select 用 `<Select><option/></Select>`;多行用 `<Textarea resize="vertical">`;开关 `Switch`。
- 每批一个 commit,`pnpm web:build`(tsc+vite)必须过。

**进度:**

- ✅ **批 1 (commit `fae8aa0b`)**:DNS 覆写 / 轻量模式 / Tunnels 三个 viewer。
  cmds.ts 加了 DNS×5(check/get/save/validate/applyDnsConfig)、entry/exitLightweightMode、isPortInUse;
  types 加 IConfigData.dns/tunnels + ITunnelItem + verge 的 enable_auto_light_weight_mode/auto_light_weight_minutes。
  DNS 砍了 Monaco 高级模式。build 过。**待真机验证**(保存/校验/应用 DNS、隧道增删、轻量进入)。
- ✅ **批 2 (commit `9fb3afeb`)**:本地备份 + external-controller CORS。
  cmds 加 create/list/delete/restore/import/exportLocalBackup;types 加 ILocalBackupFile +
  IConfigData["external-controller-cors"]。本地备份用 plugin-dialog 的 open/save 做导入导出,
  接进 setting-verge;CORS 写 clash `external-controller-cors` 后 restartCore,接进 setting-clash。
  build 过。**待真机验证**。(注:auto-backup-settings / backup-history 暂未做,WebDAV 自动备份属增强项,按需再补。)
- ✅ **批 3 (commit `63ed8fd3`)**:Unlock 媒体解锁页 + 诊断导出。
  unlock 页(pages/unlock.tsx)用 get_unlock_items/check_media_unlock,localStorage 缓存结果;
  保留 MUI 但把上游 v7 的 `<Grid size>` 换成 CSS grid(fork 是 MUI6);新增 '/unlock' 路由 + nav 项。
  诊断导出按钮接 export_diagnostic_info(sysinfo 插件)进 setting-verge。cmds 加
  getUnlockItems/checkMediaUnlock/exportDiagnosticInfo;types 加 IUnlockItem。build 过。
  **核心侧日志(get_clash_logs)有意跳过**:fork 已有 websocket 实时日志,且上游在弃用核心日志记录。
- ⬜ **批 4:Home 仪表盘页**(最大一批,**需后端改动 + cargo 重建**)。计划:
  1. 后端补 2 个 `#[tauri::command]`:`get_system_info`(返回 OS/系统信息字符串)、`get_app_uptime`
     (返回 app 运行毫秒数);写在 `src-tauri/src/cmd/` 合适模块 + 注册进 lib.rs generate_handler!。
  2. 前端 cmds.ts 加 `getSystemInfo`/`getAppUptime`/`patchClashMode`(patch_clash_mode 后端已有)/
     `getRunningMode`(get_running_mode 已有)/`getSystemHostname`(已有);api.ts 加 `getIpInfo`(端口上游
     api.ts 的 IpInfo 接口,用 fork 的 mihomo-api 或 fetch;上游用 react-query→改 useSWR)。
  3. 用 fork **现有 SWR/websocket 数据层**重写 Home(**不**引入上游 react-query/app-data-context)。
     卡片:traffic-stats(复用 createMihomoWs traffic/memory + getConnections)、clash-info、clash-mode、
     home-profile(useProfiles)、proxy-tun(useVerge,复用设置页系统代理/TUN 开关逻辑)、ip-info(getIpInfo)、
     system-info(getSystemInfo+running mode)、test-card(fork 已有 test 页组件)。
     **current-proxy-card 和 canvas 流量图(各 ~1000 行)可砍/简化**——侧边栏已有流量曲线。
  4. nav:\_routers.tsx 加 Home 项 path '/'(放最前),Proxies 从 '/' 改到 '/proxies';home.svg 资源缺,用 Fluent 图标。
  5. verge type 补 `home_cards`(卡片显隐)等字段。详见会话内 Home port spec(general-purpose agent 产出)。

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
