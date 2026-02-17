// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { native } from '@services/NativeService';
import Database from '@tauri-apps/plugin-sql';

import type { DrizzleDb } from './driver';
import { createDrizzleDb } from './driver';
import { migrate } from './migrator';
import type { DatabaseOptions, SqlValue } from './schema';
import { seed } from './seed';

/**
 * 数据库管理类
 */
class DatabaseManager {
    private tauriDb: Database | null = null;
    private drizzleDb: DrizzleDb | null = null;
    private initialized: boolean = false;

    /**
     * 初始化数据库连接和迁移
     * @param options 数据库配置选项
     */
    async init(options?: DatabaseOptions): Promise<void> {
        // 防止重复初始化
        if (this.initialized) {
            console.warn('Database already initialized');
            return;
        }

        try {
            const dbPath = options?.path || `sqlite://${await native.database.getDatabasePath()}`;
            this.tauriDb = await Database.load(dbPath);

            // 启用 WAL 模式：允许读写并发，避免 "database is locked"
            await this.tauriDb.execute('PRAGMA journal_mode=WAL');
            // 设置繁忙超时：写冲突时等待 5 秒而非立即失败
            await this.tauriDb.execute('PRAGMA busy_timeout=5000');

            const version: { 'sqlite_version()': string }[] =
                await this.tauriDb.select('SELECT sqlite_version()');
            console.log(
                `Database initialized. Sqlite Version: ${version[0]?.['sqlite_version()'] ?? 'Unknown'}, Path: ${dbPath}`
            );

            // 只在 search 窗口运行迁移
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const currentWindow = getCurrentWindow();
            const windowLabel = currentWindow.label;

            if (windowLabel === 'main') {
                console.log('[Database] Running migrations in main window');
                // 运行迁移（创建/更新表结构）
                await migrate(this.tauriDb);

                // 运行种子数据（插入默认配置）
                await seed(this.tauriDb);
            }

            // 创建 Drizzle 实例
            this.drizzleDb = createDrizzleDb(this.tauriDb);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * 获取 Drizzle 数据库实例
     * 必须先调用 init() 初始化数据库
     * @returns Drizzle 实例
     */
    getDb(): DrizzleDb {
        if (!this.initialized || !this.drizzleDb) {
            throw new Error('Database not initialized. Call db.init() first.');
        }

        return this.drizzleDb;
    }

    /**
     * 执行原始 SQL 查询，返回对象数组
     */
    async rawQuery<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
        if (!this.initialized || !this.tauriDb) {
            throw new Error('Database not initialized. Call db.init() first.');
        }
        return (await this.tauriDb.select<T>(sql, params)) as Promise<T[]>;
    }

    async reset(closeAll = false): Promise<void> {
        if (this.tauriDb) {
            await this.tauriDb.close(closeAll ? undefined : this.tauriDb.path);
        }

        this.tauriDb = null;
        this.drizzleDb = null;
        this.initialized = false;
    }
}

// 导出单例实例
export const db = new DatabaseManager();

// 导出类型
export type { DrizzleDb } from './driver';
export type { DatabaseOptions } from './schema';
