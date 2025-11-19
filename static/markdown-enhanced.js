/**
 * 增强的 Markdown 渲染工具
 * 支持：代码高亮、数学公式、Mermaid 图表
 */

// 初始化 Mermaid
if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
            primaryColor: '#9c81f2',
            primaryTextColor: '#f4f4f5',
            primaryBorderColor: '#7c3aed',
            lineColor: '#9c81f2',
            secondaryColor: '#2b2d37',
            tertiaryColor: '#3f3f46'
        }
    });
}

/**
 * 增强的 Markdown 渲染函数
 * @param {string} content - 要渲染的 Markdown 内容
 * @param {HTMLElement} container - 渲染目标容器
 */
function renderEnhancedMarkdown(content, container) {
    if (!content || !container) return;

    // 配置 marked
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) {
                    console.error('代码高亮失败:', e);
                }
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        sanitize: false
    });

    // 第一步：提取并保护 Mermaid 代码块
    const mermaidBlocks = [];
    content = content.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
        const id = `mermaid-placeholder-${mermaidBlocks.length}`;
        mermaidBlocks.push({ id, code: code.trim() });
        return `<div class="mermaid-placeholder" data-id="${id}"></div>`;
    });

    // 第二步：提取并保护数学公式
    const mathBlocks = [];
    // 保护块级公式 $$...$$
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        const id = `math-block-${mathBlocks.length}`;
        mathBlocks.push({ id, formula: formula.trim(), display: true });
        return `<div class="math-placeholder" data-id="${id}"></div>`;
    });
    
    // 保护行内公式 $...$
    content = content.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
        const id = `math-inline-${mathBlocks.length}`;
        mathBlocks.push({ id, formula: formula.trim(), display: false });
        return `<span class="math-placeholder" data-id="${id}"></span>`;
    });

    // 第三步：渲染 Markdown
    let html = marked.parse(content);

    // 清理多余的空段落
    html = html
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/(<\/p>)\s*(<p>)/g, '$1$2')
        .trim();

    // 第四步：插入 HTML
    container.innerHTML = html;

    // 第五步：渲染 Mermaid 图表
    if (mermaidBlocks.length > 0 && typeof mermaid !== 'undefined') {
        mermaidBlocks.forEach((block) => {
            const placeholder = container.querySelector(`[data-id="${block.id}"]`);
            if (placeholder) {
                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.textContent = block.code;
                placeholder.replaceWith(mermaidDiv);
            }
        });

        // 渲染所有 mermaid 图表
        try {
            mermaid.run({
                nodes: container.querySelectorAll('.mermaid'),
            });
        } catch (e) {
            console.error('Mermaid 渲染失败:', e);
        }
    }

    // 第六步：渲染数学公式
    if (mathBlocks.length > 0 && typeof katex !== 'undefined') {
        mathBlocks.forEach((block) => {
            const placeholder = container.querySelector(`[data-id="${block.id}"]`);
            if (placeholder) {
                try {
                    katex.render(block.formula, placeholder, {
                        displayMode: block.display,
                        throwOnError: false,
                        output: 'html'
                    });
                } catch (e) {
                    console.error('KaTeX 渲染失败:', e);
                    placeholder.textContent = block.display ? `$$${block.formula}$$` : `$${block.formula}$`;
                }
            }
        });
    }

    // 第七步：代码块增强（添加复制按钮）
    container.querySelectorAll('pre code').forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        if (!pre.querySelector('.code-copy-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = '复制代码';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        }
    });
}

/**
 * 流式渲染 Markdown（用于打字机效果）
 * @param {string} content - 当前累积的内容
 * @param {HTMLElement} container - 渲染目标容器
 */
function renderStreamingMarkdown(content, container) {
    // 简化版渲染，不包含 Mermaid 和复杂的数学公式（因为内容未完成）
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) {}
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    let html = marked.parse(content);
    html = html.replace(/<p>\s*<\/p>/g, '').trim();
    container.innerHTML = html;
}

// 导出函数到全局作用域
window.renderEnhancedMarkdown = renderEnhancedMarkdown;
window.renderStreamingMarkdown = renderStreamingMarkdown;

