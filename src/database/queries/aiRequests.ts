// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { count, desc, eq } from 'drizzle-orm';

import { db } from '../index';
import type { AiRequest, AiRequestUpdate, NewAiRequest } from '../schema';
import { aiRequests } from '../schema';

/**
 * 根据 ID 查找 AI 请求
 */
export const findAiRequestById = async (id: number) =>
    (await db.getDb()).select().from(aiRequests).where(eq(aiRequests.id, id)).get();

/**
 * 根据会话 ID 查找 AI 请求
 */
export const findAiRequestsBySessionId = async (sessionId: number) =>
    (await db.getDb())
        .select()
        .from(aiRequests)
        .where(eq(aiRequests.session_id, sessionId))
        .orderBy(desc(aiRequests.created_at))
        .all();

/**
 * 根据状态查找 AI 请求
 */
export const findAiRequestsByStatus = async (
    status: 'pending' | 'streaming' | 'completed' | 'failed'
) =>
    (await db.getDb())
        .select()
        .from(aiRequests)
        .where(eq(aiRequests.status, status))
        .orderBy(desc(aiRequests.created_at))
        .all();

/**
 * 查找所有 AI 请求
 */
export const findAllAiRequests = async (limit?: number) => {
    const drizzle = await db.getDb();
    let query = drizzle.select().from(aiRequests).orderBy(desc(aiRequests.created_at)).$dynamic();

    if (limit) {
        query = query.limit(limit);
    }

    return query.all();
};

/**
 * 创建 AI 请求
 */
export const createAiRequest = async (data: NewAiRequest): Promise<AiRequest> => {
    const drizzle = await db.getDb();
    await drizzle.insert(aiRequests).values(data).run();

    const lastInsert = await drizzle
        .select()
        .from(aiRequests)
        .orderBy(desc(aiRequests.id))
        .limit(1)
        .get();

    if (!lastInsert) {
        throw new Error('Failed to create AI request');
    }
    return lastInsert;
};

/**
 * 更新 AI 请求
 */
export const updateAiRequest = async (id: number, data: AiRequestUpdate): Promise<void> => {
    await (await db.getDb()).update(aiRequests).set(data).where(eq(aiRequests.id, id)).run();
};

/**
 * 删除 AI 请求
 */
export const deleteAiRequest = async (id: number): Promise<boolean> => {
    await (await db.getDb()).delete(aiRequests).where(eq(aiRequests.id, id)).run();
    return true;
};

/**
 * 统计 AI 请求数量
 */
export const countAiRequests = async (): Promise<number> => {
    const result = await (await db.getDb()).select({ count: count() }).from(aiRequests).get();
    return result?.count || 0;
};

/**
 * 删除所有 AI 请求
 */
export const deleteAllAiRequests = async (): Promise<void> => {
    await (await db.getDb()).delete(aiRequests).run();
};
