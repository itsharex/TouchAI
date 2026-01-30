// Copyright (c) 2025. 千诚. Licensed under GPL v3

//! 快捷键处理模块
//!
//! 负责注册和处理全局快捷键

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent,
};
use crate::window;

/// 注册全局快捷键
pub fn register_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 注册 Alt+Space 快捷键用于切换窗口显示状态
    let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    app.global_shortcut().register(alt_space)?;
    Ok(())
}

/// 创建快捷键处理器
pub fn create_shortcut_handler() -> impl Fn(&AppHandle, &Shortcut, ShortcutEvent) {
    move |app_handle, received_shortcut, event| {
        // 处理 Alt+Space 快捷键
        let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed && received_shortcut == &alt_space {
            // 忽略切换窗口可见性的错误
            let _ = window::toggle_window_visibility(app_handle);
        }
    }
}

