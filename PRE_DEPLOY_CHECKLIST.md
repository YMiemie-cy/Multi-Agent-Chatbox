# ✅ 部署前检查清单

在推送代码到 GitHub 并部署到 Render 之前，请确保以下事项：

## 📋 必检项目

### 1. 环境配置
- [ ] `.env` 文件**不在** Git 仓库中（被 `.gitignore` 忽略）
- [ ] `env.example` 文件存在且包含所有必需的环境变量
- [ ] 本地有有效的 `POE_API_KEY` 可供部署使用

### 2. 依赖文件
- [ ] `requirements.txt` 包含所有项目依赖
- [ ] 依赖版本与 Python 3.13 兼容
- [ ] 运行 `pip freeze > requirements.txt` 更新依赖列表（如果有修改）

### 3. 部署配置
- [ ] `render.yaml` 文件存在且配置正确
- [ ] `build.sh` 和 `start.sh` 有执行权限（`chmod +x *.sh`）
- [ ] 健康检查端点 `/api/health` 正常工作

### 4. 代码质量
- [ ] 代码中没有硬编码的 API 密钥或敏感信息
- [ ] 所有敏感配置都通过环境变量读取
- [ ] 日志级别设置合理（生产环境建议 INFO 或 WARNING）

### 5. 静态文件
- [ ] `static/` 目录包含所有必需的前端文件
- [ ] HTML、CSS、JS 文件路径正确
- [ ] 没有引用本地绝对路径

### 6. 数据初始化
- [ ] `uploads/.gitkeep` 文件存在（保持目录结构）
- [ ] `build.sh` 会自动创建 `chat_sessions.json` 和 `memories.json`
- [ ] 初始 JSON 文件格式为空数组 `[]`

### 7. Git 配置
- [ ] `.gitignore` 正确配置，排除不需要的文件
- [ ] 检查 `git status` 确认没有意外文件被追踪
- [ ] 所有需要的文件都已 `git add`

## 🧪 本地测试

在推送之前，请确保在本地环境测试通过：

```bash
# 1. 清理环境
rm -rf venv
rm -f chat_sessions.json memories.json

# 2. 模拟构建过程
./build.sh

# 3. 启动应用
./start.sh

# 4. 测试健康检查
curl http://localhost:8000/api/health

# 5. 测试前端访问
open http://localhost:8000

# 6. 测试 API 调用
# 在浏览器中发送消息，确认 AI 回复正常
```

## 📤 推送到 GitHub

确认所有检查项都通过后：

```bash
# 查看将要提交的文件
git status

# 添加所有文件
git add .

# 提交
git commit -m "🚀 准备部署到 Render"

# 推送到 GitHub
git push origin main
```

## 🚀 部署到 Render

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. 创建新的 Blueprint 或 Web Service
3. 连接 GitHub 仓库
4. 设置环境变量（特别是 `POE_API_KEY`）
5. 开始部署

## 🔍 部署后验证

部署完成后，请验证：

```bash
# 替换为您的 Render 应用 URL
RENDER_URL="https://your-app.onrender.com"

# 1. 健康检查
curl $RENDER_URL/api/health

# 2. 前端访问
open $RENDER_URL

# 3. API 测试
# 在浏览器中测试对话功能
```

## ⚠️ 常见问题

### 构建失败
- 检查 `requirements.txt` 是否有无效的包
- 查看 Build Logs 中的具体错误
- 确认 `build.sh` 有执行权限

### 启动失败
- 确认 `POE_API_KEY` 已在 Render Dashboard 设置
- 检查 Start Logs 中的错误信息
- 验证 `start.sh` 脚本内容

### API 调用失败
- 检查 API 密钥是否有效
- 查看应用日志中的详细错误
- 确认 POE API 有足够余额

### 文件上传不工作
- 免费版重启后文件会丢失，这是正常的
- 需要付费版的持久化磁盘

## 📚 相关文档

- [README.md](README.md) - 项目说明
- [DEPLOY.md](DEPLOY.md) - 详细部署指南
- [env.example](env.example) - 环境变量示例
- [render.yaml](render.yaml) - Render 配置

---

**记住**: 永远不要将 `.env` 文件或 API 密钥提交到 Git！🔐

