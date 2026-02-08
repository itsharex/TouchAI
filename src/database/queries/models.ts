// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '../index';
import type { Model, ModelUpdate, NewModel } from '../schema';
import { models, providers } from '../schema';

/**
 * 根据 ID 查找模型
 */
export const findModelById = async (id: number) =>
    (await db.getDb()).select().from(models).where(eq(models.id, id)).get();

/**
 * 查找全局默认模型
 */
export const findDefaultModel = async () =>
    (await db.getDb()).select().from(models).where(eq(models.is_default, 1)).get();

/**
 * 查找默认模型且服务商已启用（包含服务商信息和元数据）
 */
export const findDefaultModelWithProvider =
    async (): Promise<ModelWithProviderAndMetadata | null> => {
        const result = await (
            await db.getDb()
        )
            .select({
                id: models.id,
                created_at: models.created_at,
                updated_at: models.updated_at,
                provider_id: models.provider_id,
                model_id: models.model_id,
                name: models.name,
                is_default: models.is_default,
                last_used_at: models.last_used_at,
                attachment: models.attachment,
                modalities: models.modalities,
                open_weights: models.open_weights,
                reasoning: models.reasoning,
                release_date: models.release_date,
                temperature: models.temperature,
                tool_call: models.tool_call,
                knowledge: models.knowledge,
                context_limit: models.context_limit,
                output_limit: models.output_limit,
                provider_name: sql<string>`${providers.name}`.as('provider_name'),
                provider_type: sql<string>`${providers.type}`.as('provider_type'),
                api_endpoint: sql<string>`${providers.api_endpoint}`.as('api_endpoint'),
                api_key: sql<string | null>`${providers.api_key}`.as('api_key'),
                provider_enabled: sql<number>`${providers.enabled}`.as('provider_enabled'),
                provider_logo: sql<string>`${providers.logo}`.as('provider_logo'),
            })
            .from(models)
            .innerJoin(providers, eq(providers.id, models.provider_id))
            .where(and(eq(models.is_default, 1), eq(providers.enabled, 1)))
            .orderBy(models.id)
            .limit(1)
            .get();

        // Drizzle sqlite-proxy 在无结果时返回所有字段为 undefined 的对象，需要检查 id
        if (!result || result.id === undefined) {
            return null;
        }
        return result;
    };

export interface ModelWithProviderAndMetadata {
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
    provider_name: string;
    provider_type: string;
    api_endpoint: string;
    api_key: string | null;
    provider_enabled: number;
    provider_logo: string;
}

/**
 * 查找模型并关联服务商信息（直接从 models 表读取元数据）
 */
export const findModelsWithProvider = async (
    providerId?: number
): Promise<ModelWithProviderAndMetadata[]> => {
    const drizzle = await db.getDb();
    const query = drizzle
        .select({
            id: models.id,
            created_at: models.created_at,
            updated_at: models.updated_at,
            provider_id: models.provider_id,
            model_id: models.model_id,
            name: models.name,
            is_default: models.is_default,
            last_used_at: models.last_used_at,
            attachment: models.attachment,
            modalities: models.modalities,
            open_weights: models.open_weights,
            reasoning: models.reasoning,
            release_date: models.release_date,
            temperature: models.temperature,
            tool_call: models.tool_call,
            knowledge: models.knowledge,
            context_limit: models.context_limit,
            output_limit: models.output_limit,
            provider_name: sql<string>`${providers.name}`.as('provider_name'),
            provider_type: sql<string>`${providers.type}`.as('provider_type'),
            api_endpoint: sql<string>`${providers.api_endpoint}`.as('api_endpoint'),
            api_key: sql<string | null>`${providers.api_key}`.as('api_key'),
            provider_enabled: sql<number>`${providers.enabled}`.as('provider_enabled'),
            provider_logo: sql<string>`${providers.logo}`.as('provider_logo'),
        })
        .from(models)
        .innerJoin(providers, eq(providers.id, models.provider_id));

    if (providerId !== undefined) {
        return query
            .where(eq(models.provider_id, providerId))
            .orderBy(desc(models.is_default), models.id)
            .all();
    }

    return query.orderBy(desc(models.is_default), models.id).all();
};

/**
 * 创建模型
 */
export const createModel = async (data: NewModel): Promise<Model> => {
    const drizzle = await db.getDb();
    await drizzle.insert(models).values(data).run();

    const lastInsert = await drizzle.select().from(models).orderBy(desc(models.id)).limit(1).get();

    if (!lastInsert) {
        throw new Error('Failed to create model');
    }
    return lastInsert;
};

/**
 * 批量创建模型
 */
export const createModels = async (data: NewModel[]): Promise<void> => {
    if (data.length === 0) return;
    await (await db.getDb()).insert(models).values(data).run();
};

/**
 * 更新模型
 */
export const updateModel = async (id: number, data: ModelUpdate): Promise<void> => {
    await (await db.getDb()).update(models).set(data).where(eq(models.id, id)).run();
};

/**
 * 更新模型最后使用时间
 */
export const updateModelLastUsed = async (id: number) =>
    updateModel(id, { last_used_at: new Date().toISOString() });

/**
 * 设置全局默认模型
 * 使用事务确保只有一个默认模型
 * 验证：模型所属的服务商必须已启用
 */
export const setDefaultModel = async (modelId: number): Promise<void> => {
    const drizzle = await db.getDb();

    // 检查模型是否存在以及服务商是否启用
    const modelWithProvider = await drizzle
        .select({
            id: models.id,
            enabled: providers.enabled,
            provider_name: providers.name,
        })
        .from(models)
        .innerJoin(providers, eq(providers.id, models.provider_id))
        .where(eq(models.id, modelId))
        .get();

    if (!modelWithProvider) {
        throw new Error('模型不存在');
    }

    if (modelWithProvider.enabled === 0) {
        throw new Error(`无法设置默认模型：服务商 "${modelWithProvider.provider_name}" 未启用`);
    }

    // 取消当前默认模型（只更新 is_default=1 的记录）
    await drizzle.update(models).set({ is_default: 0 }).where(eq(models.is_default, 1)).run();

    // 设置新的默认模型
    await drizzle.update(models).set({ is_default: 1 }).where(eq(models.id, modelId)).run();
};

/**
 * 检查服务商是否有默认模型
 */
export const providerHasDefaultModel = async (providerId: number): Promise<boolean> => {
    const model = await (
        await db.getDb()
    )
        .select({ id: models.id })
        .from(models)
        .where(and(eq(models.provider_id, providerId), eq(models.is_default, 1)))
        .get();

    return !!model;
};

/**
 * 删除模型
 */
export const deleteModel = async (id: number): Promise<boolean> => {
    await (await db.getDb()).delete(models).where(eq(models.id, id)).run();
    return true;
};

/**
 * 统计模型数量
 */
export const countModels = async (): Promise<number> => {
    const result = await (await db.getDb()).select({ count: count() }).from(models).get();
    return result?.count || 0;
};

/**
 * 根据 model_id 查找模型（包含服务商信息）
 */
export const findModelByModelId = async (modelId: string) =>
    (await db.getDb())
        .select({
            id: models.id,
            provider_id: models.provider_id,
            name: models.name,
            model_id: models.model_id,
            is_default: models.is_default,
            last_used_at: models.last_used_at,
            created_at: models.created_at,
            updated_at: models.updated_at,
            attachment: models.attachment,
            modalities: models.modalities,
            open_weights: models.open_weights,
            reasoning: models.reasoning,
            release_date: models.release_date,
            temperature: models.temperature,
            tool_call: models.tool_call,
            knowledge: models.knowledge,
            context_limit: models.context_limit,
            output_limit: models.output_limit,
            provider_name: sql<string>`${providers.name}`.as('provider_name'),
            provider_type: sql<string>`${providers.type}`.as('provider_type'),
            api_endpoint: sql<string>`${providers.api_endpoint}`.as('api_endpoint'),
            api_key: sql<string | null>`${providers.api_key}`.as('api_key'),
            provider_enabled: sql<number>`${providers.enabled}`.as('provider_enabled'),
            provider_logo: sql<string>`${providers.logo}`.as('provider_logo'),
        })
        .from(models)
        .innerJoin(providers, eq(providers.id, models.provider_id))
        .where(eq(models.model_id, modelId))
        .get();

/**
 * 根据 provider_id 和 model_id 查找模型（包含服务商信息）
 * 用于精确定位特定提供商的特定模型
 */
export const findModelByProviderAndModelId = async (providerId: number, modelId: string) =>
    (await db.getDb())
        .select({
            id: models.id,
            provider_id: models.provider_id,
            name: models.name,
            model_id: models.model_id,
            is_default: models.is_default,
            last_used_at: models.last_used_at,
            created_at: models.created_at,
            updated_at: models.updated_at,
            attachment: models.attachment,
            modalities: models.modalities,
            open_weights: models.open_weights,
            reasoning: models.reasoning,
            release_date: models.release_date,
            temperature: models.temperature,
            tool_call: models.tool_call,
            knowledge: models.knowledge,
            context_limit: models.context_limit,
            output_limit: models.output_limit,
            provider_name: sql<string>`${providers.name}`.as('provider_name'),
            provider_type: sql<string>`${providers.type}`.as('provider_type'),
            api_endpoint: sql<string>`${providers.api_endpoint}`.as('api_endpoint'),
            api_key: sql<string | null>`${providers.api_key}`.as('api_key'),
            provider_enabled: sql<number>`${providers.enabled}`.as('provider_enabled'),
            provider_logo: sql<string>`${providers.logo}`.as('provider_logo'),
        })
        .from(models)
        .innerJoin(providers, eq(providers.id, models.provider_id))
        .where(and(eq(models.provider_id, providerId), eq(models.model_id, modelId)))
        .get();

/**
 * 批量同步所有模型的元数据
 * 从 llm_metadata 表匹配并更新到 models 表
 */
export const syncAllModelsMetadata = async (): Promise<number> => {
    // 使用单条 SQL 批量更新所有 models 的元数据
    // 匹配逻辑：llm_metadata.model_id 包含 models.model_id（模糊匹配）
    // 优先选择能力字段最多的记录
    const sql = `
        UPDATE models
        SET
            attachment = COALESCE((
                SELECT m2.attachment
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), attachment),
            modalities = COALESCE((
                SELECT m2.modalities
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), modalities),
            open_weights = COALESCE((
                SELECT m2.open_weights
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), open_weights),
            reasoning = COALESCE((
                SELECT m2.reasoning
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), reasoning),
            release_date = COALESCE((
                SELECT m2.release_date
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), release_date),
            temperature = COALESCE((
                SELECT m2.temperature
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), temperature),
            tool_call = COALESCE((
                SELECT m2.tool_call
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), tool_call),
            knowledge = COALESCE((
                SELECT m2.knowledge
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), knowledge),
            context_limit = COALESCE((
                SELECT json_extract(m2."limit", '$.context')
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), context_limit),
            output_limit = COALESCE((
                SELECT json_extract(m2."limit", '$.output')
                FROM llm_metadata AS m2
                WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
                ORDER BY
                    (m2.attachment + m2.open_weights + m2.reasoning + m2.temperature + m2.tool_call +
                        CASE WHEN m2.modalities IS NOT NULL AND m2.modalities <> '' THEN 1 ELSE 0 END
                    ) DESC,
                    length(m2.model_id) DESC
                LIMIT 1
            ), output_limit),
            updated_at = datetime('now')
        WHERE EXISTS (
            SELECT 1 FROM llm_metadata AS m2
            WHERE lower(m2.model_id) LIKE '%' || lower(models.model_id) || '%'
        )
    `;

    const result = await db.rawQuery<{ changes: number }>(`${sql}; SELECT changes() as changes;`);
    return result[0]?.changes ?? 0;
};
