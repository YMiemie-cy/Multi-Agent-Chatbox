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

# 获取环境变量（如果没有设置则使用默认值）
UPLOAD_DIR=${UPLOAD_DIR:-uploads}
LOG_DIR=${LOG_DIR:-logs}
SESSIONS_FILE=${SESSIONS_FILE:-chat_sessions.json}
MEMORIES_FILE=${MEMORIES_FILE:-memories.json}

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p "$UPLOAD_DIR"
mkdir -p "$LOG_DIR"
echo "✅ 创建目录: $UPLOAD_DIR, $LOG_DIR"

# 初始化数据文件（如果不存在）
echo "📝 初始化数据文件..."

if [ ! -f "$SESSIONS_FILE" ]; then
    echo "[]" > "$SESSIONS_FILE"
    echo "✅ 创建 $SESSIONS_FILE"
fi

if [ ! -f "$MEMORIES_FILE" ]; then
    echo "[]" > "$MEMORIES_FILE"
    echo "✅ 创建 $MEMORIES_FILE"
fi

echo "✅ 构建完成！"

