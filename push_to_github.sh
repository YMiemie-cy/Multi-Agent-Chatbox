#!/bin/bash
# 快速推送到 GitHub 脚本

set -e  # 遇到错误立即退出

echo "🚀 准备推送到 GitHub..."
echo ""

# 检查是否已初始化 Git
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    echo "✅ Git 仓库已初始化"
    echo ""
fi

# 检查是否有远程仓库
if ! git remote | grep -q "origin"; then
    echo "❓ 请输入您的 GitHub 仓库 URL:"
    echo "   示例: https://github.com/YOUR-USERNAME/Multi-Agent-Chatbox.git"
    read -p "URL: " repo_url
    
    if [ -z "$repo_url" ]; then
        echo "❌ 仓库 URL 不能为空"
        exit 1
    fi
    
    echo "🔗 添加远程仓库..."
    git remote add origin "$repo_url"
    echo "✅ 远程仓库已添加"
    echo ""
else
    echo "✅ 远程仓库已存在"
    git remote -v
    echo ""
fi

# 添加所有文件
echo "📁 添加文件到 Git..."
git add .

# 显示将要提交的文件
echo ""
echo "📋 将要提交的文件:"
git status --short

# 确认提交
echo ""
read -p "❓ 是否继续提交并推送? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 已取消"
    exit 0
fi

# 提交
echo ""
echo "💾 提交更改..."
git commit -m "🚀 添加 Render 部署配置" || {
    echo "⚠️  没有需要提交的更改"
    exit 0
}

# 推送
echo ""
echo "⬆️  推送到 GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 成功推送到 GitHub!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 下一步:"
echo "1. 访问 https://dashboard.render.com/"
echo "2. 点击 'New' → 'Blueprint'"
echo "3. 选择您的 GitHub 仓库"
echo "4. 设置 POE_API_KEY 环境变量"
echo "5. 点击 'Apply' 开始部署"
echo ""
echo "📖 详细指南: 查看 DEPLOY.md 或 QUICK_START_DEPLOY.md"
echo ""

