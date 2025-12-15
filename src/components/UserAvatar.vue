<template>
    <div class="flex items-center justify-center">
        <img
            :src="avatarUrl"
            :alt="userName"
            class="h-10 w-10 cursor-pointer rounded-full border-2 border-blue-500/20 object-cover transition-all duration-250 ease-in-out hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_4px_12px_rgba(59,130,246,0.2)] dark:border-purple-500/30 dark:hover:border-purple-500/60 dark:hover:shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
        />
    </div>
</template>

<script setup lang="ts">
    // Copyright (c) 2025. 千诚. Licensed under GPL v3.

    import { computed } from 'vue';

    const props = withDefaults(
        defineProps<{
            userName?: string;
            avatarUrl?: string;
        }>(),
        {
            userName: 'User',
            avatarUrl: '',
        }
    );

    const avatarUrl = computed(() => {
        if (props.avatarUrl) {
            return props.avatarUrl;
        }

        return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + props.userName;
    });
</script>

<style scoped></style>
