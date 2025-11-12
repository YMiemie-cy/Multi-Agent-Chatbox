#!/bin/bash
# Render.com 启动脚本

set -e  # 遇到错误立即退出

echo "🚀 启动 Multi-Agent Chatbox..."

# 获取环境变量（如果没有设置则使用默认值）
UPLOAD_DIR=${UPLOAD_DIR:-uploads}
LOG_DIR=${LOG_DIR:-logs}
SESSIONS_FILE=${SESSIONS_FILE:-chat_sessions.json}
MEMORIES_FILE=${MEMORIES_FILE:-memories.json}

# 调试：显示环境变量值
echo "📁 检查目录结构..."
echo "UPLOAD_DIR: $UPLOAD_DIR"
echo "LOG_DIR: $LOG_DIR"

# 确保使用相对路径
if [[ "$UPLOAD_DIR" == /* ]]; then
    echo "⚠️  检测到绝对路径，改用相对路径"
    UPLOAD_DIR="uploads"
    LOG_DIR="logs"
    SESSIONS_FILE="chat_sessions.json"
    MEMORIES_FILE="memories.json"
fi

mkdir -p "$UPLOAD_DIR"
mkdir -p "$LOG_DIR"
echo "✅ 创建目录: $UPLOAD_DIR, $LOG_DIR"

# 初始化数据文件（如果不存在）
if [ ! -f "$SESSIONS_FILE" ]; then
    echo "[]" > "$SESSIONS_FILE"
    echo "✅ 初始化 $SESSIONS_FILE"
fi

if [ ! -f "$MEMORIES_FILE" ]; then
    echo "[]" > "$MEMORIES_FILE"
    echo "✅ 初始化 $MEMORIES_FILE"
fi

# 启动应用
echo "🎯 启动 FastAPI 服务..."
python app_optimized.py

