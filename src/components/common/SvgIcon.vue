<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { computed, ref } from 'vue';

    interface Props {
        name: string;
        class?: string;
    }

    const props = defineProps<Props>();

    // 使用 Vite 的 glob 导入功能动态加载所有 SVG 图标
    const iconModules = import.meta.glob<string>('@assets/icons/*.svg', {
        query: '?raw',
        import: 'default',
        eager: true,
    });

    // 提取图标内容（去除 SVG 外层标签，只保留内部内容）
    const icons = ref<Record<string, string>>({});

    // 处理导入的 SVG 文件
    Object.entries(iconModules).forEach(([path, content]) => {
        // 从路径中提取文件名（不含扩展名）
        const fileName = path.match(/\/([^/]+)\.svg$/)?.[1];
        if (fileName && content) {
            // 提取 SVG 内部内容（path 标签）
            const match = content.match(/<path[^>]*\/>/g);
            if (match) {
                icons.value[fileName] = match.join('');
            }
        }
    });

    // 获取当前图标的内容
    const iconContent = computed(() => icons.value[props.name] || '');
</script>

<template>
    <svg
        :class="props.class"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        v-html="iconContent"
    />
</template>
