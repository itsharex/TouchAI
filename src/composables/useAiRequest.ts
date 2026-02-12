// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { AiRequest } from '@database/schema';
import { aiService } from '@services/AiService';
import type { Index } from '@services/AiService/attachments';
import { AiError, AiErrorCode } from '@services/AiService/errors';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { computed, ref } from 'vue';

export interface UseAiRequestOptions {
    sessionId?: number;
    onChunk?: (content: string) => void;
    onComplete?: (response: string) => void;
    onError?: (error: Error) => void;
}

/**
 * 负责AI请求前端交互和状态管理：
 * - 控制加载态、错误态、响应内容
 * - 发起业务请求到 AiService
 * - 转发 UI 层回调
 */
export function useAiRequest(options: UseAiRequestOptions = {}) {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);
    const response = ref('');
    const reasoning = ref('');
    const currentRequest = ref<AiRequest | null>(null);
    const abortController = ref<AbortController | null>(null);
    let requestId = 0;

    const hasError = computed(() => error.value !== null);
    const hasResponse = computed(() => response.value.length > 0);

    const toError = (value: unknown): Error => {
        if (value instanceof Error) {
            return value;
        }

        return new Error(String(value));
    };

    const isCancelledError = (requestError: Error): boolean =>
        requestError instanceof AiError && requestError.is(AiErrorCode.REQUEST_CANCELLED);

    /**
     * 触发一次 AI 请求
     */
    async function sendRequest(
        prompt: string,
        attachments: Index[] = [],
        modelId?: string,
        providerId?: number
    ) {
        if (!prompt.trim()) {
            error.value = new Error('Prompt cannot be empty');
            return;
        }

        abortController.value = new AbortController();
        const currentRequestId = ++requestId;

        isLoading.value = true;
        error.value = null;
        response.value = '';
        reasoning.value = '';

        try {
            const result = await aiService.executeRequest({
                prompt,
                sessionId: options.sessionId,
                modelId,
                providerId,
                attachments,
                signal: abortController.value.signal,
                onChunk: (chunk) => {
                    if (chunk.reasoning) {
                        reasoning.value += chunk.reasoning;
                    }

                    if (chunk.content) {
                        response.value += chunk.content;
                        options.onChunk?.(chunk.content);
                    }
                },
            });

            currentRequest.value = result.request;
            options.onComplete?.(result.response);
        } catch (rawError) {
            const requestError = toError(rawError);

            if (isCancelledError(requestError)) {
                return;
            }

            error.value = requestError;

            const isEmptyResponse =
                requestError instanceof AiError && requestError.is(AiErrorCode.EMPTY_RESPONSE);

            try {
                sendNotification({
                    title: isEmptyResponse ? 'TouchAI - 空回复' : 'TouchAI - 请求失败',
                    body: requestError.message || '未知错误',
                });
            } catch (notificationError) {
                console.error('[useAiRequest] Failed to send notification:', notificationError);
            }

            options.onError?.(requestError);
        } finally {
            if (currentRequestId === requestId) {
                isLoading.value = false;
            }
        }
    }

    /**
     * 重置 UI 状态。
     */
    function reset() {
        isLoading.value = false;
        error.value = null;
        response.value = '';
        reasoning.value = '';
        currentRequest.value = null;
        abortController.value = null;
    }

    /**
     * 取消当前请求并清理 UI 状态。
     */
    function cancel() {
        if (abortController.value) {
            abortController.value.abort();
            reset();
        }
    }

    return {
        isLoading,
        error,
        response,
        reasoning,
        hasError,
        hasResponse,
        sendRequest,
        reset,
        cancel,
    };
}
