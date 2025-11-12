# 📌 常用命令速查表

## 🚀 部署相关

### 部署前检查
```bash
# 运行自动检查脚本
python scripts/check_deploy.py
```

### 快速推送到 GitHub
```bash
# 使用自动推送脚本（推荐）
./push_to_github.sh

# 或手动推送
git init
git add .
git commit -m "🚀 首次部署"
git remote add origin https://github.com/YOUR-USERNAME/Multi-Agent-Chatbox.git
git push -u origin main
```

### 更新部署
```bash
# 修改代码后，推送更新
git add .
git commit -m "更新功能"
git push origin main
# Render 会自动检测并重新部署
```

---

## 🛠️ 本地开发

### 环境设置
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境（macOS/Linux）
source venv/bin/activate

# 激活虚拟环境（Windows）
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp env.example .env
# 编辑 .env 文件，设置 POE_API_KEY
```

### 启动应用
```bash
# 方式 1: 使用启动脚本
./start.sh

# 方式 2: 直接运行
python app_optimized.py

# 方式 3: 使用 uvicorn
uvicorn app_optimized:app --host 0.0.0.0 --port 8000 --reload
```

### 测试
```bash
# 测试健康检查端点
curl http://localhost:8000/api/health

# 在浏览器中访问
open http://localhost:8000
```

---

## 📦 依赖管理

### 更新依赖
```bash
# 安装新包
pip install package-name

# 更新 requirements.txt
pip freeze > requirements.txt
```

### 清理环境
```bash
# 删除虚拟环境
rm -rf venv

# 清理缓存
rm -rf __pycache__
find . -type d -name "__pycache__" -exec rm -rf {} +

# 清理日志
rm -rf logs/*.log
```

---

## 🗂️ 文件管理

### 查看项目结构
```bash
# 查看所有文件（不含 venv）
tree -I 'venv|__pycache__|*.pyc'

# 或使用 ls
ls -lR --exclude=venv
```

### 清理上传文件
```bash
# 清空 uploads 目录（保留 .gitkeep）
cd uploads
find . -type f ! -name '.gitkeep' -delete
cd ..
```

### 重置会话数据
```bash
# 清空会话和记忆数据
echo "[]" > chat_sessions.json
echo "[]" > memories.json
```

---

## 🔍 Git 相关

### 查看状态
```bash
# 查看当前状态
git status

# 查看提交历史
git log --oneline

# 查看远程仓库
git remote -v
```

### 撤销更改
```bash
# 撤销工作区的修改
git checkout -- <file>

# 撤销暂存的文件
git reset HEAD <file>

# 撤销最后一次提交（保留更改）
git reset --soft HEAD^
```

### 分支管理
```bash
# 创建新分支
git checkout -b feature/new-feature

# 切换分支
git checkout main

# 合并分支
git merge feature/new-feature

# 删除分支
git branch -d feature/new-feature
```

---

## 🐛 调试相关

### 查看日志
```bash
# 实时查看应用日志
tail -f logs/app_$(date +%Y-%m-%d).log

# 查看错误日志
tail -f logs/error_$(date +%Y-%m-%d).log

# 查看所有日志
cat logs/*.log
```

### 端口相关
```bash
# 查看端口占用
lsof -i :8000

# 杀死占用端口的进程
lsof -ti :8000 | xargs kill -9
```

### 环境变量检查
```bash
# 查看当前环境变量
env | grep POE

# 测试配置加载
python -c "from config import config; print(config.POE_API_KEY[:10])"
```

---

## 📊 性能监控

### 查看系统资源
```bash
# 查看 Python 进程
ps aux | grep python

# 查看内存使用
free -h  # Linux
vm_stat  # macOS

# 查看磁盘使用
df -h
du -sh uploads logs
```

---

## 🆘 故障排查

### 模块导入错误
```bash
# 检查 Python 环境
which python
python --version

# 检查已安装的包
pip list
pip show fastapi uvicorn pydantic
```

### 权限问题
```bash
# 给脚本添加执行权限
chmod +x build.sh start.sh push_to_github.sh
chmod +x scripts/*.py
```

### 清理并重新开始
```bash
# 完全清理并重新设置
rm -rf venv __pycache__ logs uploads/*.png uploads/*.pdf
echo "[]" > chat_sessions.json
echo "[]" > memories.json
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# 编辑 .env 设置 API 密钥
python app_optimized.py
```

---

## 📖 文档查看

```bash
# 查看部署指南
cat QUICK_START_DEPLOY.md
cat DEPLOY.md

# 查看检查清单
cat PRE_DEPLOY_CHECKLIST.md

# 查看项目说明
cat README.md
```

---

## 🔐 安全检查

### 检查敏感信息
```bash
# 确保 .env 不在 Git 中
git ls-files | grep .env
# 应该没有输出

# 检查是否有硬编码的密钥
grep -r "sk-" --exclude-dir=venv .
grep -r "api_key" --exclude-dir=venv --exclude="*.md" .
```

---

## 💡 快捷提示

### 创建别名（可选）
在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# Multi-Agent Chatbox 快捷命令
alias mac-check="cd ~/path/to/Multi-Agent-chatbox && python scripts/check_deploy.py"
alias mac-start="cd ~/path/to/Multi-Agent-chatbox && ./start.sh"
alias mac-push="cd ~/path/to/Multi-Agent-chatbox && ./push_to_github.sh"
alias mac-logs="cd ~/path/to/Multi-Agent-chatbox && tail -f logs/app_*.log"
```

重新加载配置：
```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

---

## 🎯 一键部署命令

```bash
# 从零开始到部署的完整流程
python scripts/check_deploy.py && \
./push_to_github.sh && \
echo "✅ 代码已推送！现在访问 https://dashboard.render.com/ 完成部署"
```

---

**提示**: 将此文件加入书签，方便随时查阅！📌

