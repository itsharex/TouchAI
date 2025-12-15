<template>
    <div class="mx-auto h-full w-full" @click="focus">
        <div
            class="relative flex h-full items-center gap-5 rounded-lg bg-white/98 p-3 backdrop-blur-sm transition-all duration-250 ease-in-out"
        >
            <div class="flex items-center justify-center">
                <img src="../assets/logo_word.svg" alt="search" class="h-5 w-15 select-none" />
            </div>
            <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                autofocus
                :placeholder="placeholder"
                class="flex-1 cursor-default border-0 bg-transparent font-sans text-lg text-black/90 caret-gray-500 outline-none placeholder:text-black/30 placeholder:select-none"
                @input="onSearch"
            />
            <div
                v-if="searchQuery"
                class="ml-2 flex cursor-pointer items-center text-black/30 transition-colors duration-200 hover:text-black/60"
                data-tauri-drag-region="false"
                @click="clearSearch"
            >
                <img src="../assets/icons/clear.svg" alt="clear" class="h-5 w-5" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    // Copyright (c) 2025. 千诚. Licensed under GPL v3.

    import { ref } from 'vue';

    const placeholder = '写下你的需求...';

    const searchQuery = ref('');
    const searchInput = ref<HTMLInputElement | null>(null);

    const emit = defineEmits<{
        search: [query: string];
    }>();

    function onSearch() {
        emit('search', searchQuery.value);
    }

    function clearSearch() {
        searchQuery.value = '';
        emit('search', '');
    }

    async function focus() {
        searchInput?.value?.focus();
    }

    defineExpose({
        focus,
    });
</script>

<style scoped></style>
