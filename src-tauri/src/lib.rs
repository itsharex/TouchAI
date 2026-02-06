// Copyright (c) 2025. 千诚. Licensed under GPL v3

mod commands;
mod core;

use tauri::Manager;
use core::window::popup::PopupRegistry;
use core::system::database::ensure_data_directory;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 确保数据目录存在
    if let Err(e) = ensure_data_directory() {
        eprintln!("Failed to create data directory: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_x::init())
        .plugin(tauri_plugin_fs_pro::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(core::system::shortcut::create_shortcut_handler())
                .build(),
        )
        .manage(PopupRegistry::new())
        .invoke_handler(commands::invoke_handler())
        .setup(|app| {
            // 设置窗口样式
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = core::window::search::set_search_window_style(&window) {
                    eprintln!("Failed to set rounded corners: {}", e);
                }
            }

            // 创建系统托盘
            if let Err(e) = core::window::tray::create_tray(app.handle()) {
                eprintln!("Failed to create tray: {}", e);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|e| {
            eprintln!("Error while running tauri application: {}", e);
            e
        })
        .expect("error while running tauri application");
}
