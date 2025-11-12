# ⚡ 快速部署指南

只需 3 步，5 分钟内完成部署！

## 第 1 步：推送到 GitHub（2分钟）

```bash
# 如果还没有初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "🚀 首次部署: Multi-Agent Chatbox"

# 添加远程仓库（替换 YOUR-USERNAME）
git remote add origin https://github.com/YOUR-USERNAME/Multi-Agent-Chatbox.git

# 推送
git push -u origin main
```

## 第 2 步：在 Render 部署（2分钟）

1. 访问 https://dashboard.render.com/
2. 点击 **"New"** → **"Blueprint"**
3. 选择您的 GitHub 仓库 `Multi-Agent-Chatbox`
4. Render 会自动检测 `render.yaml` 配置
5. 点击 **"Apply"**

## 第 3 步：设置 API 密钥（1分钟）

在部署前，Render 会要求您设置环境变量：

- **POE_API_KEY**: 输入您的 POE API 密钥 ✅ **必须设置**
- 其他变量已有默认值，无需修改

点击 **"Apply"** 开始部署！

---

## 🎉 完成！

等待 5-10 分钟后，您的应用就部署完成了！

您会获得一个 URL，例如：
```
https://multi-agent-chatbox.onrender.com
```

---

## 📋 部署前检查（可选）

运行自动检查脚本，确保一切就绪：

```bash
python scripts/check_deploy.py
```

---

## 📖 需要详细说明？

- **完整部署指南**: [DEPLOY.md](DEPLOY.md)
- **部署前检查清单**: [PRE_DEPLOY_CHECKLIST.md](PRE_DEPLOY_CHECKLIST.md)
- **项目说明**: [README.md](README.md)

---

## ⚠️ 免费版提示

- ✅ 每月 750 小时免费
- ⚠️ 15 分钟无活动会休眠
- ⚠️ 文件上传在重启后会丢失
- 💰 升级到 $7/月可获得持久化存储

---

## 🆘 遇到问题？

1. 查看 [DEPLOY.md](DEPLOY.md) 的故障排查部分
2. 检查 Render Dashboard 的 Logs 标签页
3. 确认 `POE_API_KEY` 已正确设置

**祝您部署顺利！🚀**

