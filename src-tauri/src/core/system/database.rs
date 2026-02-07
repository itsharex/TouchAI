// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 数据库模块

use log::info;
use std::fs;
use std::path::PathBuf;

/// 确保数据目录存在
pub fn ensure_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
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

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
        info!("Created data directory at: {}", data_dir.display());
    }

    Ok(data_dir)
}
