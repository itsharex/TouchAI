// Copyright (c) 2025. 千诚. Licensed under GPL v3

import Anthropic from '@anthropic-ai/sdk';

import type {
    AiProvider,
    AiProviderConfig,
    AiRequestOptions,
    AiResponse,
    AiStreamChunk,
    ModelInfo,
} from '../types';

export class AnthropicProvider implements AiProvider {
    name = 'Anthropic';
    type = 'anthropic' as const;
    private client: Anthropic;

    constructor(config: AiProviderConfig) {
        this.client = new Anthropic({
            apiKey: config.apiKey,
            baseURL: config.apiEndpoint,
            dangerouslyAllowBrowser: true,
        });
    }

    async request(options: AiRequestOptions): Promise<AiResponse> {
        const message = await this.client.messages.create({
            model: options.model,
            messages: options.messages as Anthropic.MessageParam[],
            max_tokens: 4096,
            stream: false,
        });

        const firstBlock = message.content[0];
        const content = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

        return {
            content,
            tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
            finishReason: message.stop_reason || undefined,
        };
    }

    async *stream(options: AiRequestOptions): AsyncGenerator<AiStreamChunk, void, unknown> {
        const stream = await this.client.messages.create({
            model: options.model,
            messages: options.messages as Anthropic.MessageParam[],
            max_tokens: 4096,
            stream: true,
        });

        for await (const event of stream) {
            // 处理 thinking 内容块
            if (event.type === 'content_block_start' && event.content_block.type === 'thinking') {
                // thinking 块开始，不需要特殊处理
                continue;
            }

            // 处理 delta 内容块
            if (event.type === 'content_block_delta') {
                if (event.delta.type === 'thinking_delta') {
                    // 推理内容流式输出
                    yield { content: '', reasoning: event.delta.thinking, done: false };
                } else if (event.delta.type === 'text_delta') {
                    // 正常文本内容
                    yield { content: event.delta.text, done: false };
                }
            } else if (event.type === 'message_stop') {
                yield { content: '', done: true };
                return;
            }
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.client.models.list();
            return true;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<ModelInfo[]> {
        const response = await this.client.models.list();
        return response.data.map((model) => ({
            id: model.id,
            name: model.display_name || model.id,
        }));
    }
}
