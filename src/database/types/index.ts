// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { MessageRole, ProviderType, RequestStatus, SettingKey, StatisticKey } from '../schema';

// ==================== 基础类型 ====================

export type SettingIdentifier = string | SettingKey;
export type StatisticIdentifier = string | StatisticKey;

export type DbMessageRole = MessageRole;
export type DbProviderType = ProviderType;
export type DbRequestStatus = RequestStatus;

// ==================== 通用请求对象 ====================

export interface SessionIdPayload {
    sessionId: number;
}

export interface ProviderIdPayload {
    providerId: number;
}

// ==================== 会话 ====================

export interface SessionEntity {
    id: number;
    session_id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
}

export interface SessionCreateData {
    session_id: string;
    title: string;
    model: string;
    created_at?: string;
    updated_at?: string;
}

// ==================== 消息 ====================

export interface MessageEntity {
    id: number;
    session_id: number;
    role: DbMessageRole;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface MessageCreateData {
    session_id: number;
    role: DbMessageRole;
    content: string;
    created_at?: string;
    updated_at?: string;
}

// ==================== 设置 ====================

export interface SettingEntity {
    id: number;
    key: string;
    value: string | null;
    created_at: string;
    updated_at: string;
}

// ==================== 统计 ====================

// ==================== 元数据（touchai_meta） ====================

// ==================== 服务商 ====================

export interface ProviderEntity {
    id: number;
    name: string;
    type: DbProviderType;
    api_endpoint: string;
    api_key: string | null;
    logo: string;
    enabled: number;
    is_builtin: number;
    created_at: string;
    updated_at: string;
}

export interface ProviderCreateData {
    name: string;
    type: DbProviderType;
    api_endpoint: string;
    api_key?: string | null;
    logo: string;
    enabled?: number;
    is_builtin?: number;
    created_at?: string;
    updated_at?: string;
}

export type ProviderUpdateData = Partial<ProviderCreateData>;

// ==================== 模型 ====================

export interface ModelEntity {
    id: number;
    provider_id: number;
    name: string;
    model_id: string;
    is_default: number;
    last_used_at: string | null;
    attachment: number;
    modalities: string | null;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    context_limit: number | null;
    output_limit: number | null;
    is_custom_metadata: number;
    created_at: string;
    updated_at: string;
}

export interface ModelCreateData {
    provider_id: number;
    name: string;
    model_id: string;
    is_default?: number;
    last_used_at?: string | null;
    attachment?: number;
    modalities?: string | null;
    open_weights?: number;
    reasoning?: number;
    release_date?: string | null;
    temperature?: number;
    tool_call?: number;
    knowledge?: string | null;
    context_limit?: number | null;
    output_limit?: number | null;
    is_custom_metadata?: number;
    created_at?: string;
    updated_at?: string;
}

export type ModelUpdateData = Partial<ModelCreateData>;

export interface ProviderModelLookupPayload extends ProviderIdPayload {
    modelId: string;
}

export interface FindModelsWithProviderPayload {
    providerId?: number;
}

export interface ModelWithProvider {
    id: number;
    created_at: string;
    updated_at: string;
    provider_id: number;
    model_id: string;
    name: string;
    is_default: number;
    last_used_at: string | null;
    attachment: number;
    modalities: string | null;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    context_limit: number | null;
    output_limit: number | null;
    is_custom_metadata: number;
    provider_name: string;
    provider_type: DbProviderType;
    api_endpoint: string;
    api_key: string | null;
    provider_enabled: number;
    provider_logo: string;
}

// ==================== AI 请求 ====================

export interface AiRequestEntity {
    id: number;
    session_id: number | null;
    model_id: number;
    prompt_message_id: number | null;
    response_message_id: number | null;
    status: DbRequestStatus;
    error_message: string | null;
    tokens_used: number | null;
    duration_ms: number | null;
    created_at: string;
    updated_at: string;
}

export interface AiRequestCreateData {
    session_id?: number | null;
    model_id: number;
    prompt_message_id?: number | null;
    response_message_id?: number | null;
    status?: DbRequestStatus;
    error_message?: string | null;
    tokens_used?: number | null;
    duration_ms?: number | null;
    created_at?: string;
    updated_at?: string;
}

export type AiRequestUpdateData = Partial<AiRequestCreateData>;

// ==================== LLM 元数据 ====================

export interface LlmMetadataEntity {
    id: number;
    model_id: string;
    name: string;
    attachment: number;
    modalities: string;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    limit: string | null;
    created_at: string;
    updated_at: string;
}

export interface LlmMetadataCreateData {
    model_id: string;
    name: string;
    attachment?: number;
    modalities: string;
    open_weights?: number;
    reasoning?: number;
    release_date?: string | null;
    temperature?: number;
    tool_call?: number;
    knowledge?: string | null;
    limit?: string | null;
    created_at?: string;
    updated_at?: string;
}
