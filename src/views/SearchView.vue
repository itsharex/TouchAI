<script setup lang="ts">
    // Copyright (c) 2025. Qian Cheng. Licensed under GPL v3.

    import ResponsePanel from '@components/search/ResponsePanel.vue';
    import SearchBar from '@components/search/SearchBar.vue';
    import { useAiRequest } from '@composables/useAiRequest';
    import { useWindowResize } from '@composables/useWindowResize';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { nextTick, onMounted, ref } from 'vue';

    const searchQuery = ref('');
    const searchBar = ref<InstanceType<typeof SearchBar>>();
    const responseDisplay = ref<InstanceType<typeof ResponsePanel>>();
    const pageContainer = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    // 双击退格检测（仅用于取消请求）
    const lastBackspacePressTime = ref(0);
    const DOUBLE_PRESS_THRESHOLD = 150; // 150ms 内算双击

    const { isLoading, error, response, reasoning, hasResponse, sendRequest, reset, cancel } =
        useAiRequest();

    const { resizeForResponse } = useWindowResize();

    document.oncontextmenu = function () {
        return false;
    };

    function handleSearch(query: string) {
        searchQuery.value = query;
    }

    async function handleSubmit(query: string) {
        reset();
        await sendRequest(query);
    }

    // 处理清空事件（点击清除按钮）
    function handleClear() {
        searchQuery.value = '';
        reset();
    }

    // 清空输入框和回复
    function clearAll() {
        searchQuery.value = '';
        reset();
        searchBar.value?.clearInput();
    }

    // 取消当前请求
    function cancelRequest() {
        if (isLoading.value) {
            cancel();
        }
    }

    // 键盘事件监听
    async function handleKeyDown(event: KeyboardEvent) {
        const now = Date.now();

        // Tab 键切换焦点到响应模块
        if (event.key === 'Tab' && hasResponse.value) {
            event.preventDefault();
            responseDisplay.value?.focus();
            return;
        }

        // ESC 键处理
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();

            // 如果没有输入内容并且也没有结果，即空窗口，那么隐藏窗口
            if (!searchQuery.value.trim() && !hasResponse.value) {
                await getCurrentWindow().hide();
                return;
            }

            // 如果有内容
            if (isLoading.value) {
                // 正在请求中，取消请求但不清空输出内容
                cancelRequest();
            } else {
                // 不在请求中，清空内容
                clearAll();
            }
            return;
        }

        // 双击退格键取消请求
        if (event.key === 'Backspace') {
            if (now - lastBackspacePressTime.value < DOUBLE_PRESS_THRESHOLD) {
                // 如果在加载中，取消请求
                if (isLoading.value) {
                    cancelRequest();
                }
                lastBackspacePressTime.value = 0; // 重置，避免三击触发
            } else {
                lastBackspacePressTime.value = now;
            }
        }
    }

    function initPageHeightChangeListener() {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
                resizeForResponse(height).catch((error) => {
                    console.error('[SearchView] Failed to resize window:', error);
                });
            }
        });

        resizeObserver.observe(pageContainer.value as HTMLElement);

        // 初始触发一次
        nextTick(() => {
            resizeForResponse((pageContainer.value as HTMLElement).clientHeight).catch((error) => {
                console.error('[SearchView] Failed to resize window:', error);
            });
        });
    }

    function initFocusListener() {
        getCurrentWindow().listen('tauri://focus', async () => {
            await nextTick();
            searchBar.value?.focus();
        });
    }

    onMounted(async () => {
        // 初始化窗口获得焦点监听
        initFocusListener();

        // 监听整个页面容器的高度变化
        initPageHeightChangeListener();

        // 添加全局键盘事件监听
        window.addEventListener('keydown', handleKeyDown);
    });
</script>

<template>
    <div
        ref="pageContainer"
        class="flex w-screen flex-col items-center justify-start bg-transparent"
    >
        <SearchBar
            ref="searchBar"
            :disabled="isLoading"
            @search="handleSearch"
            @submit="handleSubmit"
            @clear="handleClear"
        />
        <ResponsePanel
            v-if="hasResponse || isLoading"
            ref="responseDisplay"
            :content="response"
            :reasoning="reasoning"
            :is-loading="isLoading"
            :error="error"
        />
    </div>
</template>
