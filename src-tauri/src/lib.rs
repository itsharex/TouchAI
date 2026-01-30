// Copyright (c) 2025. 千诚. Licensed under GPL v3

mod settings;
mod shortcut;
mod utils;
mod window;

use utils::path::ensure_data_directory;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 确保数据目录存在
    if let Err(e) = ensure_data_directory() {
        eprintln!("Failed to create data directory: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            window::resize_search_window,
            settings::open_settings_window,
        ])
        .setup(|app| {
            // 设置窗口事件
            if let Err(e) = window::setup_window_events(app) {
                eprintln!("Failed to setup window events: {}", e);
                return Err(e.into());
            }

            // 设置快捷键处理
            let shortcut_handler = shortcut::create_shortcut_handler();
            app.handle()
                .plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(shortcut_handler)
                        .build(),
                )
                .map_err(|e| {
                    eprintln!("Failed to setup global shortcut plugin: {}", e);
                    e
                })?;

            // 注册快捷键
            if let Err(e) = shortcut::register_shortcuts(app.handle()) {
                eprintln!("Failed to register shortcuts: {}", e);
                return Err(e);
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
