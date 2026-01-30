// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import type { Model } from '@/database/schema';

/**
 * 模型分组接口
 */
export interface ModelGroup {
    groupKey: string; // 分组键，如 "claude-sonnet", "gpt-4"
    groupName: string; // 分组显示名称
    models: Model[]; // 该组的模型列表
}

/**
 * 从模型 ID 中提取分组键
 *
 */
function extractGroupKey(modelId: string): string {
    // 1. 遇到 / 直接截断，取前面部分
    const beforeSlash = modelId.split('/')[0] || modelId;

    // 2. 移除版本号模式（-数字、空格数字等）
    // 匹配模式：-数字、空格数字、-v数字等
    const withoutVersion = beforeSlash.replace(
        /[-\s]+(v?\d+[\d.]*|latest|preview|beta|alpha).*$/i,
        ''
    );

    // 如果移除版本号后为空，使用原始部分
    if (!withoutVersion) {
        return beforeSlash;
    }

    return withoutVersion;
}

/**
 * 提取基础分组名（用于合并单模型分组）
 * 例如：deepseek-reasoner -> deepseek, deepseek-chat -> deepseek
 */
function extractBaseGroupKey(groupKey: string): string {
    // 移除最后一个 - 及其后面的内容
    const parts = groupKey.split('-');
    if (parts.length > 1) {
        return parts[0] || '';
    }
    return groupKey;
}

/**
 * 将模型列表按 model_id 分组
 * @param models 模型列表
 * @param defaultModelId 默认模型 ID（可选）
 */
export function groupModels(models: Model[], defaultModelId?: number | null): ModelGroup[] {
    // 按 model_id 分组
    const groupMap = new Map<string, Model[]>();
    let defaultModelGroupKey: string | null = null;

    for (const model of models) {
        const groupKey = extractGroupKey(model.model_id);

        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, []);
        }

        groupMap.get(groupKey)!.push(model);

        // 记录默认模型所在的分组
        if (defaultModelId && model.id === defaultModelId) {
            defaultModelGroupKey = groupKey;
        }
    }

    // 转换为 ModelGroup 数组
    const groups: ModelGroup[] = [];

    for (const [groupKey, groupModels] of groupMap.entries()) {
        // 对分组内的模型进行排序：默认模型排在最前面
        const sortedModels = [...groupModels].sort((a, b) => {
            // 如果 a 是默认模型，排在前面
            if (defaultModelId && a.id === defaultModelId) return -1;
            // 如果 b 是默认模型，排在前面
            if (defaultModelId && b.id === defaultModelId) return 1;
            // 其他按 model_id 排序
            return a.model_id.localeCompare(b.model_id);
        });

        groups.push({
            groupKey,
            groupName: groupKey,
            models: sortedModels,
        });
    }

    // 合并单模型分组：如果多个分组都只有一个模型且有共同前缀，则合并
    const mergedGroups: ModelGroup[] = [];
    const singleModelGroups = groups.filter((g) => g.models.length === 1);
    const multiModelGroups = groups.filter((g) => g.models.length > 1);

    // 按基础分组名聚合单模型分组
    const baseGroupMap = new Map<string, ModelGroup[]>();
    for (const group of singleModelGroups) {
        const baseKey = extractBaseGroupKey(group.groupKey);
        if (!baseGroupMap.has(baseKey)) {
            baseGroupMap.set(baseKey, []);
        }
        baseGroupMap.get(baseKey)!.push(group);
    }

    // 处理单模型分组
    for (const [baseKey, groupsWithSameBase] of baseGroupMap.entries()) {
        if (groupsWithSameBase.length > 1) {
            // 多个单模型分组有相同的基础名，合并它们
            const allModels = groupsWithSameBase.flatMap((g) => g.models);

            // 对合并后的模型排序
            const sortedModels = allModels.sort((a, b) => {
                if (defaultModelId && a.id === defaultModelId) return -1;
                if (defaultModelId && b.id === defaultModelId) return 1;
                return a.model_id.localeCompare(b.model_id);
            });

            mergedGroups.push({
                groupKey: baseKey,
                groupName: baseKey,
                models: sortedModels,
            });

            // 更新默认模型所在分组的 key
            if (allModels.some((m) => m.id === defaultModelId)) {
                defaultModelGroupKey = baseKey;
            }
        } else {
            // 只有一个单模型分组，保持原样
            const singleGroup = groupsWithSameBase[0];
            if (singleGroup) {
                mergedGroups.push(singleGroup);
            }
        }
    }

    // 合并多模型分组和处理后的单模型分组
    const finalGroups = [...multiModelGroups, ...mergedGroups];

    // 排序：默认模型所在分组排最前，其他按名称排序
    finalGroups.sort((a, b) => {
        // 如果 a 是默认模型所在分组，排在前面
        if (a.groupKey === defaultModelGroupKey) return -1;
        // 如果 b 是默认模型所在分组，排在前面
        if (b.groupKey === defaultModelGroupKey) return 1;
        // 其他按分组名称排序
        return a.groupName.localeCompare(b.groupName);
    });

    return finalGroups;
}
