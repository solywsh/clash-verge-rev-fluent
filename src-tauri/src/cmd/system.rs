use std::sync::Arc;

use crate::core::{CoreManager, manager::RunningMode};

/// 获取当前内核运行模式
#[tauri::command]
pub async fn get_running_mode() -> Result<Arc<RunningMode>, String> {
    Ok(CoreManager::global().get_running_mode())
}

/// 获取系统强调色 (Fluent 主题用)
///
/// Windows 通过 `UISettings::GetColorValue(Accent)` 读取系统强调色,
/// 返回形如 `rgb(r,g,b)`;其他平台返回 `None`,前端回退到默认色。
#[cfg(windows)]
#[tauri::command]
pub fn system_accent_color() -> Option<String> {
    use windows::UI::ViewManagement::{UIColorType, UISettings};

    let settings = UISettings::new().ok()?;
    let color = settings.GetColorValue(UIColorType::Accent).ok()?;
    Some(format!("rgb({},{},{})", color.R, color.G, color.B))
}

#[cfg(not(windows))]
#[tauri::command]
pub fn system_accent_color() -> Option<String> {
    None
}
