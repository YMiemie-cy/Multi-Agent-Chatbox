# Multi-Agent Chatbox

一个现代化的多Agent讨论聊天应用，基于FastAPI和先进的AI技术构建。

## ✨ 功能特点

### 🤖 核心功能
- **多Agent讨论**: 支持多个AI Agent参与讨论，模拟真实团队协作
- **智能对话**: 基于大语言模型的智能对话系统
- **图像处理**: 支持图像上传和视觉模型交互（自动压缩、OCR文字识别、Base64编码）
- **文件上传**: 支持PDF、DOCX、图片等多种文件格式
- **会话管理**: 完整的会话历史记录和管理
- **实时交互**: 现代化的响应式用户界面

### 🏗️ 技术特点
- **现代架构**: 基于FastAPI的异步Web框架
- **模块化设计**: 清晰的代码组织和模块分离
- **性能监控**: 内置性能指标收集和监控
- **错误处理**: 完善的错误处理和重试机制
- **类型安全**: 使用Pydantic进行数据验证
- **日志系统**: 结构化日志记录和管理
- **请求限流**: 防止API滥用，保护服务稳定性

### 📱 移动端优化
- **响应式设计**: 完整的移动端布局适配，支持手机、平板和桌面设备
- **触摸优化**: 所有按钮符合iOS/Android最小触摸尺寸（44px）
- **抽屉式侧边栏**: 移动端侧边栏采用滑动抽屉设计，节省屏幕空间
- **自适应字体**: 不同屏幕尺寸下智能调整字体大小和行高
- **PWA支持**: 支持添加到主屏幕，提供类原生应用体验
- **性能优化**: 针对移动网络优化资源加载和动画效果

## 🚀 快速开始

### 📋 环境要求
- **Python 3.13+** （推荐使用 Python 3.13.2）
- pip 或 conda

### ⚡ 快速设置

```bash
# 1. 克隆项目
git clone <repository-url>
cd Multi-Agent-chatbox

# 2. 创建虚拟环境（推荐使用conda）
conda create -n multi-agent python=3.13
conda activate multi-agent

# 或使用venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
cp env.example .env
# 编辑 .env 文件，配置API密钥等参数

# 5. 运行应用
python app_optimized.py

# 6. 访问应用
# 打开浏览器访问 http://localhost:8000
```

### 🔧 自动化设置

```bash
# 使用设置脚本自动完成环境配置
python scripts/setup.py
```

## ☁️ 云端部署

### Render.com 部署（推荐）

本项目已配置完整的 Render.com 部署支持，只需几步即可部署到云端：

#### 🚀 快速部署

1. **推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/Multi-Agent-Chatbox.git
   git push -u origin main
   ```

2. **在 Render 上部署**
   - 访问 [render.com](https://render.com) 并登录
   - 点击 "New" → "Blueprint"
   - 连接您的 GitHub 仓库
   - Render 会自动检测 `render.yaml` 并部署

3. **设置 API 密钥**
   - 在 Render Dashboard 设置环境变量：`POE_API_KEY`
   - 点击 "Apply" 开始部署

4. **访问应用**
   - 部署完成后，您会获得一个 `.onrender.com` 域名
   - 例如：`https://multi-agent-chatbox.onrender.com`

#### 📋 部署配置文件

项目已包含以下部署相关文件：
- `render.yaml` - Render Blueprint 配置
- `build.sh` - 构建脚本
- `start.sh` - 启动脚本
- `DEPLOY.md` - 详细部署文档

#### 💰 费用说明

- **免费版**：每月 750 小时免费，15分钟无活动自动休眠
- **付费版**：$7/月起，支持持久化存储和不休眠

#### 📖 详细指南

完整的部署步骤和配置说明，请查看 [DEPLOY.md](DEPLOY.md)

### 其他云平台

您也可以部署到其他平台：
- **Heroku**: 需要添加 `Procfile`
- **Railway**: 支持自动检测 FastAPI 应用
- **AWS/GCP/Azure**: 使用 Docker 容器部署
- **Vercel/Netlify**: 需要配置 Serverless Functions

## 📁 项目结构

```
Multi-Agent-chatbox/
├── 📄 核心文件
│   ├── app_optimized.py         # 主应用程序
│   ├── config.py                # 配置管理
│   ├── requirements.txt         # 项目依赖（兼容Python 3.13）
│   ├── env.example             # 环境变量示例
│   ├── .gitignore              # Git忽略规则
│   ├── README.md               # 项目文档（本文件）
│   └── DEPLOY.md               # 部署指南
│
├── 🚀 部署配置
│   ├── render.yaml             # Render.com Blueprint配置
│   ├── build.sh                # 构建脚本
│   ├── start.sh                # 启动脚本
│   └── .renderignore           # Render部署忽略文件
│
├── 🗂️ 代码模块
│   ├── models/                 # 数据模型
│   │   └── chat_models.py      # Pydantic模型定义
│   └── utils/                  # 工具模块
│       ├── api_client.py       # API客户端（重试机制）
│       ├── database.py         # 数据库操作（缓存）
│       ├── logger.py           # 日志系统
│       └── metrics.py          # 性能监控
│
├── 🌐 前端资源
│   └── static/                 # 静态文件
│       ├── index.html          # 主页面
│       ├── script.js           # 前端脚本
│       └── style.css           # 现代化样式
│
├── 🛠️ 工具脚本
│   └── scripts/                # 管理脚本
│       ├── setup.py            # 项目设置脚本
│       └── cleanup.py          # 清理脚本
│
└── 📦 数据目录
    ├── uploads/                # 用户上传文件
    ├── logs/                   # 日志文件
    └── chat_sessions.json      # 会话数据
```

## ⚙️ 配置说明

### 🔐 环境变量

在 `.env` 文件中配置：

```env
# API配置
POE_API_KEY=your_poe_api_key_here          # 从 https://poe.com/api_key 获取
POE_BASE_URL=https://api.poe.com/v1

# 服务器配置
HOST=0.0.0.0
PORT=8000
DEBUG=false

# 文件配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB
SESSIONS_FILE=chat_sessions.json

# 模型配置
DEFAULT_MAX_TOKENS=4000
DEFAULT_TEMPERATURE=0.3

# 重试配置
MAX_RETRIES=3
RETRY_DELAY=2.0

# 限流配置
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60  # 秒
```

### 🤖 支持的AI模型

- **Claude系列**: Claude-Sonnet-4, Claude-3.7-Sonnet
- **GPT系列**: GPT-4o, GPT-5, GPT-3.5-Turbo
- **Gemini系列**: Gemini-2.5-Pro
- **专业角色**: 产品经理、技术总监、市场专家、UX设计师、商业分析师

### 🖼️ 图像处理功能

**支持视觉的模型**（可真正"看到"图片）：
- Claude-Sonnet-4
- Claude-3.7-Sonnet
- GPT-4o
- GPT-5
- Gemini-2.5-Pro

**功能**：
- 图像上传（PNG、JPG、JPEG，最大10MB）
- 自动压缩优化（最大边1024px）
- OCR文字识别（tesseract）
- Base64编码传输
- 图片预览和全屏查看

## 📖 使用指南

### 💬 基本对话
1. 选择AI Agent
2. 输入消息（支持Markdown）
3. 查看智能回复

### 🗣️ 多Agent讨论
1. 点击"开始讨论"按钮
2. 输入讨论主题和背景
3. 选择参与讨论的专家
4. 系统自动组织多个专业Agent参与讨论
5. 实时查看讨论进展和结果

### 📎 文件上传
1. 点击上传按钮或拖拽文件
2. 支持格式：
   - **文档**: PDF、DOCX、TXT、Markdown
   - **图片**: PNG、JPG、JPEG（支持视觉模型分析）
3. 文件内容自动解析并加入对话上下文

### 🖼️ 图像功能
1. 上传图片后显示预览
2. 支持视觉模型会分析图片内容
3. 不支持视觉的模型会使用OCR提取的文字
4. 点击图片可全屏查看

## 🔧 API文档

启动应用后访问：
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 🌟 主要端点

- `GET /` - Web界面
- `GET /api/health` - 系统健康检查
- `GET /api/agents` - 获取可用Agent列表
- `POST /api/chat` - 发送聊天消息
- `POST /api/discussions` - 开始多Agent讨论
- `GET /api/sessions` - 获取会话列表
- `POST /api/sessions` - 创建新会话
- `DELETE /api/sessions/{session_id}` - 删除会话
- `POST /api/upload` - 上传文件
- `GET /api/metrics` - 系统性能指标

## 🛠️ 开发指南

### 🧹 项目维护

```bash
# 清理项目
python scripts/cleanup.py

# 重新设置环境
python scripts/setup.py
```

### 📊 性能监控

- 访问 `/api/metrics` 查看系统指标
- 日志文件自动轮转和清理
- 内置错误率和响应时间监控

### 🔍 故障排除

#### 1. API连接问题
- 检查 `.env` 中的 `POE_API_KEY` 是否正确
- 访问 https://poe.com/api_key 获取或更新密钥
- 检查网络连接

#### 2. 依赖安装失败
- **Python版本问题**: 确保使用 Python 3.13+
- **pydantic/Pillow错误**: requirements.txt已更新为兼容Python 3.13的版本
- 尝试: `pip install -r requirements.txt --upgrade`

#### 3. 文件上传失败
- 检查文件大小（<10MB）
- 检查文件格式是否支持
- 确保 `uploads/` 目录有写入权限

#### 4. 图片处理问题
- 确保安装了tesseract: `brew install tesseract` (macOS) 或 `apt-get install tesseract-ocr` (Ubuntu)
- 检查图片格式（支持PNG、JPG、JPEG）

#### 5. 端口占用
- 修改 `.env` 中的 `PORT` 配置
- 或停止占用8000端口的进程

## 📈 性能优化

### ⚡ 已实现的优化
- **数据库缓存**: 会话数据智能缓存，平均响应时间 < 0.1ms
- **请求限流**: 防止API滥用，支持自定义限流规则
- **异步处理**: 全异步架构，支持高并发
- **资源优化**: 静态资源压缩，总大小仅169KB
- **智能重试**: API调用失败自动重试，指数退避策略
- **错误处理**: 统一异常处理，用户友好的错误提示
- **健康检查**: 实时监控系统状态和API连接

## 🔄 版本信息

### 当前版本: v2.1.0 (2025-11-12)

#### ✨ 新增功能
- 更新所有依赖包以兼容 Python 3.13
- 添加详细的 requirements.txt 注释说明
- 创建 .gitignore 文件优化版本控制

#### 🔧 优化改进
- 更新 README.md，添加更详细的使用说明
- 添加 Python 3.13 兼容性说明
- 改进故障排除指南
- 更新环境配置说明

#### 🗑️ 清理工作
- 删除 `app.py`（包含硬编码API密钥，不安全）
- 删除过时的优化报告和独立文档
- 简化项目结构，提高可维护性

#### 📦 依赖更新
- `pydantic`: 2.5.0 → 2.10.6（支持 Python 3.13）
- `Pillow`: 10.2.0 → 11.1.0（支持 Python 3.13）
- `pdfplumber`: 0.10.4 → 0.11.7（更新版本）

#### 🐛 问题修复
- 修复虚拟环境在 Python 3.13 下的兼容性问题
- 解决 pydantic-core 编译失败问题
- 解决 Pillow 在 Python 3.13 下的安装问题

---

### 历史版本

#### v2.0.0 (2025-09-02)
- ✨ 完全重构的模块化架构
- 🖼️ 新增图像上传和视觉模型支持
- 📊 内置性能监控和指标收集
- 🛡️ 增强的错误处理和重试机制
- ⚡ 数据库缓存机制（平均响应时间 < 0.1ms）
- 🔒 请求限流保护
- 📁 模块化设计（models、utils、scripts）

#### v1.0.0 (初始版本)
- 🎉 基本的多Agent对话功能
- 📎 文件上传和处理（PDF、DOCX）
- 🌐 现代化Web界面
- 💬 会话管理
- 🗣️ 多智能体讨论

---

### 版本规范

版本号格式：`主版本.次版本.修订版本`

- **主版本**：重大架构变更或不兼容的API更改
- **次版本**：新功能添加，向后兼容
- **修订版本**：Bug修复和小改进

---

### 🚧 即将推出

#### 计划中的功能
- [ ] 用户认证系统
- [ ] 数据导出功能
- [ ] 实时监控面板
- [ ] 移动端适配
- [ ] Docker容器化支持
- [ ] 多语言支持

#### 性能改进计划
- [ ] Redis缓存集成
- [ ] WebSocket实时通信
- [ ] CDN静态资源加速
- [ ] 数据库查询优化

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 支持

如有问题或建议：
- 📧 提交 Issue
- 💬 参与 Discussions
- 📖 查看文档

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代Web框架
- [Poe](https://poe.com/) - AI模型API服务
- [OpenAI](https://openai.com/) - 大语言模型技术

---

**享受与AI的智能对话体验！** 🎉
