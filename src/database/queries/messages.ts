// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { and, asc, count, desc, eq, like } from 'drizzle-orm';

import { db } from '../index';
import type { Message, MessageRole, MessageUpdate, NewMessage } from '../schema';
import { messages, sessions } from '../schema';

/**
 * 根据 ID 查找消息
 */
export const findMessageById = async (id: number) =>
    (await db.getDb()).select().from(messages).where(eq(messages.id, id)).get();

/**
 * 根据会话 ID 查找所有消息
 */
export const findMessagesBySessionId = async (sessionId: number) =>
    (await db.getDb())
        .select()
        .from(messages)
        .where(eq(messages.session_id, sessionId))
        .orderBy(asc(messages.created_at))
        .all();

/**
 * 根据会话 ID 和角色查找消息
 */
export const findMessagesBySessionIdAndRole = async (sessionId: number, role: MessageRole) =>
    (await db.getDb())
        .select()
        .from(messages)
        .where(and(eq(messages.session_id, sessionId), eq(messages.role, role)))
        .orderBy(asc(messages.created_at))
        .all();

/**
 * 获取会话的最新消息
 */
export const getLatestMessages = async (sessionId: number, limit: number = 10) =>
    (await db.getDb())
        .select()
        .from(messages)
        .where(eq(messages.session_id, sessionId))
        .orderBy(desc(messages.created_at))
        .limit(limit)
        .all();

/**
 * 搜索消息
 */
export const searchMessages = async (keyword: string, sessionId?: number) => {
    const pattern = `%${keyword}%`;
    const drizzle = await db.getDb();
    let query = drizzle.select().from(messages).where(like(messages.content, pattern)).$dynamic();

    if (sessionId !== undefined) {
        query = query.where(eq(messages.session_id, sessionId));
    }

    return query.orderBy(desc(messages.created_at)).all();
};

/**
 * 创建消息
 */
export const createMessage = async (data: NewMessage): Promise<Message> => {
    const drizzle = await db.getDb();
    await drizzle.insert(messages).values(data).run();

    const lastInsert = await drizzle
        .select()
        .from(messages)
        .orderBy(desc(messages.id))
        .limit(1)
        .get();

    if (!lastInsert) {
        throw new Error('Failed to create message');
    }
    return lastInsert;
};

/**
 * 批量创建消息
 */
export const createMessages = async (data: NewMessage[]): Promise<Message[]> => {
    const drizzle = await db.getDb();
    await drizzle.insert(messages).values(data).run();

    const lastInserts = await drizzle
        .select()
        .from(messages)
        .orderBy(desc(messages.id))
        .limit(data.length)
        .all();

    return lastInserts;
};

/**
 * 更新消息
 */
export const updateMessage = async (id: number, data: MessageUpdate): Promise<void> => {
    await (await db.getDb()).update(messages).set(data).where(eq(messages.id, id)).run();
};

/**
 * 删除消息
 */
export const deleteMessage = async (id: number): Promise<boolean> => {
    await (await db.getDb()).delete(messages).where(eq(messages.id, id)).run();
    return true;
};

/**
 * 删除会话的所有消息
 */
export const deleteMessagesBySessionId = async (sessionId: number): Promise<void> => {
    await (await db.getDb()).delete(messages).where(eq(messages.session_id, sessionId)).run();
};

/**
 * 统计会话的消息数
 */
export const countMessagesBySessionId = async (sessionId: number): Promise<number> => {
    const result = await (await db.getDb())
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.session_id, sessionId))
        .get();

    return result?.count || 0;
};

/**
 * 统计所有消息数
 */
export const countMessages = async (): Promise<number> => {
    const result = await (await db.getDb()).select({ count: count() }).from(messages).get();

    return result?.count || 0;
};

/**
 * 删除所有消息
 */
export const deleteAllMessages = async (): Promise<void> => {
    await (await db.getDb()).delete(messages).run();
};

/**
 * 获取消息及会话信息（JOIN 查询）
 */
export const findMessageWithSession = async (messageId: number) =>
    (await db.getDb())
        .select({
            id: messages.id,
            session_id: messages.session_id,
            role: messages.role,
            content: messages.content,
            created_at: messages.created_at,
            updated_at: messages.updated_at,
            session_title: sessions.title,
            session_model: sessions.model,
        })
        .from(messages)
        .innerJoin(sessions, eq(sessions.id, messages.session_id))
        .where(eq(messages.id, messageId))
        .get();
