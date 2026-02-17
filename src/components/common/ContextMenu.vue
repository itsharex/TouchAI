<!-- Copyright (c) 2026. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import SvgIcon from '@components/common/SvgIcon.vue';
    import { computed, onMounted, onUnmounted, ref } from 'vue';

    export interface ContextMenuItem {
        key: string;
        label: string;
        icon?: string;
        danger?: boolean;
    }

    const props = defineProps<{
        x: number;
        y: number;
        items: ContextMenuItem[];
    }>();

    const emit = defineEmits<{
        (e: 'select', key: string): void;
        (e: 'close'): void;
    }>();

    const menuRef = ref<HTMLElement | null>(null);

    const menuStyle = computed(() => ({
        left: `${props.x}px`,
        top: `${props.y}px`,
    }));

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
            emit('close');
        }
    };

    onMounted(() => {
        document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside);
    });

    const handleSelect = (key: string) => {
        emit('select', key);
        emit('close');
    };
</script>

<template>
    <div
        ref="menuRef"
        class="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        :style="menuStyle"
    >
        <button
            v-for="item in items"
            :key="item.key"
            :class="[
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100',
            ]"
            @click="handleSelect(item.key)"
        >
            <SvgIcon v-if="item.icon" :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
        </button>
    </div>
</template>
