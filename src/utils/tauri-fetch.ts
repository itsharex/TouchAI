// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export function createTauriFetch(): typeof fetch {
    return ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
            typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        return tauriFetch(url, init);
    }) as typeof fetch;
}
