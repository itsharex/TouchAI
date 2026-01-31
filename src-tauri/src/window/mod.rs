// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 窗口管理模块
//!
//! 负责处理窗口相关的操作，包括显示、隐藏、焦点设置等

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, WindowEvent};

// 全局标志：是否允许失焦时隐藏窗口
static ALLOW_BLUR_HIDE: AtomicBool = AtomicBool::new(true);

/// 设置窗口事件监听器
/// 当窗口失去焦点时自动隐藏窗口（保持当前大小）
pub fn setup_window_events(_app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = _app
                .get_webview_window("main")
                .ok_or("Failed to get main window")?;

    let search_window_clone = main_window.clone();

    main_window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            // 只有在允许的情况下才隐藏窗口
            if ALLOW_BLUR_HIDE.load(Ordering::Relaxed) {
                let _ = search_window_clone.hide();
            }
        }
    });
    Ok(())
}

/// 设置是否允许失焦时隐藏窗口
#[tauri::command]
pub fn set_allow_blur_hide(allow: bool) {
    ALLOW_BLUR_HIDE.store(allow, Ordering::Relaxed);
}

/**
 * 动态调整窗口大小
 */
#[tauri::command]
pub async fn resize_search_window(app: AppHandle, height: u32) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    // 使用 LogicalSize 而不是 PhysicalSize，以正确处理 DPI 缩放
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 750.0, // 固定
            height: height as f64,
        }))
        .map_err(|e| e.to_string())?;

    // 重新居中窗口
    window.center().map_err(|e| e.to_string())?;

    Ok(())
}
/// 切换主窗口的可见性
pub fn toggle_window_visibility(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible()? {
            window.hide()?;
        } else {
            window.show()?;
            window.set_focus()?;
        }
    }
    Ok(())
}
