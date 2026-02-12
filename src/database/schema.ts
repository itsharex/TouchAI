// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { QueryResult } from '@tauri-apps/plugin-sql';
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ==================== Tauri 相关类型 ====================

/**
 * SQL 参数类型
 */
export type SqlValue = string | number | boolean | null | Uint8Array;

/**
 * 数据库配置选项
 */
export interface DatabaseOptions {
    /**
     * 数据库路径，支持以下格式：
     * - sqlite:database.db (相对于 APPDATA 目录)
     * - sqlite://path/to/database.db (绝对路径)
     */
    path: string;
}

/**
 * Tauri SQL 数据库接口
 */
export interface TauriDatabase {
    execute(sql: string, bindValues?: SqlValue[]): Promise<QueryResult>;
    select<T = unknown>(sql: string, bindValues?: SqlValue[]): Promise<T[]>;
    close(): Promise<boolean>;
}

// ==================== 表定义（Drizzle） ====================

/**
 * 设置键枚举
 */
export enum SettingKey {
    THEME = 'theme',
    LANGUAGE = 'language',
    AUTO_START = 'auto_start',
}

/**
 * 统计键枚举
 */
export enum StatisticKey {
    MODEL_METADATA_LAST_UPDATED_AT = 'model_metadata_last_updated_at',
}

/**
 * 元数据键枚举
 */
export enum MetaKey {
    APP_ID = 'app_id',
    IMPORT_SUCCESS = 'import_success',
}

/**
 * 会话表
 */
export const sessions = sqliteTable('sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    session_id: text('session_id').notNull().unique(),
    title: text('title').notNull(),
    model: text('model').notNull(),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * 消息表
 */
export const messages = sqliteTable('messages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    session_id: integer('session_id')
        .notNull()
        .references(() => sessions.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * 设置表
 */
export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: text('value'),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * 统计表
 */
export const statistics = sqliteTable('statistics', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: text('value'),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * 应用元数据表
 * 用于存储应用级别的状态信息，如数据库标识、更新状态等
 */
export const touchaiMeta = sqliteTable('touchai_meta', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    value: text('value'),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * AI 服务商表
 */
export const providers = sqliteTable('providers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['openai', 'anthropic'] }).notNull(),
    api_endpoint: text('api_endpoint').notNull(),
    api_key: text('api_key'),
    logo: text('logo').notNull(),
    enabled: integer('enabled').notNull().default(1),
    is_builtin: integer('is_builtin').notNull().default(0),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * AI 模型表
 */
export const models = sqliteTable('models', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    provider_id: integer('provider_id')
        .notNull()
        .references(() => providers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    model_id: text('model_id').notNull(),
    is_default: integer('is_default').notNull().default(0),
    last_used_at: text('last_used_at'),
    // 元数据字段（直接存储，不再 JOIN llm_metadata）
    attachment: integer('attachment').notNull().default(0),
    modalities: text('modalities'), // JSON string: {input: [], output: []}
    open_weights: integer('open_weights').notNull().default(0),
    reasoning: integer('reasoning').notNull().default(0),
    release_date: text('release_date'),
    temperature: integer('temperature').notNull().default(1),
    tool_call: integer('tool_call').notNull().default(0),
    knowledge: text('knowledge'),
    context_limit: integer('context_limit'),
    output_limit: integer('output_limit'),
    is_custom_metadata: integer('is_custom_metadata').notNull().default(0), // 用户是否自定义了元数据
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * AI 请求表
 */
export const aiRequests = sqliteTable('ai_requests', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    session_id: integer('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    model_id: integer('model_id')
        .notNull()
        .references(() => models.id, { onDelete: 'cascade' }),
    prompt_message_id: integer('prompt_message_id').references(() => messages.id, {
        onDelete: 'set null',
    }),
    response_message_id: integer('response_message_id').references(() => messages.id, {
        onDelete: 'set null',
    }),
    status: text('status', {
        enum: ['pending', 'streaming', 'completed', 'failed', 'cancelled'],
    })
        .notNull()
        .default('pending'),
    error_message: text('error_message'),
    tokens_used: integer('tokens_used'),
    duration_ms: integer('duration_ms'),
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

/**
 * LLM 元数据表
 */
export const llmMetadata = sqliteTable('llm_metadata', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    model_id: text('model_id').notNull().unique(),
    name: text('name').notNull(),
    attachment: integer('attachment').notNull().default(0),
    modalities: text('modalities').notNull(), // JSON string
    open_weights: integer('open_weights').notNull().default(0),
    reasoning: integer('reasoning').notNull().default(0),
    release_date: text('release_date'),
    temperature: integer('temperature').notNull().default(1),
    tool_call: integer('tool_call').notNull().default(0),
    knowledge: text('knowledge'), // JSON string
    limit: text('limit'), // JSON string
    created_at: text('created_at')
        .notNull()
        .default(sql`(datetime('now'))`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`(datetime('now'))`),
});

// ==================== 类型别名 ====================

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionUpdate = Partial<NewSession>;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageUpdate = Partial<NewMessage>;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type SettingUpdate = Partial<NewSetting>;

export type Statistic = typeof statistics.$inferSelect;
export type NewStatistic = typeof statistics.$inferInsert;
export type StatisticUpdate = Partial<NewStatistic>;

export type TouchAiMeta = typeof touchaiMeta.$inferSelect;
export type NewTouchAiMeta = typeof touchaiMeta.$inferInsert;
export type TouchAiMetaUpdate = Partial<NewTouchAiMeta>;

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type ProviderUpdate = Partial<NewProvider>;

export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type ModelUpdate = Partial<NewModel>;

export type AiRequest = typeof aiRequests.$inferSelect;
export type NewAiRequest = typeof aiRequests.$inferInsert;
export type AiRequestUpdate = Partial<NewAiRequest>;

export type LlmMetadata = typeof llmMetadata.$inferSelect;
export type NewLlmMetadata = typeof llmMetadata.$inferInsert;
export type LlmMetadataUpdate = Partial<NewLlmMetadata>;

export type MessageRole = Message['role'];
export type ProviderType = Provider['type'];
export type RequestStatus = AiRequest['status'];
