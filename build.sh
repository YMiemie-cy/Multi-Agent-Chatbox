#!/bin/bash
# Render.com 构建脚本

set -e  # 遇到错误立即退出

echo "🚀 开始构建 Multi-Agent Chatbox..."

# 升级 pip
echo "📦 升级 pip..."
pip install --upgrade pip

# 安装依赖
echo "📦 安装 Python 依赖..."
pip install -r requirements.txt

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p uploads
mkdir -p logs

# 初始化数据文件（如果不存在）
echo "📝 初始化数据文件..."

if [ ! -f "chat_sessions.json" ]; then
    echo "[]" > chat_sessions.json
    echo "✅ 创建 chat_sessions.json"
fi

if [ ! -f "memories.json" ]; then
    echo "[]" > memories.json
    echo "✅ 创建 memories.json"
fi

echo "✅ 构建完成！"

