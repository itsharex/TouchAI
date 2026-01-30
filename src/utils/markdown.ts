// Copyright (c) 2025. 千诚. Licensed under GPL v3

import katex from '@vscode/markdown-it-katex';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import abbr from 'markdown-it-abbr';
import deflist from 'markdown-it-deflist';
import footnote from 'markdown-it-footnote';
import ins from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import taskLists from 'markdown-it-task-lists';

/**
 * 配置 Markdown 渲染器，支持代码高亮和数学公式
 */
export function createMarkdownRenderer(): MarkdownIt {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: false, // 禁用排版转换，避免干扰公式
        highlight: (str: string, lang: string) => {
            // 如果指定了语言且 highlight.js 支持，则高亮
            if (lang && hljs.getLanguage(lang)) {
                try {
                    const highlighted = hljs.highlight(str, {
                        language: lang,
                        ignoreIllegals: true,
                    }).value;

                    // 返回带有复制按钮的代码块
                    return `<div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span class="code-block-lang">${lang}</span>
                            <button class="code-copy-btn" data-code="${escapeHtml(str)}">
                                <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span class="copy-text">复制</span>
                            </button>
                        </div>
                        <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
                    </div>`;
                } catch (err) {
                    console.error('Highlight error:', err);
                }
            }

            // 自动检测语言
            try {
                const result = hljs.highlightAuto(str);
                const detectedLang = result.language || 'plaintext';

                return `<div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="code-block-lang">${detectedLang}</span>
                        <button class="code-copy-btn" data-code="${escapeHtml(str)}">
                            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span class="copy-text">复制</span>
                        </button>
                    </div>
                    <pre><code class="hljs">${result.value}</code></pre>
                </div>`;
            } catch (err) {
                console.error('Auto highlight error:', err);
            }

            // 降级：无高亮的代码块
            return `<div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-block-lang">text</span>
                    <button class="code-copy-btn" data-code="${escapeHtml(str)}">
                        <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span class="copy-text">复制</span>
                    </button>
                </div>
                <pre><code>${escapeHtml(str)}</code></pre>
            </div>`;
        },
    });

    // 启用扩展插件
    md.use(katex); // 数学公式 $$block$$ (块级公式)
    md.use(footnote); // 脚注支持 [^1]
    md.use(mark); // 高亮文本 ==marked==
    md.use(sub); // 下标 H~2~O
    md.use(sup); // 上标 x^2^
    md.use(abbr); // 缩写定义
    md.use(deflist); // 定义列表
    md.use(ins); // 插入文本 ++inserted++
    md.use(taskLists, { enabled: true }); // 任务列表 - [ ] task

    return md;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 单例 Markdown 渲染器
 */
export const markdownRenderer = createMarkdownRenderer();

/**
 * 渲染 Markdown 文本
 */
export function renderMarkdown(text: string): string {
    return markdownRenderer.render(text);
}
