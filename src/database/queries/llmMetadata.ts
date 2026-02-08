// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { count, eq } from 'drizzle-orm';

import { db } from '../index';
import type { LlmMetadata, LlmMetadataUpdate, NewLlmMetadata } from '../schema';
import { llmMetadata } from '../schema';

/**
 * 根据 model_id 查询 LLM 元数据
 */
export async function findLlmMetadataByModelId(modelId: string): Promise<LlmMetadata | null> {
    const result = await (await db.getDb())
        .select()
        .from(llmMetadata)
        .where(eq(llmMetadata.model_id, modelId))
        .get();

    return result || null;
}

/**
 * 批量插入 LLM 元数据
 * 使用 INSERT OR IGNORE 避免重复插入（基于 model_id 的 UNIQUE 约束）
 */
export async function insertLlmMetadata(metadata: NewLlmMetadata[]): Promise<void> {
    if (metadata.length === 0) return;

    await (await db.getDb())
        .insert(llmMetadata)
        .values(metadata)
        .onConflictDoNothing({ target: llmMetadata.model_id })
        .run();
}

/**
 * 更新或创建 LLM 元数据
 */
export async function upsertLlmMetadata(modelId: string, data: LlmMetadataUpdate): Promise<void> {
    const existing = await findLlmMetadataByModelId(modelId);

    if (existing) {
        await (await db.getDb())
            .update(llmMetadata)
            .set(data)
            .where(eq(llmMetadata.model_id, modelId))
            .run();
    } else {
        await (
            await db.getDb()
        )
            .insert(llmMetadata)
            .values({
                model_id: modelId,
                name: modelId,
                attachment: 0,
                modalities: JSON.stringify({ input: [], output: [] }),
                open_weights: 0,
                reasoning: 0,
                temperature: 1,
                tool_call: 0,
                ...data,
            })
            .run();
    }
}

/**
 * 清空 LLM 元数据表
 */
export async function clearLlmMetadata(): Promise<void> {
    await (await db.getDb()).delete(llmMetadata).run();
}

/**
 * 检查 LLM 元数据表是否为空
 */
export async function isLlmMetadataEmpty(): Promise<boolean> {
    const result = await (await db.getDb()).select({ count: count() }).from(llmMetadata).get();

    return (result?.count ?? 0) === 0;
}
