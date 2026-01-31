// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { invoke } from '@tauri-apps/api/core';
import { ref } from 'vue';

const MAX_WINDOW_HEIGHT = 700;

export function useWindowResize() {
    const currentHeight = ref(0);

    async function resizeForResponse(pageHeight: number, center_window: boolean) {
        // 直接使用页面高度，限制最大高度，并向上取整为整数
        const newHeight = Math.ceil(Math.min(pageHeight, MAX_WINDOW_HEIGHT));

        if (newHeight !== currentHeight.value) {
            await invoke('resize_search_window', {
                height: newHeight,
                center: center_window,
            });
            currentHeight.value = newHeight;
        }
    }

    return {
        currentHeight,
        resizeForResponse,
    };
}
