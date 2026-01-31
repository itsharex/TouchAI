<!--
  - Copyright (c) 2026. Qian Cheng. Licensed under GPL v3
  -->

<template>
    <div ref="containerRef" class="relative mx-auto h-[56px] w-full select-none">
        <div
            class="bg-background-primary relative flex h-full items-center gap-3 rounded-lg border border-gray-300 p-3 backdrop-blur-sm backdrop-blur-xl transition-all duration-250 ease-in-out"
        >
            <!-- Model Logo (clickable) -->
            <div
                class="flex cursor-pointer items-center justify-center"
                data-tauri-drag-region="false"
            >
                <img
                    v-if="selectedModelId || activeModel"
                    :src="getModelLogoPath(selectedModelId || activeModel?.model_id || '')"
                    :alt="selectedModelName || activeModel?.name || 'model'"
                    class="h-8 w-8 rounded-full border-2 border-gray-300 transition-colors hover:border-gray-400"
                    data-tauri-drag-region="false"
                    @click.stop="toggleModelDropdown"
                />
                <img
                    v-else
                    :src="logoWord"
                    alt="search"
                    class="h-5 w-15 select-none"
                    data-tauri-drag-region="false"
                    @click.stop="toggleModelDropdown"
                />
            </div>

            <!-- Model Badge (if selected) -->
            <div
                v-if="selectedModelId"
                class="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700"
            >
                <span>{{ selectedModelName }}</span>
                <button
                    class="rounded p-0.5 transition-colors hover:bg-blue-200"
                    @click.stop="clearSelectedModel"
                >
                    <SvgIcon name="x" class="h-3 w-3" />
                </button>
            </div>

            <!-- Input Field -->
            <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                autofocus
                :readonly="disabled"
                :placeholder="placeholder"
                :class="[
                    'flex-1 cursor-default border-0 bg-transparent font-sans text-lg caret-gray-500 outline-none placeholder:text-gray-400 placeholder:select-none',
                    disabled ? 'text-gray-400' : 'text-gray-900',
                ]"
                @input="onInput"
                @keydown="onKeyDown"
                @keydown.enter.prevent="onEnter"
            />

            <!-- Clear Button -->
            <div
                v-if="searchQuery"
                class="ml-2 flex cursor-pointer items-center text-gray-400 transition-colors duration-200 hover:text-gray-600"
                data-tauri-drag-region="false"
                @click.stop="clearSearch"
            >
                <SvgIcon name="clear" class="h-5 w-5" />
            </div>

            <!-- Settings Button -->
            <div
                class="ml-2 flex cursor-pointer items-center text-gray-400 transition-colors duration-200 hover:text-gray-600"
                data-tauri-drag-region="false"
                title="设置"
                @click.stop="openSettings"
            >
                <SvgIcon name="settings" class="h-5 w-5" />
            </div>
        </div>

        <!-- Model Dropdown (moved outside inner div) -->
        <ModelDropdown
            ref="modelDropdownRef"
            :is-open="isModelDropdownOpen"
            :active-model-id="activeModel?.model_id || ''"
            :search-query="dropdownSearchQuery"
            @select="handleModelSelect"
            @close="closeModelDropdown"
        />
    </div>
</template>

<script setup lang="ts">
    // Copyright (c) 2025. 千诚. Licensed under GPL v3.

    import logoWord from '@assets/logo_word.svg';
    import SvgIcon from '@components/common/SvgIcon.vue';
    import ModelDropdown from '@components/search/ModelDropdown.vue';
    import { findModelsWithProvider } from '@database/queries';
    import type { ModelWithProvider } from '@services/ai/manager';
    import { aiService } from '@services/ai/manager';
    import { invoke } from '@tauri-apps/api/core';
    import { getModelLogoByModelName } from '@utils/modelLogoMatcher';
    import { onMounted, onUnmounted, ref } from 'vue';

    interface Props {
        disabled?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        disabled: false,
    });

    const placeholder = '写下你的需求...';

    const searchQuery = ref('');
    const searchInput = ref<HTMLInputElement | null>(null);
    const modelDropdownRef = ref<InstanceType<typeof ModelDropdown> | null>(null);
    const containerRef = ref<HTMLElement | null>(null);

    // Model selection state
    const selectedModelId = ref<string | null>(null);
    const selectedModelName = ref<string | null>(null);
    const activeModel = ref<ModelWithProvider | null>(null);
    const isModelDropdownOpen = ref(false);
    const dropdownSearchQuery = ref('');
    const savedSearchQuery = ref(''); // 保存打开下拉框前的查询内容

    const emit = defineEmits<{
        search: [query: string];
        submit: [query: string];
        clear: [];
        dropdownStateChange: [isOpen: boolean];
    }>();

    // Load active model on mount
    onMounted(async () => {
        try {
            activeModel.value = await aiService.getActiveModel();
        } catch (error) {
            console.error('[SearchBar] Failed to load active model:', error);
        }

        // 添加全局点击事件监听，点击外部关闭下拉框
        document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
        // 清理事件监听
        document.removeEventListener('click', handleClickOutside);
    });

    // 点击外部关闭下拉框
    function handleClickOutside(event: MouseEvent) {
        if (!isModelDropdownOpen.value) return;

        const target = event.target as Node;
        // 如果点击的不是容器内的元素，关闭下拉框
        if (containerRef.value && !containerRef.value.contains(target)) {
            closeModelDropdown();
        }
    }

    function getModelLogoPath(modelId: string): string {
        const logo = getModelLogoByModelName(modelId);
        return logo ? `/src/assets/logos/models/${logo}` : logoWord;
    }

    function toggleModelDropdown() {
        if (!isModelDropdownOpen.value) {
            // 打开下拉框：保存当前查询，清空输入框用于搜索
            savedSearchQuery.value = searchQuery.value;
            searchQuery.value = '';
            dropdownSearchQuery.value = '';
            // 禁用失焦隐藏窗口
            invoke('set_allow_blur_hide', { allow: false }).catch(console.error);
        } else {
            // 关闭下拉框：恢复之前的查询
            searchQuery.value = savedSearchQuery.value;
            // 恢复失焦隐藏窗口
            invoke('set_allow_blur_hide', { allow: true }).catch(console.error);
        }
        isModelDropdownOpen.value = !isModelDropdownOpen.value;
        emit('dropdownStateChange', isModelDropdownOpen.value);
    }

    function closeModelDropdown() {
        // 恢复之前的查询
        searchQuery.value = savedSearchQuery.value;
        isModelDropdownOpen.value = false;
        dropdownSearchQuery.value = '';
        // 恢复失焦隐藏窗口
        invoke('set_allow_blur_hide', { allow: true }).catch(console.error);
        emit('dropdownStateChange', false);
    }

    async function handleModelSelect(modelId: string) {
        try {
            const models = await findModelsWithProvider();
            const model = models.find((m) => m.model_id === modelId);
            if (model) {
                selectedModelId.value = modelId;
                selectedModelName.value = model.name;
            }
        } catch (error) {
            console.error('[SearchBar] Failed to select model:', error);
        }
        // 恢复之前的查询
        searchQuery.value = savedSearchQuery.value;
        isModelDropdownOpen.value = false;
        dropdownSearchQuery.value = '';
        // 恢复失焦隐藏窗口
        await invoke('set_allow_blur_hide', { allow: true }).catch(console.error);
        emit('dropdownStateChange', false);
        searchInput.value?.focus();
    }

    function clearSelectedModel() {
        selectedModelId.value = null;
        selectedModelName.value = null;
    }

    function onInput() {
        // 如果下拉框打开，输入内容用于搜索模型
        if (isModelDropdownOpen.value) {
            dropdownSearchQuery.value = searchQuery.value;
        }
        emit('search', searchQuery.value);
    }

    function onKeyDown(event: KeyboardEvent) {
        // Check for @ key to open dropdown
        if (event.key === '@' && !isModelDropdownOpen.value) {
            event.preventDefault();
            // 保存当前查询，清空输入框用于搜索
            savedSearchQuery.value = searchQuery.value;
            searchQuery.value = '';
            isModelDropdownOpen.value = true;
            dropdownSearchQuery.value = '';
            // 禁用失焦隐藏窗口
            invoke('set_allow_blur_hide', { allow: false }).catch(console.error);
            emit('dropdownStateChange', true);
            return;
        }

        // If dropdown is open, let it handle navigation keys
        if (isModelDropdownOpen.value) {
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                event.preventDefault();
                modelDropdownRef.value?.handleKeyDown(event);
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                closeModelDropdown();
                return;
            }

            // For other keys, let them type normally in the input
            // The onInput handler will update dropdownSearchQuery
        }
    }

    function onEnter() {
        // 如果禁用状态或输入为空，不处理
        if (props.disabled || !searchQuery.value.trim()) {
            return;
        }

        // 普通查询
        emit('submit', searchQuery.value);
    }

    function clearSearch() {
        searchQuery.value = '';
        emit('clear');
    }

    function clearInput() {
        searchQuery.value = '';
    }

    async function focus() {
        searchInput?.value?.focus();
    }

    async function openSettings() {
        try {
            await invoke('open_settings_window');
        } catch (error) {
            console.error('Failed to open settings window:', error);
        }
    }

    defineExpose({
        selectedModelId,
        clearSelectedModel,
        focus,
        clearInput,
    });
</script>

<style scoped></style>
