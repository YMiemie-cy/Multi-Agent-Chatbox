#!/bin/bash
# Render.com 启动脚本

set -e  # 遇到错误立即退出

echo "🚀 启动 Multi-Agent Chatbox..."

# 确保目录存在
echo "📁 检查目录结构..."
mkdir -p uploads
mkdir -p logs

# 初始化数据文件（如果不存在）
if [ ! -f "chat_sessions.json" ]; then
    echo "[]" > chat_sessions.json
    echo "✅ 初始化 chat_sessions.json"
fi

if [ ! -f "memories.json" ]; then
    echo "[]" > memories.json
    echo "✅ 初始化 memories.json"
fi

# 启动应用
echo "🎯 启动 FastAPI 服务..."
python app_optimized.py

