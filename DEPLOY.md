# 🚀 Render.com 部署指南

本指南将帮助您在 [Render.com](https://render.com) 上部署 Multi-Agent Chatbox 项目。

## 📋 前置准备

1. **GitHub 账号** - 用于托管代码
2. **Render 账号** - 注册 [render.com](https://render.com)
3. **POE API Key** - 从 [poe.com](https://poe.com) 获取

## 🔧 第一步：推送代码到 GitHub

### 1.1 初始化 Git 仓库（如果还没有）

```bash
cd /Users/ymiemie/亘强科技/code/Multi-Agent-chatbox
git init
git add .
git commit -m "Initial commit: Multi-Agent Chatbox"
```

### 1.2 创建 GitHub 仓库

1. 访问 [github.com/new](https://github.com/new)
2. 创建一个新的仓库（例如：`Multi-Agent-Chatbox`）
3. **不要**选择 "Initialize with README"（我们已经有了）

### 1.3 推送代码

```bash
# 将 YOUR-USERNAME 替换为您的 GitHub 用户名
git remote add origin https://github.com/YOUR-USERNAME/Multi-Agent-Chatbox.git
git branch -M main
git push -u origin main
```

## ☁️ 第二步：在 Render 上部署

### 方法 A：使用 Blueprint（推荐）

1. **登录 Render Dashboard**
   - 访问 https://dashboard.render.com/

2. **创建新的 Blueprint**
   - 点击 "New" → "Blueprint"
   - 连接您的 GitHub 账号
   - 选择 `Multi-Agent-Chatbox` 仓库
   - Render 会自动检测 `render.yaml` 文件

3. **配置环境变量**
   - 在部署前，Render 会提示您设置环境变量
   - **必须设置**：`POE_API_KEY` = 您的 POE API 密钥
   - 其他变量已在 `render.yaml` 中预设

4. **开始部署**
   - 点击 "Apply" 开始部署
   - 等待 5-10 分钟完成构建和部署

### 方法 B：手动创建 Web Service

如果不使用 Blueprint，也可以手动创建：

1. **新建 Web Service**
   - Dashboard → "New" → "Web Service"
   - 连接 GitHub 仓库

2. **基本配置**
   ```
   Name: multi-agent-chatbox
   Region: Oregon (US West)
   Branch: main
   Runtime: Python 3
   Build Command: ./build.sh
   Start Command: ./start.sh
   ```

3. **高级设置**
   ```
   Instance Type: Free (或选择付费版)
   Health Check Path: /api/health
   ```

4. **环境变量**
   - 添加所有 `render.yaml` 中列出的环境变量
   - **重点**：`POE_API_KEY` 必须设置

## 🔐 第三步：设置环境变量

在 Render Dashboard 中，进入您的服务设置：

### 必需变量
- `POE_API_KEY` - **必须设置**，您的 POE API 密钥

### 可选变量（已有默认值）
```
POE_BASE_URL=https://api.poe.com/v1
HOST=0.0.0.0
PORT=8000
DEBUG=false
DEFAULT_MAX_TOKENS=4000
DEFAULT_TEMPERATURE=0.3
MAX_RETRIES=3
RETRY_DELAY=2.0
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

## 📊 第四步：验证部署

1. **查看部署日志**
   - Dashboard → 您的服务 → "Logs" 标签页
   - 确认看到 "✅ 服务启动成功" 消息

2. **访问应用**
   - Dashboard → 您的服务 → 顶部会显示 URL
   - 例如：`https://multi-agent-chatbox.onrender.com`

3. **测试健康检查**
   ```bash
   curl https://YOUR-APP-NAME.onrender.com/api/health
   ```
   应该返回：
   ```json
   {"status":"healthy","timestamp":"...","api_status":"connected"}
   ```

## ⚠️ 重要提示

### 免费版限制

1. **自动休眠**
   - 15 分钟无活动后服务会休眠
   - 首次访问会有 30-50 秒的冷启动时间

2. **无持久化存储**
   - 文件上传会在服务重启后丢失
   - 会话和记忆数据会在重启后重置
   - **解决方案**：升级到付费版（$7/月起）启用持久化磁盘

3. **每月 750 小时免费运行时间**

### 付费版优势

升级到 **Starter Plan ($7/月)** 可获得：
- ✅ 持久化磁盘存储（1GB 起）
- ✅ 服务不会自动休眠
- ✅ 更快的 CPU 和内存
- ✅ 更多并发连接

**启用持久化磁盘**：
1. 在 `render.yaml` 中取消注释 `disk` 部分
2. 重新部署服务
3. 数据会保存在 `/var/data` 目录

## 🔄 自动部署

已配置自动部署，每次推送到 `main` 分支时自动触发：

```bash
git add .
git commit -m "Update features"
git push origin main
# Render 会自动检测并重新部署
```

## 🌐 自定义域名

1. Dashboard → 您的服务 → "Settings" → "Custom Domains"
2. 添加您的域名（例如：`chat.yourdomain.com`）
3. 在您的 DNS 提供商处添加 CNAME 记录：
   ```
   Type: CNAME
   Name: chat
   Value: YOUR-APP-NAME.onrender.com
   ```
4. 等待 DNS 生效（通常 5-60 分钟）

## 📝 监控和日志

### 查看实时日志
- Dashboard → 您的服务 → "Logs"
- 或使用 Render CLI：
  ```bash
  render logs -f
  ```

### 性能监控
- Dashboard → 您的服务 → "Metrics"
- 查看 CPU、内存、请求响应时间等

## 🐛 故障排查

### 构建失败
1. 检查 `requirements.txt` 是否正确
2. 查看 Build Logs 中的错误信息
3. 确认 Python 版本兼容（项目需要 Python 3.13+）

### 启动失败
1. 检查环境变量是否设置正确（特别是 `POE_API_KEY`）
2. 查看 Start Logs 中的错误信息
3. 确认 `/api/health` 端点是否正常响应

### API 调用失败
1. 确认 `POE_API_KEY` 有效且有余额
2. 检查 `POE_BASE_URL` 设置是否正确
3. 查看应用日志中的 API 错误信息

### 文件上传问题
- **免费版**：上传的文件在重启后会丢失，这是正常现象
- **解决方案**：升级到付费版并启用持久化磁盘

## 📚 相关资源

- [Render 官方文档](https://render.com/docs)
- [Render Blueprint 规范](https://render.com/docs/blueprint-spec)
- [Python on Render](https://render.com/docs/deploy-python)
- [Render 社区论坛](https://community.render.com/)

## 💡 最佳实践

1. **使用环境变量**
   - 永远不要在代码中硬编码 API 密钥
   - 在 Render Dashboard 中安全地设置敏感信息

2. **监控应用健康**
   - 定期检查 `/api/health` 端点
   - 设置 Render 的通知提醒

3. **优化冷启动（免费版）**
   - 使用服务监控工具（如 UptimeRobot）定期 ping 应用
   - 或升级到付费版避免休眠

4. **数据备份**
   - 如果使用付费版持久化磁盘，定期备份重要数据
   - 可以使用 Render 的 Disk Snapshots 功能

## 🎉 完成！

恭喜！您的 Multi-Agent Chatbox 现在已经成功部署到 Render.com 了！

访问您的应用 URL，开始使用多智能体对话系统吧！🚀

