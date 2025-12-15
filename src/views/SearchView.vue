<script setup lang="ts">
    // Copyright (c) 2025. Qian Cheng. Licensed under GPL v3.

    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { nextTick, onMounted, ref } from 'vue';

    import SearchBar from '@/components/SearchBar.vue';

    const searchQuery = ref('');
    const searchBar = ref<InstanceType<typeof SearchBar>>();

    document.oncontextmenu = function () {
        return false;
    };

    function handleSearch(query: string) {
        searchQuery.value = query;
        console.debug('Search query:', query);
    }

    onMounted(async () => {
        await nextTick();
        if (searchBar.value) {
            await searchBar.value.focus();
        }

        const appWindow = getCurrentWindow();

        await appWindow.listen('tauri://focus', async () => {
            await nextTick();
            searchBar.value?.focus();
        });
    });
</script>

<template>
    <div class="flex h-screen w-screen items-center justify-center bg-transparent p-0 select-none">
        <SearchBar ref="searchBar" @search="handleSearch" />
    </div>
</template>
