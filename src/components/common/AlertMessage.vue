<!--
  - Copyright (c) 2025-2026. Qian Cheng. Licensed under GPL v3
  -->

<script setup lang="ts">
    import SvgIcon from '@components/common/SvgIcon.vue';
    import { ref, watch } from 'vue';

    export interface AlertProps {
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
        duration?: number;
    }

    const alerts = ref<AlertProps[]>([]);

    let nextId = 0;

    const show = (type: AlertProps['type'], message: string, duration: number = 3000): string => {
        const id = `alert-${nextId++}`;
        alerts.value.push({ id, type, message, duration });
        return id;
    };

    const close = (id: string) => {
        const index = alerts.value.findIndex((a) => a.id === id);
        if (index !== -1) {
            alerts.value.splice(index, 1);
        }
    };

    const success = (message: string, duration?: number) => show('success', message, duration);
    const error = (message: string, duration?: number) => show('error', message, duration);
    const warning = (message: string, duration?: number) => show('warning', message, duration);
    const info = (message: string, duration?: number) => show('info', message, duration);

    defineExpose({
        show,
        close,
        success,
        error,
        warning,
        info,
    });

    // 单个 Alert 项组件逻辑
    const getIconColor = (type: AlertProps['type']): string => {
        switch (type) {
            case 'success':
                return 'text-green-500';
            case 'error':
                return 'text-red-500';
            case 'warning':
                return 'text-amber-500';
            case 'info':
                return 'text-blue-500';
            default:
                return 'text-gray-500';
        }
    };

    const getIconSrc = (type: AlertProps['type']): string => {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'error':
                return 'x-circle';
            case 'warning':
                return 'exclamation-triangle';
            case 'info':
                return 'information-circle';
            default:
                return 'information-circle';
        }
    };

    // 管理每个 alert 的可见性
    const visibilityMap = ref<Map<string, boolean>>(new Map());

    // 当新 alert 添加时，设置其可见性和自动关闭
    const setupAlert = (alert: AlertProps) => {
        // 触发进入动画
        setTimeout(() => {
            visibilityMap.value.set(alert.id, true);
        }, 10);

        // 自动关闭
        if (alert.duration && alert.duration > 0) {
            setTimeout(() => {
                handleClose(alert.id);
            }, alert.duration);
        }
    };

    const handleClose = (id: string) => {
        visibilityMap.value.set(id, false);
        setTimeout(() => {
            close(id);
            visibilityMap.value.delete(id);
        }, 300);
    };

    // 监听 alerts 变化，为新 alert 设置动画和自动关闭
    const processedIds = new Set<string>();

    watch(
        alerts,
        () => {
            alerts.value.forEach((alert) => {
                if (!processedIds.has(alert.id)) {
                    processedIds.add(alert.id);
                    setupAlert(alert);
                }
            });
        },
        { deep: true }
    );
</script>

<template>
    <div class="alert-container-wrapper">
        <div class="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            <div
                v-for="alert in alerts"
                :key="alert.id"
                class="alert-item transform transition-all duration-300 ease-out"
                :class="{
                    'translate-y-0 opacity-100': visibilityMap.get(alert.id),
                    '-translate-y-4 opacity-0': !visibilityMap.get(alert.id),
                }"
            >
                <div
                    class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm backdrop-blur-sm"
                >
                    <SvgIcon
                        :name="getIconSrc(alert.type)"
                        class="h-5 w-5 flex-shrink-0"
                        :class="getIconColor(alert.type)"
                    />

                    <p class="flex-1 font-serif text-sm text-gray-900">{{ alert.message }}</p>

                    <button
                        class="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        @click="handleClose(alert.id)"
                    >
                        <SvgIcon name="x" class="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .alert-container-wrapper {
        pointer-events: none;
    }

    .alert-container-wrapper > div > * {
        pointer-events: auto;
    }

    .alert-item {
        min-width: 320px;
        max-width: 500px;
    }
</style>
