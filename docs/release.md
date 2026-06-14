# 构建、发布与更新流程

本文档记录本 fork(`solywsh/clash-verge-rev-fluent`)的本地构建、CI 发版、应用自更新与内核更新机制。
后端跟随上游 Clash Verge Rev,前端为 Fluent UI 分支;默认/发布分支为 **`main`**。

## 1. 本地构建

```shell
pnpm i                 # 安装前端依赖
pnpm run check         # 下载 mihomo 内核 + 特权服务 + geodata 到 src-tauri（首次必跑）
pnpm run check --force # 强制更新内核到 check.mjs 指定的版本
pnpm dev               # 开发运行（pnpm dev:diff 跑第二实例，独立 appdata）
pnpm build             # 生产构建 → src-tauri/target/release/bundle/（Windows: nsis/*.exe, msi/*.msi）
pnpm web:build         # 仅前端类型检查 + 构建（tsc --noEmit + vite build）
```

- 工具链:Rust 由 `rust-toolchain.toml` 锁定(rustup 自动装);Node 21+(`.tool-versions`);pnpm via corepack。
- 本地构建**不需要**签名密钥;只有 CI 发版做自更新签名时才需要。

## 2. 内核(mihomo)更新走哪

- 源:`scripts/check.mjs`,从 `github.com/MetaCubeX/mihomo/releases` 下载。
- **当前锁定 `v1.19.25`**(`META_VERSION_PINNED`)。原因:mihomo 1.19.26 新增内置 `PassRule` 代理类型,
  bundled `tauri-plugin-mihomo`(revert 分支)的 `ProxyType` 枚举不认识它,会导致 `get_proxies` 整包反序列化
  失败、代理页为空。**插件支持 PassRule 后,把该常量改回从 `META_VERSION_URL` 取 latest 即可解锁。**
- 内核作为 **sidecar 随安装包发布**(gitignored,构建时打包),所以终端用户的内核版本 = 发版时锁定的版本。
- 同时 check.mjs 还下载 `clash-verge-rev/clash-verge-service`(TUN 特权服务)和 geodata,这些**保持上游源**不变。

## 3. 应用自更新走哪

- 配置:`src-tauri/tauri.conf.json` → `plugins.updater`。
  - `endpoints`:已指向**本 fork** 的 release:
    `https://github.com/solywsh/clash-verge-rev-fluent/releases/download/updater/update.json`(+ gh-proxy 镜像)。
  - `pubkey`:本 fork 自己的 minisign 公钥(私钥见下,**不入库**)。
  - `createUpdaterArtifacts: true`,构建时生成签名的更新产物。
- 流程:`scripts/updater.mjs`(由 `.github/workflows/updater.yml` 的 `pnpm updater` 触发)生成 `update.json`
  并上传到 `updater` tag 的 release;应用启动时读 endpoints 的 update.json 比对版本并自更新。

### 签名密钥(机密)

- 密钥对由 `pnpm tauri signer generate -w <路径>` 生成。**私钥绝不入库**,本地保存在仓库外
  (本机:`~/.tauri/clash-verge-rev-fluent.key`),**务必另行备份**——丢失则无法再签更新包,已发布版本的自更新会永久失效。
- 公钥已填入 `tauri.conf.json` 的 `plugins.updater.pubkey`。
- CI 通过 GitHub Secrets 注入(见 `release.yml` 的 env 映射):
  - `TAURI_PRIVATE_KEY` = 私钥文件完整内容 →(映射到 `TAURI_SIGNING_PRIVATE_KEY`)
  - `TAURI_KEY_PASSWORD` = 私钥密码 →(映射到 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`;当前为空密码)

## 4. 发布流程(CI)

发布分支为 **`main`**。各 workflow 的发布/下载地址、复用 workflow 引用均已指向本 fork。

1. 改版本号:`package.json` 与 `src-tauri/tauri.conf.json` 的 `version` 保持一致(release.yml 会校验 tag == 版本)。
2. 提交到 `main`。
3. 打 tag 并推送:
   ```shell
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   - `.github/workflows/release.yml` 由 `v*.*.*` tag 触发,且要求 **tag 在 `main` 分支上**、版本号与 tag 一致;
     随后用 `tauri-action` 全平台构建并发布到该 tag 的 GitHub Release。
4. 发更新清单:手动运行 **Actions → "Updater CI"**(`updater.yml`)→ 生成并上传 `update.json` 到 `updater` release,
   应用内自动更新才会生效。
   5.(可选)`autobuild.yml` 为滚动 prerelease 夜间构建;`telegram-notify.yml` 为发布通知(均已指向本 fork)。

### 上线前 checklist

- [ ] GitHub Secrets 已配置 `TAURI_PRIVATE_KEY` / `TAURI_KEY_PASSWORD`(+ macOS 签名密钥若需)。
- [ ] 仓库默认分支为 `main`。
- [ ] `tauri.conf.json` 的 `pubkey`/`endpoints` 为本 fork(已配)。
- [ ] 版本号三处一致(package.json / tauri.conf.json / git tag)。
- [ ] 私钥已安全备份。

## 5. 注意事项

- 不要让 `endpoints`/`pubkey` 指回上游,否则应用会把自己更新成上游原版,覆盖 Fluent 界面。
- `removeUnusedCommands` 迁移期为 `false`,稳定后可改回 `true`。
- 生产安装包(`pnpm build`)与真机自更新链路仍建议在正式发版前完整验证一次。
