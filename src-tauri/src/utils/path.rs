// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 路径管理模块
//!
//! 提供应用数据目录的获取和管理功能

use std::fs;
use std::path::PathBuf;

/// 确保数据目录存在
///
pub fn ensure_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or("Failed to get executable directory")?
        .to_path_buf();

    // 在开发环境中，可执行文件在 target/debug 或 target/release
    // 在生产环境中，可执行文件在应用根目录
    let data_dir = if exe_dir.ends_with("debug") || exe_dir.ends_with("release") {
        // 开发环境：回到项目根目录
        exe_dir
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .ok_or("Failed to get project root")?
            .join("data")
    } else {
        // 生产环境：在可执行文件同级目录
        exe_dir.join("data")
    };

    // 创建目录（如果不存在）
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
        println!("Created data directory at: {}", data_dir.display());
    }

    Ok(data_dir)
}
