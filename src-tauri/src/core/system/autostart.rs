// Copyright (c) 2025. 千诚. Licensed under GPL v3

//! 开机自启动模块
//!
//! 负责管理应用的开机自启动功能

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

pub fn enable_autostart(app: AppHandle) -> Result<(), String> {
    let autostart_manager = app.autolaunch();
    autostart_manager
        .enable()
        .map_err(|e| format!("Failed to enable autostart: {}", e))
}

pub fn disable_autostart(app: AppHandle) -> Result<(), String> {
    let autostart_manager = app.autolaunch();
    autostart_manager
        .disable()
        .map_err(|e| format!("Failed to disable autostart: {}", e))
}

pub fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    let autostart_manager = app.autolaunch();
    autostart_manager
        .is_enabled()
        .map_err(|e| format!("Failed to check autostart status: {}", e))
}
