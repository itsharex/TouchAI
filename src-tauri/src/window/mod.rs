// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 窗口管理模块

use tauri::{AppHandle, Manager};

// ============================================================================
// Windows 平台特定导入和常量定义
// ============================================================================

#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWA_BORDER_COLOR};

/// Windows DWM 窗口圆角偏好：圆角
#[cfg(target_os = "windows")]
const DWMWCP_ROUND: u32 = 2;

/// Windows DWM 颜色值：无颜色（用于移除边框）
#[cfg(target_os = "windows")]
const DWMWA_COLOR_NONE: u32 = 0xFFFFFFFE;

// ============================================================================
// Windows 窗口样式设置
// ============================================================================

/// 设置窗口样式
/// 此函数仅在 Windows 平台编译，使用 Windows DWM API
#[cfg(target_os = "windows")]
pub fn set_search_window_style(window: &tauri::WebviewWindow) -> Result<(), String> {
    use raw_window_handle::HasWindowHandle;

    // 获取原始窗口句柄
    let window_handle = window
        .window_handle()
        .map_err(|e| format!("Failed to get window handle: {}", e))?;

    // 提取 Win32 HWND 句柄
    let hwnd = match window_handle.as_ref() {
        raw_window_handle::RawWindowHandle::Win32(handle) => {
            windows::Win32::Foundation::HWND(handle.hwnd.get() as _)
        }
        _ => return Err("Not a Win32 window".to_string()),
    };

    unsafe {
        // 1. 设置圆角偏好
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &DWMWCP_ROUND as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("Failed to set rounded corners: {}", e))?;

        // 2. 移除窗口边框
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &DWMWA_COLOR_NONE as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("Failed to remove border: {}", e))?;
    }

    Ok(())
}

// ============================================================================
// Tauri 命令：窗口操作
// ============================================================================

/// 动态调整搜索窗口大小
///
/// 使用 LogicalSize 而非 PhysicalSize，以正确处理 DPI 缩放
#[tauri::command]
pub async fn resize_search_window(app: AppHandle, height: u32, center: bool) -> Result<(), String> {
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

    if center {
        // 重新居中窗口
        window.center().map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 隐藏搜索窗口
#[tauri::command]
pub fn hide_search_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    window.hide().map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// 公共函数：窗口可见性控制
// ============================================================================

/// 切换主窗口的可见性
pub fn toggle_window_visibility(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible()? {
            // 窗口可见 -> 隐藏
            window.hide()?;
        } else {
            // 窗口隐藏 -> 显示并设置焦点
            window.show()?;
            window.set_focus()?;
        }
    }
    Ok(())
}
