// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type { TauriDatabase } from './schema';

interface JournalEntry {
    idx: number;
    when: number;
    tag: string;
    breakpoints: boolean;
}

interface Journal {
    version: string;
    dialect: string;
    entries: JournalEntry[];
}

interface Snapshot {
    tables: Record<string, { name: string }>;
}

/**
 * 执行数据库迁移
 *
 * 使用 import.meta.glob 在构建时内联 drizzle/*.sql 和 _journal.json，
 * 运行时对比已应用版本与 journal 最新版本，仅执行待处理的迁移。
 */
export async function migrate(tauriDb: TauriDatabase): Promise<void> {
    // 1. 加载迁移SQL文件和journal
    const sqlFiles = import.meta.glob<string>('/drizzle/*.sql', {
        eager: true,
        query: '?raw',
        import: 'default',
    });

    // 2. 加载journal
    const journalFiles = import.meta.glob<Journal>('/drizzle/meta/_journal.json', {
        eager: true,
        import: 'default',
    });
    const journal = Object.values(journalFiles)[0];
    if (!journal || journal.entries.length === 0) {
        console.log('[migrator] No migrations found');
        return;
    }

    // 3. 确保迁移跟踪表存在
    if (!(await tableExists(tauriDb, 'migrations'))) {
        console.log('[migrator] Creating migrations table');
        await tauriDb.execute(`
            CREATE TABLE migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        `);
    }

    // 4. 获取待执行的迁移
    const pending = await getPendingMigrations(tauriDb, journal);
    if (pending.length === 0) {
        console.log('[migrator] Database is up to date');
        return;
    }

    // 5. 执行迁移
    console.log(`[migrator] Running ${pending.length} migrations`);
    for (const entry of pending) {
        await executeMigration(tauriDb, sqlFiles, entry);
    }

    // 6. 确保时间触发器存在
    await ensureTriggers(tauriDb);
}

async function tableExists(tauriDb: TauriDatabase, name: string): Promise<boolean> {
    const result = await tauriDb.select<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [name]
    );
    return result.length > 0;
}

/**
 * 获取待执行的迁移
 */
async function getPendingMigrations(
    tauriDb: TauriDatabase,
    journal: Journal
): Promise<JournalEntry[]> {
    const applied = await tauriDb.select<{ hash: string }>('SELECT hash FROM migrations');
    const appliedHashes = new Set(applied.map((r) => r.hash));

    // 已应用的最大版本 >= journal 最新版本则无需迁移

    // 已应用最大版本
    const latestApplied = Math.max(
        -1,
        ...journal.entries.filter((e) => appliedHashes.has(e.tag)).map((e) => e.idx)
    );

    // journal 最新版本
    const latestJournal = Math.max(-1, ...journal.entries.map((e) => e.idx));

    if (latestApplied >= latestJournal) {
        return [];
    }

    return journal.entries.filter((e) => !appliedHashes.has(e.tag)).sort((a, b) => a.idx - b.idx);
}

/**
 * 具体执行一份SQL迁移文件
 */
async function executeMigration(
    tauriDb: TauriDatabase,
    sqlFiles: Record<string, string>,
    entry: JournalEntry
): Promise<void> {
    const { tag } = entry;
    const sql = sqlFiles[`/drizzle/${tag}.sql`];
    if (!sql) {
        throw new Error(`Migration file not found: ${tag}.sql`);
    }

    console.log(`[migrator] Running: ${tag}`);
    const start = Date.now();

    // 按 statement-breakpoint 拆分，逐句执行
    const statements = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);

    await tauriDb.execute('BEGIN');
    try {
        for (const stmt of statements) {
            await tauriDb.execute(stmt);
        }
        await tauriDb.execute('INSERT INTO migrations (hash, created_at) VALUES (?, ?)', [
            tag,
            Date.now(),
        ]);
        await tauriDb.execute('COMMIT');
        console.log(`[migrator] Done: ${tag} (${Date.now() - start}ms)`);
    } catch (error) {
        await tauriDb.execute('ROLLBACK');
        throw error;
    }
}

async function ensureTriggers(tauriDb: TauriDatabase): Promise<void> {
    // 从最新 snapshot 中提取表名
    const snapshots = import.meta.glob<Snapshot>('/drizzle/meta/*_snapshot.json', {
        eager: true,
        import: 'default',
    });
    const snapshotFiles = Object.keys(snapshots).sort();
    const latestKey = snapshotFiles[snapshotFiles.length - 1];
    if (!latestKey) return;

    const latestSnapshot = snapshots[latestKey];
    if (!latestSnapshot) return;

    const tables = Object.values(latestSnapshot.tables).map((t: { name: string }) => t.name);

    for (const table of tables) {
        await tauriDb.execute(`
            CREATE TRIGGER IF NOT EXISTS trg_${table}_updated_at
            AFTER UPDATE ON ${table}
            FOR EACH ROW
            BEGIN
                UPDATE ${table} SET updated_at = datetime('now') WHERE id = NEW.id;
            END
        `);
    }
}
