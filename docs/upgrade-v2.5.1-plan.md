# 后端升级到上游 v2.5.1 实施方案(Fluent 前端保留)

> 目标:**后端 100% 采用上游 `clash-verge-rev` v2.5.1**(零长期维护、白拿内核/服务/启动/更新修复),
> 把本 fork 的 **Fluent UI 前端(`src/`)移植上去**,适配 IPC 接口,恢复软件自更新机制。
> 非必要新功能(DNS 配置、本地备份、轻量模式、流媒体解锁)可暂不接 UI,后端保留无害。

本文档由调研后生成,供后续会话直接执行。最后更新:2026-06-14。

---

## 0. 背景与诊断结论

- 本仓库是 `clash-verge-rev` 的 fork 的 fork,核心价值 100% 在前端 Fluent UI 迁移。
- **分叉点 = 上游 v2.0.3**;上游现已到 **v2.5.1**(领先约 4225 提交,后端被大规模重构)。
- **fork 自身的后端改动极小**:相对 v2.0.3 仅 5 文件 +28/-189,实质只有
  - `open_profile_dir`(打开 profile 目录)
  - 非服务模式直起内核(`start_core_directly`)—— **v2.5.1 已原生且更完善地实现,无需移植**
  - `system_accent_color`(Fluent 强调色,Windows API)
  - `clash_api_get_proxy_delay`(代理延迟,直连 HTTP)
- 结论:**"后端直接用上游"完全成立**。`git merge upstream/main` 不可行(4225 提交冲突),正确做法是
  **"从 v2.5.1 起新分支 + 叠加 Fluent 前端"**。

### ⚠️ 最大风险:内核通信方式变了(必须 Day-1 处理)

|                          | fork(现状)                                                                 | 上游 v2.5.1                                                                                            |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 代理/流量/日志/连接/延迟 | 前端直连 mihomo HTTP/WS 外部控制器(`src/services/api.ts` + axios/sockette) | 走自定义 **`tauri-plugin-mihomo`**(IPC 本地套接字/命名管道),前端用 `tauri-plugin-mihomo-api`           |
| configs / version        | HTTP                                                                       | 仍走 `api.ts` 的 HTTP                                                                                  |
| HTTP 外部控制器          | 默认开启                                                                   | **默认关闭**(`enable_external_controller` 默认 `Some(false)`,见 `config/clash.rs:451`),仅保留 IPC 管道 |

含义:v2.5.1 默认不开 HTTP 控制器,fork 的 `api.ts` 直连**默认连不上**。两条路:

- **路径 B(快速上车,先用)**:后端把 `enable_external_controller` 强制设为 `true`(并固定端口+secret),
  让 mihomo 同时暴露 HTTP 控制器,**fork 的 `api.ts` 几乎原样可用**。改动小、上手快。
  缺点:重新打开本地 HTTP 端口(上游出于安全默认关掉的),长期偏离上游方向。
- **路径 A(对齐上游,后做)**:前端数据层改用 `tauri-plugin-mihomo-api`
  (`getProxies` / `delayProxyByName` / `MihomoWebSocket.connect_logs|connections|traffic` 等),
  保持 IPC 默认。工作量大(重写 `api.ts`、`use-log-data`、`layout-traffic`、`connections` 等数据层,
  **UI 组件本身不动**),但**完全对齐上游、长期零维护**——符合本次升级初衷。

**推荐排序:先 B 跑通整体(验证后端、命令、窗口、自更新都 OK),再 A 迁移数据层彻底对齐。** 分两步降风险。

---

## 1. 分支与环境准备(P0)

### 1.1 编译联网前置(每次新开 shell 都要做!)

> **rustup/cargo 不读 Windows 系统代理,只认环境变量。** 之前所有"卡死"都因此。先开 clash,再:

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY  = "http://127.0.0.1:7890"
$env:CARGO_HTTP_PROXY = "http://127.0.0.1:7890"
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:LOCALAPPDATA\corepack-bin;$env:Path"
```

- 工具链已装好:rustc/cargo 1.96.0(MSVC)、VS BuildTools 2022、pnpm 9.13.2、Node 24。
- **app 单例**:开发前关掉已安装的正式版 Clash Verge,或用 `pnpm dev:diff`(verge-dev flag,独立配置目录 `...clash-verge-rev.dev`)。
- 配置目录在 `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\`,**在仓库之外,不会被提交**。

### 1.2 建工作分支(从 v2.5.1 起)

```bash
# upstream 已配置:git remote -v 应有 upstream = https://github.com/clash-verge-rev/clash-verge-rev.git
git -c http.proxy=http://127.0.0.1:7890 fetch upstream --tags    # 如需刷新
git switch -c upgrade/v2.5.1 v2.5.1                              # 后端基底 = 纯上游 v2.5.1
# 把本方案文档带过来(它在 fluent-v2 分支上)
git checkout fluent-v2 -- docs/upgrade-v2.5.1-plan.md
```

之后所有工作在 `upgrade/v2.5.1` 分支进行,`fluent-v2` 与正在跑的 app 不受影响。

---

## 2. 移植 Fluent 前端到 v2.5.1(P1)

### 2.1 拉入 Fluent 前端源码与构建配置

```bash
# 在 upgrade/v2.5.1 分支上,用 fluent-v2 的前端覆盖
git checkout fluent-v2 -- src/                 # 整个 Fluent 前端
git checkout fluent-v2 -- vite.config.mts tsconfig.json index.html
git checkout fluent-v2 -- scripts/check.mjs    # 含已修复的 https-proxy-agent 导入 + 内核下载逻辑
```

> `src/services/api.ts`、`src/hooks/use-*`、`src/components/`、`src/pages/` 都来自 fluent-v2。

### 2.2 reconcile `package.json`(手工合并,关键)

**保留 Fluent 的前端栈不动**(React 18 / Vite 5 / MUI 6 / @fluentui/\*):前端框架版本与后端无关。
**只对齐 Tauri 相关 JS 包到 v2.5.1 的 Rust 插件版本**(宿主/访客 ABI 必须匹配):

```jsonc
// dependencies 改为:
"@tauri-apps/api": "2.10.1",
"@tauri-apps/plugin-clipboard-manager": "^2.3.2",
"@tauri-apps/plugin-dialog": "^2.6.0",
"@tauri-apps/plugin-fs": "^2.4.5",
"@tauri-apps/plugin-http": "~2.5.7",          // 新增
"@tauri-apps/plugin-process": "^2.3.1",
"@tauri-apps/plugin-shell": "2.3.5",
"@tauri-apps/plugin-updater": "2.10.1",
"@tauri-apps/plugin-notification": "^2.3.3",   // 后端用到,保留
"@tauri-apps/plugin-global-shortcut": "^2.3.1",
"tauri-plugin-mihomo-api": "github:clash-verge-rev/tauri-plugin-mihomo",  // 路径 A 需要;路径 B 也先装着无害
```

- `@tauri-apps/cli`(devDeps)对齐到 `2.10.x`。
- `packageManager` 暂留 `pnpm@9.13.2`(可后续升 10)。
- 装依赖:`corepack` 的 pnpm + `pnpm i`(走代理)。

### 2.3 前端构建配置注意点

- `vite.config.mts`:保留 fork 的 `vite-plugin-monaco-editor`(yaml worker)、SCSS、legacy polyfill —— 上游没有这些。
- `tsconfig.json`:fork 用 `moduleResolution: "Node"`,如类型报错可改回 `"Bundler"`;`paths` 别名 `@/`→`src/`、`@root/`→根。
- `index.html`:可选择性合入上游的初始 loading 遮罩(防白屏),但 Fluent 主题已自管,非必须。

---

## 3. 给上游后端补回 fork 命令(P2)

v2.5.1 后端命令在 **`src-tauri/src/cmd/`**(单数),`lib.rs` 用 `generate_handler!` 注册。需新增 3 个命令并注册:

| 命令                                      | 放到                                 | 说明                                                                                                                                 | 来源(fork)                  |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `system_accent_color() -> Option<String>` | `cmd/app.rs`(或新建 `cmd/system.rs`) | **Fluent 主题强调色,关键**。Windows `UISettings::GetColorValue(Accent)` 返回 `rgb(r,g,b)`。前端 `src/pages/_fluent_theme.tsx` 调用。 | `src-tauri/src/cmds.rs:443` |
| `open_profile_dir(index: String)`         | `cmd/profile.rs`                     | 打开 profile 文件所在目录(`open::that_detached(parent)`)。                                                                           | `src-tauri/src/cmds.rs:116` |
| `clash_api_get_proxy_delay(...)`          | `cmd/clash.rs`                       | **仅路径 B 需要**。路径 A 用插件 `delayProxyByName` 替代,可不加。                                                                    | `src-tauri/src/cmds.rs:279` |

注意:

- `cmds.rs` 旧实现里的 `wrap_err!/ret_err!` 宏、`Config::profiles().latest()` 等 API 在 v2.5.1 可能已改(如 `Config::profiles().await.latest_ref()`)。**照 v2.5.1 同模块现有命令的写法适配**,别照搬旧签名。
- 在 `lib.rs` 的 `generate_handler!` 列表加上这 3 个(`tauri::generate_handler![ ... cmd::system_accent_color, cmd::open_profile_dir, ... ]`)。
- **`open_profile_dir` 可能上游已有等价命令**(如 `open_logs_dir`/`open_core_dir` 同款),优先复用上游已有的。

---

## 4. IPC 接口适配(P3,改前端 `src/services/cmds.ts`)

44 个共用命令里 40 个同名直用,需改这几处:

| 命令                    | 变化                                                                         | 前端要做                                                                         |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `enhance_profiles`      | 返回 `()` → `ValidationOutcome`                                              | 接收返回值;可先忽略其内容,或弹校验提示                                           |
| `patch_profiles_config` | 返回 `()` → `ValidationOutcome`                                              | 同上                                                                             |
| `copy_icon_file`        | 第二参 `name: String` → `icon_info: IconInfo{ name, previous_t, current_t }` | 构造对象传入(`src/services/cmds.ts` 的 `copyIconFile`)                           |
| `get_runtime_exists`    | `Vec<String>` → `HashSet<String>`                                            | JS 侧无感,无需改                                                                 |
| 事件 `verge://test-all` | 上游不发                                                                     | 测试页 `src/components/test/test-item.tsx` 依赖它;确认上游测试流程或改用上游事件 |

事件契约:`verge://notice-message`、`verge://refresh-clash-config`、`verge://refresh-verge-config` 三者上游仍发,直接可用。
上游新增 `verge://timer-updated`、`verge://refresh-proxy-config`(可选接)。

---

## 5. 窗口/标题栏 Fluent 定制(P2 后端,务必移植)

v2.5.1 **没有** decorum 覆盖标题栏 / Mica / 自定义 browser args —— 这些是 Fluent 视觉必需,要移植:

- `Cargo.toml` 加:`tauri-plugin-decorum = { git = "https://github.com/Daydreamer-riri/tauri-plugin-decorum.git" }`
- `lib.rs` 注册:`.plugin(tauri_plugin_decorum::init())`
- 窗口创建在 v2.5.1 的 **`src-tauri/src/utils/resolve/window.rs`**(`build_new_window`),在 `.build()` 后/builder 上加:
  - `window.create_overlay_titlebar()?;`(Windows 覆盖标题栏)
  - `.transparent(true).effects(WindowEffectsConfig{ effects: vec![Effect::Mica], .. })`
  - `.additional_browser_args("--enable-features=msEdgeFluentOverlayScrollbar,msOverlayScrollbarWinStyle,msWebView2EnableDraggableRegions,...")`
- window-state:fork 用 `StateFlags::all() & !StateFlags::VISIBLE`(防启动闪烁),在 v2.5.1 的 window-state 初始化里复刻。

> **不要**移植 fork 的 `resolve.rs`/`service.rs`/`core.rs` 启动与服务回退补丁 —— v2.5.1 已有更好的
> service→sidecar 回退(`core/manager/lifecycle.rs`、`state.rs`)和白屏修复(`window.rs` `.visible(false)` + 页面加载后显示)。

---

## 6. 权限/能力 与 构建开关(P2)

- **`withGlobalTauri: true`** 保留(`tauri.conf.json`)——自定义命令无需逐条写 capability。
- **`removeUnusedCommands`**:v2.5.1 默认 `true`,会按前端引用裁剪命令。**移植期先设 `false`**,
  等 3 个 fork 命令都补好、前端验证通过后再开回 `true`。
- Windows capability:`tauri.windows.conf.json` 的 `security.capabilities` 加上
  `["desktop-capability","desktop-windows-capability","migrated"]`(v2.5.1 新增 `desktop-windows-capability`)。
- mihomo 插件权限:`capabilities/desktop.json` 含 `"mihomo:default"`(路径 A/B 都保留,后端注册了该插件)。

---

## 7. 软件自更新(P4,先恢复机制,端点/签名后配)

fork 把 updater 整段删了,这是"更新追踪"缺失根因。恢复:

- `tauri.conf.json`:`bundle.createUpdaterArtifacts: true`;`plugins.updater`:
  ```jsonc
  "updater": {
    "pubkey": "<你自己的 minisign 公钥>",      // 先占位,后配
    "endpoints": ["https://example.invalid/update.json"],  // 先占位,指向你 fork 的 release
    "windows": { "installMode": "passive" }
  }
  ```
- `Cargo.toml`:启用 `tauri-plugin-updater`(v2.5.1 已声明 `2.10.0`,fork 之前注释掉了);`lib.rs` 注册插件。
- 前端:`src/components/setting/mods/update-viewer.tsx` 已存在(用 `@tauri-apps/plugin-updater`),保证依赖到位即可。
- capability:`desktop.json` 含 `updater:default / allow-check / allow-download-and-install`。
- **你后续要做的基建**(本次只恢复机制):生成 minisign 密钥对、CI 产出 `update.json` 并上传到你 fork 的 release、
  把 `pubkey`/`endpoints` 换成真实值。签名私钥走 `TAURI_SIGNING_PRIVATE_KEY` 环境变量,**绝不入库**。

---

## 8. 编译联调与验收(P5)

```powershell
# 前置:见 1.1 设代理 + PATH;关掉正式版 Clash Verge
pnpm i
pnpm run check          # 下载内核/service/geo 数据(走代理)
pnpm web:build          # 先单独验证前端 tsc + vite 能过
pnpm dev                # 或 dev:diff;首次 Rust 全量编译较久
```

验收清单:

1. 编译通过(前端 tsc 无错;cargo build 无错)。
2. 启动无白屏,Fluent 界面正常,**强调色生效**(`system_accent_color`)。
3. 核心能起(服务模式/sidecar 回退);代理列表、节点切换正常。
4. 流量/日志/连接实时显示正常(路径 B:HTTP 控制器已开;路径 A:插件 WS)。
5. 代理延迟测试可用。
6. profile 增删改、导入、订阅更新正常;`open_profile_dir` 打开目录。
7. 系统代理 / TUN 开关正常。
8. 设置页"检查更新"能走通 updater(占位端点会返回无更新或报错,属正常)。

---

## 9. 阶段顺序与心理预期

```
P0 建分支/环境  →  P1 前端落地+依赖对齐  →  P2 后端补命令+窗口+权限+updater机制
   →  P3 IPC签名适配  →  P5 编译联调(路径B:开HTTP控制器跑通)  →  验收
   →  (后续) P-A 数据层迁移到 tauri-plugin-mihomo,彻底对齐上游
```

- 这是**数小时~数天级**工程,P5 会有多轮"编译—修类型/借用/签名错"循环,属正常。
- 先用**路径 B** 把端到端跑通(最快看到可用版本),再排期**路径 A** 收尾对齐。
- 每个阶段建议单独 commit,出问题易二分定位。

---

## 10. 关键事实速查(避免重复调研)

- 后端命令目录:`src-tauri/src/cmd/`(单数);注册在 `lib.rs` 的 `generate_handler!`。
- mihomo 插件:`Cargo.toml` `tauri-plugin-mihomo = { git=".../tauri-plugin-mihomo", branch="revert" }`;前端 `tauri-plugin-mihomo-api`(github:clash-verge-rev/tauri-plugin-mihomo)。
- HTTP 控制器开关:`config/clash.rs` 的 `enable_external_controller`(默认 false);`verge.rs` 同名设置。
- 3 个要补的命令源码位置(fork):`src-tauri/src/cmds.rs` 中 `system_accent_color`(~443)、`open_profile_dir`(~116)、`clash_api_get_proxy_delay`(~279)。
- IPC 签名变化:`enhance_profiles`、`patch_profiles_config` → `ValidationOutcome`;`copy_icon_file` → `IconInfo`。
- 不要移植 fork 的启动/服务补丁;要移植窗口 decorum/Mica/browser-args。
- 代理铁律:开发联网前 `set HTTPS_PROXY/HTTP_PROXY/CARGO_HTTP_PROXY = http://127.0.0.1:7890`。
