<!--
  - Copyright (c) 2026. Qian Cheng. Licensed under GPL v3
  -->

<template>
    <div ref="containerRef" class="relative mx-auto h-full w-full select-none">
        <div
            :class="[
                'search-bar-container bg-background-primary relative flex h-full items-center gap-3 rounded-lg p-3 backdrop-blur-xl transition-all duration-250 ease-in-out',
                isLoading ? 'loading' : '',
            ]"
            data-tauri-drag-region
            @mousedown="handleContainerMouseDown"
        >
            <div
                class="logo-container flex cursor-pointer items-center justify-center"
                @click.stop="toggleModelDropdown"
            >
                <img
                    v-if="selectedModelId || activeModel"
                    :src="getModelLogoPath(selectedModelId || activeModel?.model_id || '')"
                    :alt="selectedModelName || activeModel?.name || 'model'"
                    class="h-8 w-8 rounded-full border-2 border-gray-300 transition-colors hover:border-gray-400"
                />
                <img v-else :src="logoWord" alt="search" class="h-5 w-15 select-none" />
            </div>

            <div
                v-if="selectedModelId"
                class="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
            >
                <span>@{{ selectedModelName }}</span>
                <button
                    class="rounded p-0.5 transition-colors hover:bg-blue-200"
                    @click.stop="clearSelectedModel"
                >
                    <SvgIcon name="x" class="h-3 w-3" />
                </button>
            </div>

            <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                autofocus
                :readonly="disabled"
                :placeholder="currentPlaceholder"
                :class="[
                    'flex-1 cursor-default border-0 bg-transparent font-sans text-lg caret-gray-500 outline-none placeholder:text-gray-400 placeholder:select-none',
                    disabled ? 'text-gray-400' : 'text-gray-900',
                ]"
                @input="onInput"
                @mousedown="handleInputMouseDown"
            />

            <AttachmentList
                :attachments="attachments"
                @remove="removeAttachment"
                @preview="previewAttachment"
                @overflow-state-change="handleAttachmentOverflowStateChange"
            />
        </div>

        <ModelDropdown
            ref="modelDropdownRef"
            :is-open="isModelDropdownOpen"
            :active-model-id="activeModel?.model_id || ''"
            :active-provider-id="activeModel?.provider_id ?? null"
            :selected-model-id="selectedModelId || ''"
            :selected-provider-id="selectedProviderId ?? null"
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
    import AttachmentList from '@components/search/AttachmentList.vue';
    import ModelDropdown from '@components/search/ModelDropdown.vue';
    import { findModelsWithProvider } from '@database/queries';
    import type { ModelWithProviderAndMetadata } from '@database/queries/models';
    import { aiService } from '@services/ai/manager';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
    import type { Attachment } from '@utils/attachment.ts';
    import { getModelLogoByModelName } from '@utils/modelLogoMatcher';
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

    interface ModelCapabilities {
        supportsImages: boolean;
        supportsFiles: boolean;
    }

    interface Props {
        disabled?: boolean;
        isLoading?: boolean;
        attachments?: Attachment[];
    }

    const { disabled = false, isLoading = false, attachments = [] } = defineProps<Props>();

    const placeholder = '写下你的需求...';

    const searchQuery = ref('');
    const searchInput = ref<HTMLInputElement | null>(null);
    const modelDropdownRef = ref<InstanceType<typeof ModelDropdown> | null>(null);
    const containerRef = ref<HTMLElement | null>(null);

    // 保存打开下拉框前的状态
    const savedSearchQuery = ref('');
    const savedCursorPosition = ref(0);
    const isSearchingModel = ref(false);

    // 动态 placeholder
    const currentPlaceholder = computed(() => {
        return isSearchingModel.value ? '请输入模型名称或ID' : placeholder;
    });

    // Model selection state
    const selectedModelId = ref<string | null>(null);
    const selectedModelName = ref<string | null>(null);
    const selectedProviderId = ref<number | null>(null); // 添加 provider_id
    const activeModel = ref<ModelWithProviderAndMetadata | null>(null);
    const selectedModel = ref<ModelWithProviderAndMetadata | null>(null);
    const isModelDropdownOpen = ref(false);
    const dropdownSearchQuery = ref('');

    const emit = defineEmits<{
        search: [query: string];
        submit: [query: string];
        clear: [];
        dropdownStateChange: [isOpen: boolean];
        attachmentOverflowStateChange: [isOpen: boolean];
        modelChange: [capabilities: ModelCapabilities];
        removeAttachment: [id: string];
        dragStart: [];
        dragEnd: [];
    }>();

    // 加载活动模型
    const loadActiveModel = async () => {
        try {
            activeModel.value =
                (await aiService.getActiveModel()) as ModelWithProviderAndMetadata | null;
        } catch (error) {
            console.error('[SearchBar] Failed to load active model:', error);
        }
    };

    onMounted(async () => {
        await loadActiveModel();

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
        console.log(
            '[SearchBar] toggleModelDropdown called, current state:',
            isModelDropdownOpen.value
        );
        if (!isModelDropdownOpen.value) {
            // 打开下拉框：保存当前状态，清空输入框
            savedSearchQuery.value = searchQuery.value;
            savedCursorPosition.value = searchInput.value?.selectionStart || 0;
            searchQuery.value = '';
            isSearchingModel.value = true;
            dropdownSearchQuery.value = '';
            isModelDropdownOpen.value = true;
            console.log('[SearchBar] Dropdown opened');
            // 确保输入框保持焦点
            searchInput.value?.focus();
        } else {
            // 关闭下拉框：恢复原始状态
            isModelDropdownOpen.value = false;
            dropdownSearchQuery.value = '';
            restoreSearchState();
            console.log('[SearchBar] Dropdown closed');
        }
        emit('dropdownStateChange', isModelDropdownOpen.value);
    }

    function closeModelDropdown() {
        isModelDropdownOpen.value = false;
        dropdownSearchQuery.value = '';
        restoreSearchState();
        emit('dropdownStateChange', false);
    }

    // 恢复搜索框状态
    function restoreSearchState() {
        if (isSearchingModel.value) {
            searchQuery.value = savedSearchQuery.value;
            isSearchingModel.value = false;
            // 恢复光标位置
            setTimeout(() => {
                if (searchInput.value) {
                    searchInput.value.setSelectionRange(
                        savedCursorPosition.value,
                        savedCursorPosition.value
                    );
                    searchInput.value.focus();
                }
            }, 0);
        }
    }

    async function handleModelSelect(modelDbId: number) {
        try {
            const models = await findModelsWithProvider();
            const model = models.find((m) => m.id === modelDbId);
            if (model) {
                const isDefaultModel =
                    model.model_id === activeModel.value?.model_id &&
                    model.provider_id === activeModel.value?.provider_id;
                if (isDefaultModel) {
                    clearSelectedModel();
                } else {
                    selectedModel.value = model;
                    selectedModelId.value = model.model_id;
                    selectedModelName.value = model.name;
                    selectedProviderId.value = model.provider_id;
                }
            }
        } catch (error) {
            console.error('[SearchBar] Failed to select model:', error);
        }
        // 关闭下拉框并恢复输入框状态
        isModelDropdownOpen.value = false;
        dropdownSearchQuery.value = '';
        restoreSearchState();
        emit('dropdownStateChange', false);
    }

    function clearSelectedModel() {
        selectedModel.value = null;
        selectedModelId.value = null;
        selectedModelName.value = null;
        selectedProviderId.value = null;
    }

    function parseModalities(modalities?: string | null) {
        if (!modalities) return { input: ['text'], output: ['text'] };
        try {
            return JSON.parse(modalities) as { input?: string[]; output?: string[] };
        } catch (error) {
            console.warn('[SearchBar] Failed to parse model modalities:', error);
            return { input: ['text'], output: ['text'] };
        }
    }

    const currentModel = computed(() => selectedModel.value || activeModel.value);

    const modelCapabilities = computed<ModelCapabilities>(() => {
        const model = currentModel.value;
        if (!model) {
            return { supportsImages: false, supportsFiles: false };
        }
        const modalities = parseModalities(model.metadata_modalities);
        return {
            supportsImages: Boolean(modalities.input?.includes('image')),
            supportsFiles: model.metadata_attachment === 1,
        };
    });

    watch(
        modelCapabilities,
        (capabilities) => {
            emit('modelChange', capabilities);
        },
        { immediate: true }
    );

    function onInput() {
        // 如果下拉框打开，输入内容用于搜索模型
        if (isModelDropdownOpen.value) {
            dropdownSearchQuery.value = searchQuery.value;
        }
        emit('search', searchQuery.value);
    }

    // 打开模型下拉框
    function openModelDropdown() {
        savedSearchQuery.value = searchQuery.value;
        savedCursorPosition.value = searchInput.value?.selectionStart || 0;
        searchQuery.value = '';
        isSearchingModel.value = true;
        dropdownSearchQuery.value = '';
        isModelDropdownOpen.value = true;
        emit('dropdownStateChange', true);
        searchInput.value?.focus();
    }

    // 处理下拉框的键盘事件
    function handleDropdownKeyDown(event: KeyboardEvent) {
        modelDropdownRef.value?.handleKeyDown(event);
    }

    // 移除附件
    function removeAttachment(id: string) {
        emit('removeAttachment', id);
    }

    async function previewAttachment(attachment: Attachment) {
        if (attachment.type === 'image') {
            await openPath(attachment.path);
        } else {
            await revealItemInDir(attachment.path);
        }
    }

    // 处理附件溢出下拉框状态变化
    async function handleAttachmentOverflowStateChange(isOpen: boolean) {
        if (isOpen) {
            // 下拉框打开时，扩展窗口高度
            emit('attachmentOverflowStateChange', true);
        } else {
            // 下拉框关闭时，恢复高度
            emit('attachmentOverflowStateChange', false);
        }
    }

    function clearInput() {
        searchQuery.value = '';
    }

    function isCursorAtStart(): boolean {
        const input = searchInput.value;
        if (!input) return false;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;
        return start === 0 && end === 0;
    }

    async function focus() {
        searchInput?.value?.focus();
    }

    // 处理容器的 mousedown 事件，空白区域支持拖动
    async function handleContainerMouseDown(event: MouseEvent) {
        const target = event.target as HTMLElement;

        // 如果点击的是 logo 容器或其子元素，不处理拖动
        const logoContainer = target.closest('.logo-container');
        if (logoContainer) {
            return;
        }

        // 如果点击的是容器本身（空白区域），启动拖动
        if (target.hasAttribute('data-tauri-drag-region')) {
            emit('dragStart');
            try {
                await getCurrentWindow().startDragging();
            } finally {
                // 延迟清除拖动状态，避免拖动结束时立即触发失焦隐藏
                setTimeout(() => {
                    emit('dragEnd');
                }, 100);
            }
        }
    }

    // 处理 input 的 mousedown 事件
    async function handleInputMouseDown(event: MouseEvent) {
        const input = searchInput.value;
        if (!input) return;

        // 如果 input 为空（显示 placeholder），整个区域都支持拖动
        if (!input.value) {
            event.preventDefault();
            emit('dragStart');
            try {
                await getCurrentWindow().startDragging();
            } finally {
                // 延迟清除拖动状态，避免拖动结束时立即触发失焦隐藏
                setTimeout(() => {
                    emit('dragEnd');
                }, 100);
            }
            return;
        }

        // 获取点击位置相对于 input 的 x 坐标
        const rect = input.getBoundingClientRect();
        const clickX = event.clientX - rect.left;

        // 计算已输入文本的宽度
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 获取 input 的计算样式
        const style = window.getComputedStyle(input);
        ctx.font = `${style.fontSize} ${style.fontFamily}`;
        const textWidth = ctx.measureText(input.value).width;

        // 如果点击位置在文本之后（空白区域），启动拖动
        // 添加一些 padding 容差
        const padding = 10;
        if (clickX > textWidth + padding) {
            event.preventDefault();
            emit('dragStart');
            try {
                await getCurrentWindow().startDragging();
            } finally {
                // 延迟清除拖动状态，避免拖动结束时立即触发失焦隐藏
                setTimeout(() => {
                    emit('dragEnd');
                }, 100);
            }
        }
    }

    defineExpose({
        selectedModelId,
        selectedProviderId,
        isModelDropdownOpen,
        clearSelectedModel,
        closeModelDropdown,
        openModelDropdown,
        handleDropdownKeyDown,
        focus,
        clearInput,
        loadActiveModel,
        isCursorAtStart,
    });
</script>

<style scoped>
    .search-bar-container {
        border: 1.5px solid #d1d5db;
    }

    .search-bar-container.loading {
        border: 2px solid transparent;
        background-image:
            linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
            linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #8b5cf6, #3b82f6);
        background-origin: border-box;
        background-clip: padding-box, border-box;
        animation: border-flow 1.5s linear infinite;
    }

    @keyframes border-flow {
        0% {
            background-image:
                linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
                linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #8b5cf6, #3b82f6);
        }
        25% {
            background-image:
                linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
                linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6, #3b82f6, #8b5cf6);
        }
        50% {
            background-image:
                linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
                linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #8b5cf6, #ec4899);
        }
        75% {
            background-image:
                linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
                linear-gradient(90deg, #8b5cf6, #3b82f6, #8b5cf6, #ec4899, #8b5cf6);
        }
        100% {
            background-image:
                linear-gradient(rgba(251, 251, 246, 0.98), rgba(251, 251, 246, 0.98)),
                linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #8b5cf6, #3b82f6);
        }
    }
</style>
