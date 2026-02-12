// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 数据库模块

use log::info;
use std::fs;
use std::path::PathBuf;

const DATABASE_FILE_NAME: &str = "touchai.db";

fn resolve_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or("Failed to get executable directory")?
        .to_path_buf();

    let data_dir = if cfg!(debug_assertions) {
        exe_dir
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .ok_or("Failed to get project root")?
            .join("data")
    } else {
        exe_dir.join("data")
    };

    Ok(data_dir)
}

/// 确保数据目录存在
pub fn ensure_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let data_dir = resolve_data_directory()?;

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
        info!("Created data directory at: {}", data_dir.display());
    }

    Ok(data_dir)
}

/// 获取数据库文件路径
pub fn get_database_path() -> Result<String, String> {
    resolve_data_directory()
        .map(|dir| dir.join(DATABASE_FILE_NAME).to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}
