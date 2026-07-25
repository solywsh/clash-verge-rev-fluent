# 特权服务的版本对齐

## 问题

应用有两半必须版本一致：

- **客户端**：`clash_verge_service_ipc` crate，编译进 `clash-verge.exe`（`src-tauri/Cargo.toml`）。
- **服务端**：`clash-verge-service{,-install,-uninstall}.exe`，由 `scripts/check.mjs`（本地）和
  `scripts/prebuild.mjs`（CI）下载进 `src-tauri/resources/`，随安装包分发。

两者通过命名管道上的 HTTP（kode_bridge `/magic` 协议）通信，握手会校验协议版本。

原先这两半各走各的版本线：客户端是 Cargo.toml 里的语义化版本约束，服务端固定取
`releases/latest`。只要 service-ipc 仓库发了新版而本仓库没同步升级 crate，CI 打出的包就是
**客户端旧 + 服务端新**的组合。

后果不只是"服务用不了"，而是一个提权弹窗风暴：

```
[Service] 服务需要重装，执行重装流程      ← uninstall.exe(UAC) + install.exe(UAC)
[Service] 服务已运行且版本匹配，直接使用   ← is_reinstall_service_needed() 只比对版本号，通过了
[Service] 启动核心失败: service protocol version does not match   ← 但握手校验的是协议版本
[Core] service start attempt 1/5 failed → 再来一轮 …
```

`core/service.rs` 的重装动作散布在多个重试循环里（启动等待、`SERVICE_START_RETRIES`、
sidecar→service 交接监视器），每一轮都重新提权，非管理员启动一次能弹出十几个 UAC 窗口
（且因为这些 exe 没有代码签名，显示为"未知发布者"）。

## 现在的约束

**`Cargo.lock` 是唯一事实来源。**

1. `src-tauri/Cargo.toml` 用精确 tag 锁定 crate：`tag = "v2.3.3"`。
2. 两个下载脚本从 `Cargo.lock` 里读出 `clash_verge_service_ipc` 的版本，去
   `releases/download/v<version>/` 取同版本的归档，不再使用 `releases/latest`。
3. 下载后在 `src-tauri/resources/.service-version` 写入版本戳。脚本只在版本戳与锁定版本一致时
   才复用磁盘上已有的二进制——否则重新下载。（在此之前的逻辑是"文件存在就跳过"，所以升级
   crate 后本地会一直沿用旧二进制。）

## 升级服务版本的正确姿势

改 `src-tauri/Cargo.toml` 的 `tag` 和 `version`，然后：

```shell
cargo update -p clash_verge_service_ipc
pnpm run check          # 版本戳不匹配，会自动重新下载对应版本的服务二进制
```

不要只改其中一半。改完务必确认 `Cargo.lock` 里的版本与
`src-tauri/resources/.service-version` 一致。

注意 v2.3.3 → v2.5.x 是**破坏性变更**：客户端 API 增加了 `OwnerCredentials` 参数，
`get_version` 的返回类型从 `String` 变成 `ProtocolInfo`，还新增了 `set_system_proxy`。
升级到 2.5.x 需要同步迁移 `src-tauri/src/core/service.rs`，属于后端整体跟进上游的工作，
不是单独换个版本号就能完成的。

## 运行时的兜底

即使版本对齐，`core/service.rs` 里仍有一道提权闸门，防止任何持续失败的原因再次演变成弹窗风暴：

- 后台路径（`refresh()`，即启动流程与各类重试循环）每次运行**最多提权一次**。
- 用户在 UAC 窗口点了"否"之后，后台路径彻底停手，不再尝试。
  Windows 上的识别方式是 `runas` 返回退出码 `-1`（该 crate 在 ShellExecuteEx 失败时返回 `!0`，
  并不会返回 `Err`）；Linux 看 pkexec 的 `126`；macOS 看 osascript 的 `User canceled`。
- 设置页里用户主动点击的安装/卸载/重装/修复会重置闸门，所以手动操作永远能弹出授权窗口。
- 重装时如果卸载那一步的授权被拒绝，就不再弹出安装的授权窗口。
