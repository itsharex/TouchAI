// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import '@styles/tailwind.css';

import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);

app.mount('#app');
