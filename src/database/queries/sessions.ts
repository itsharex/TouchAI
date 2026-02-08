// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { count, desc, eq, like } from 'drizzle-orm';

import { db } from '../index';
import type { NewSession, Session, SessionUpdate } from '../schema';
import { sessions } from '../schema';

/**
 * 根据 ID 查找会话
 */
export const findSessionById = async (id: number) =>
    (await db.getDb()).select().from(sessions).where(eq(sessions.id, id)).get();

/**
 * 根据 session_id 查找会话
 */
export const findSessionBySessionId = async (sessionId: string) =>
    (await db.getDb()).select().from(sessions).where(eq(sessions.session_id, sessionId)).get();

/**
 * 查找所有会话
 */
export const findAllSessions = async () =>
    (await db.getDb()).select().from(sessions).orderBy(desc(sessions.created_at)).all();

/**
 * 搜索会话
 */
export const searchSessions = async (keyword?: string, model?: string) => {
    const drizzle = await db.getDb();
    let query = drizzle.select().from(sessions).$dynamic();

    if (keyword) {
        query = query.where(like(sessions.title, `%${keyword}%`));
    }

    if (model) {
        query = query.where(eq(sessions.model, model));
    }

    return query.orderBy(desc(sessions.created_at)).all();
};

/**
 * 分页查询会话
 */
export const paginateSessions = async (page: number, pageSize: number) =>
    (await db.getDb())
        .select()
        .from(sessions)
        .orderBy(desc(sessions.created_at))
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .all();

/**
 * 创建会话
 */
export const createSession = async (data: NewSession): Promise<Session> => {
    const drizzle = await db.getDb();
    await drizzle.insert(sessions).values(data).run();

    const lastInsert = await drizzle
        .select()
        .from(sessions)
        .orderBy(desc(sessions.id))
        .limit(1)
        .get();

    if (!lastInsert) {
        throw new Error('Failed to create session');
    }
    return lastInsert;
};

/**
 * 更新会话
 */
export const updateSession = async (id: number, data: SessionUpdate): Promise<void> => {
    await (await db.getDb()).update(sessions).set(data).where(eq(sessions.id, id)).run();
};

/**
 * 删除会话
 */
export const deleteSession = async (id: number): Promise<boolean> => {
    await (await db.getDb()).delete(sessions).where(eq(sessions.id, id)).run();
    return true;
};

/**
 * 统计会话数
 */
export const countSessions = async (): Promise<number> => {
    const result = await (await db.getDb()).select({ count: count() }).from(sessions).get();

    return result?.count || 0;
};

/**
 * 检查会话是否存在
 */
export const sessionExists = async (id: number): Promise<boolean> => {
    const result = await (await db.getDb())
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.id, id))
        .get();

    return result !== undefined;
};

/**
 * 删除所有会话
 */
export const deleteAllSessions = async (): Promise<void> => {
    await (await db.getDb()).delete(sessions).run();
};
