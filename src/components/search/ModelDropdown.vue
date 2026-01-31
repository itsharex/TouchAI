<!-- Copyright (c) 2026. Qian Cheng. Licensed under GPL v3 -->

<script setup lang="ts">
    import { findModelsWithProvider } from '@database/queries';
    import { getModelLogoByModelName } from '@utils/modelLogoMatcher';
    import { computed, onMounted, ref, watch } from 'vue';

    interface ModelOption {
        id: number;
        modelId: string;
        name: string;
        providerName: string;
        logo: string | null;
    }

    interface Props {
        isOpen: boolean;
        activeModelId: string;
        searchQuery: string;
    }

    interface Emits {
        (e: 'select', modelId: string): void;
        (e: 'close'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const models = ref<ModelOption[]>([]);
    const highlightedIndex = ref(0);

    // 加载启用的模型
    onMounted(async () => {
        try {
            const data = await findModelsWithProvider();
            // 只显示服务商已启用的模型
            models.value = data
                .filter((m) => m.provider_enabled === 1)
                .map((m) => ({
                    id: m.id,
                    modelId: m.model_id,
                    name: m.name,
                    providerName: m.provider_name,
                    logo: getModelLogoByModelName(m.model_id),
                }));
        } catch (error) {
            console.error('[ModelDropdown] Failed to load models:', error);
        }
    });

    // 根据搜索查询过滤模型
    const filteredModels = computed(() => {
        if (!props.searchQuery) return models.value;
        const query = props.searchQuery.toLowerCase();
        return models.value.filter(
            (m) =>
                m.name.toLowerCase().includes(query) ||
                m.modelId.toLowerCase().includes(query) ||
                m.providerName.toLowerCase().includes(query)
        );
    });

    // 键盘导航
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            highlightedIndex.value = Math.min(
                highlightedIndex.value + 1,
                filteredModels.value.length - 1
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const model = filteredModels.value[highlightedIndex.value];
            if (model) emit('select', model.modelId);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            emit('close');
        }
    }

    // 重置高亮索引当搜索改变时
    watch(
        () => props.searchQuery,
        () => {
            highlightedIndex.value = 0;
        }
    );

    // 重置高亮索引当下拉框打开时
    watch(
        () => props.isOpen,
        (newVal) => {
            if (newVal) {
                highlightedIndex.value = 0;
            }
        }
    );

    // 暴露键盘处理函数给父组件
    defineExpose({
        handleKeyDown,
    });
</script>

<template>
    <div
        v-if="isOpen"
        class="custom-scrollbar-thin absolute top-full left-0 z-[9999] mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        @keydown="handleKeyDown"
    >
        <!-- Search hint -->
        <div v-if="!searchQuery" class="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
            Type to search models...
        </div>
        <div
            v-for="(model, index) in filteredModels"
            :key="model.id"
            :class="[
                'flex cursor-pointer items-center gap-3 px-4 py-2',
                index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50',
            ]"
            @click="emit('select', model.modelId)"
        >
            <img
                v-if="model.logo"
                :src="`/src/assets/logos/models/${model.logo}`"
                :alt="model.name"
                class="h-6 w-6 rounded"
            />
            <div class="flex-1">
                <div class="text-sm font-medium">{{ model.name }}</div>
                <div class="text-xs text-gray-500">{{ model.providerName }}</div>
            </div>
        </div>
        <div v-if="filteredModels.length === 0" class="px-4 py-3 text-sm text-gray-500">
            No models found
        </div>
    </div>
</template>
