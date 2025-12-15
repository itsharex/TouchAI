// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import { createRouter, createWebHistory } from 'vue-router';

import SearchView from '@/views/SearchView.vue';

const routes = [
    {
        path: '/',
        name: 'Search',
        component: SearchView,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
