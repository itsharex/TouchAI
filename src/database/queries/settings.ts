// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { eq, inArray } from 'drizzle-orm';

import { db } from '../index';
import type { NewSetting, Setting, SettingUpdate } from '../schema';
import { SettingKey, settings } from '../schema';

/**
 * 根据 ID 查找设置
 */
export const findSettingById = async (id: number) =>
    (await db.getDb()).select().from(settings).where(eq(settings.id, id)).get();

/**
 * 根据 key 查找设置
 */
export const findSettingByKey = async (key: string | SettingKey) =>
    (await db.getDb()).select().from(settings).where(eq(settings.key, key)).get();

/**
 * 获取设置值
 */
export const getSettingValue = async (key: string | SettingKey): Promise<string | null> => {
    const setting = await findSettingByKey(key);
    return setting?.value || null;
};

/**
 * 查找所有设置
 */
export const findAllSettings = async () =>
    (await db.getDb()).select().from(settings).orderBy(settings.key).all();

/**
 * 创建设置
 */
export const createSetting = async (data: NewSetting): Promise<Setting> => {
    const drizzle = await db.getDb();
    await drizzle.insert(settings).values(data).run();

    const lastInsert = await drizzle
        .select()
        .from(settings)
        .where(eq(settings.key, data.key))
        .get();

    if (!lastInsert) {
        throw new Error('Failed to create setting');
    }
    return lastInsert;
};

/**
 * 更新设置
 */
export const updateSetting = async (id: number, data: SettingUpdate): Promise<void> => {
    await (await db.getDb()).update(settings).set(data).where(eq(settings.id, id)).run();
};

/**
 * 根据 key 更新设置值
 */
export const updateSettingValue = async (
    key: string | SettingKey,
    value: string
): Promise<void> => {
    await (await db.getDb()).update(settings).set({ value }).where(eq(settings.key, key)).run();
};

/**
 * 设置值（不存在则创建）
 */
export const setSetting = async (key: string | SettingKey, value: string): Promise<Setting> => {
    const existing = await findSettingByKey(key);

    if (existing) {
        await updateSettingValue(key, value);
        return (await findSettingByKey(key)) as Setting;
    } else {
        return createSetting({ key, value });
    }
};

/**
 * 删除设置
 */
export const deleteSetting = async (id: number): Promise<boolean> => {
    await (await db.getDb()).delete(settings).where(eq(settings.id, id)).run();
    return true;
};

/**
 * 根据 key 删除设置
 */
export const deleteSettingByKey = async (key: string | SettingKey): Promise<boolean> => {
    await (await db.getDb()).delete(settings).where(eq(settings.key, key)).run();
    return true;
};

/**
 * 批量获取设置
 */
export const getSettings = async (
    keys: (string | SettingKey)[]
): Promise<Record<string, string | null>> => {
    const result = await (await db.getDb())
        .select({ key: settings.key, value: settings.value })
        .from(settings)
        .where(inArray(settings.key, keys))
        .all();

    return Object.fromEntries(result.map((s) => [s.key, s.value]));
};

/**
 * 批量设置值
 */
export const setSettings = async (values: Record<string, string>): Promise<void> => {
    for (const [key, value] of Object.entries(values)) {
        await setSetting(key, value);
    }
};

/**
 * 检查 key 是否存在
 */
export const settingKeyExists = async (key: string | SettingKey): Promise<boolean> => {
    const result = await (await db.getDb())
        .select({ id: settings.id })
        .from(settings)
        .where(eq(settings.key, key))
        .get();

    return result !== undefined;
};
