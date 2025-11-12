#!/usr/bin/env python3
"""
部署前检查脚本
检查项目是否准备好部署到 Render.com
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def check_file_exists(file_path: str, description: str) -> bool:
    """检查文件是否存在"""
    full_path = project_root / file_path
    exists = full_path.exists()
    status = "✅" if exists else "❌"
    print(f"{status} {description}: {file_path}")
    return exists

def check_file_not_exists(file_path: str, description: str) -> bool:
    """检查文件不应该存在（例如 .env）"""
    full_path = project_root / file_path
    not_exists = not full_path.exists()
    status = "✅" if not_exists else "⚠️"
    print(f"{status} {description}: {file_path}")
    if not not_exists:
        print(f"   警告: {file_path} 不应该被提交到 Git")
    return not_exists

def check_script_executable(file_path: str) -> bool:
    """检查脚本是否可执行"""
    full_path = project_root / file_path
    if not full_path.exists():
        print(f"❌ 脚本不存在: {file_path}")
        return False
    
    is_executable = os.access(full_path, os.X_OK)
    status = "✅" if is_executable else "⚠️"
    print(f"{status} 脚本可执行: {file_path}")
    if not is_executable:
        print(f"   建议运行: chmod +x {file_path}")
    return is_executable

def check_gitignore() -> bool:
    """检查 .gitignore 配置"""
    gitignore_path = project_root / ".gitignore"
    if not gitignore_path.exists():
        print("❌ .gitignore 文件不存在")
        return False
    
    with open(gitignore_path, 'r') as f:
        content = f.read()
    
    required_patterns = ['.env', 'venv/', '__pycache__/', 'logs/', '*.log']
    all_present = True
    
    for pattern in required_patterns:
        if pattern in content:
            print(f"✅ .gitignore 包含: {pattern}")
        else:
            print(f"❌ .gitignore 缺少: {pattern}")
            all_present = False
    
    return all_present

def check_env_example() -> bool:
    """检查 env.example 是否包含必需的变量"""
    env_example_path = project_root / "env.example"
    if not env_example_path.exists():
        print("❌ env.example 文件不存在")
        return False
    
    with open(env_example_path, 'r') as f:
        content = f.read()
    
    required_vars = ['POE_API_KEY', 'POE_BASE_URL', 'HOST', 'PORT']
    all_present = True
    
    for var in required_vars:
        if var in content:
            print(f"✅ env.example 包含: {var}")
        else:
            print(f"❌ env.example 缺少: {var}")
            all_present = False
    
    return all_present

def check_requirements() -> bool:
    """检查 requirements.txt"""
    req_path = project_root / "requirements.txt"
    if not req_path.exists():
        print("❌ requirements.txt 不存在")
        return False
    
    with open(req_path, 'r') as f:
        content = f.read()
    
    # 检查是否为空
    if not content.strip():
        print("❌ requirements.txt 是空的")
        return False
    
    # 检查必需的包
    required_packages = ['fastapi', 'uvicorn', 'pydantic', 'openai', 'python-dotenv']
    all_present = True
    
    for package in required_packages:
        if package.lower() in content.lower():
            print(f"✅ requirements.txt 包含: {package}")
        else:
            print(f"⚠️  requirements.txt 可能缺少: {package}")
            all_present = False
    
    return True  # 不强制要求所有包都存在，因为名称可能有变化

def main():
    """主检查流程"""
    print("=" * 60)
    print("🔍 Multi-Agent Chatbox 部署前检查")
    print("=" * 60)
    print()
    
    all_checks_passed = True
    
    # 1. 核心文件检查
    print("📄 核心文件检查")
    print("-" * 60)
    checks = [
        ("app_optimized.py", "主应用程序"),
        ("config.py", "配置管理"),
        ("requirements.txt", "依赖列表"),
        ("env.example", "环境变量示例"),
    ]
    for file_path, desc in checks:
        if not check_file_exists(file_path, desc):
            all_checks_passed = False
    print()
    
    # 2. 部署配置检查
    print("🚀 部署配置检查")
    print("-" * 60)
    deploy_checks = [
        ("render.yaml", "Render 配置"),
        ("build.sh", "构建脚本"),
        ("start.sh", "启动脚本"),
        ("DEPLOY.md", "部署文档"),
    ]
    for file_path, desc in deploy_checks:
        if not check_file_exists(file_path, desc):
            all_checks_passed = False
    print()
    
    # 3. 脚本可执行性检查
    print("🔧 脚本权限检查")
    print("-" * 60)
    if not check_script_executable("build.sh"):
        all_checks_passed = False
    if not check_script_executable("start.sh"):
        all_checks_passed = False
    print()
    
    # 4. Git 配置检查
    print("📦 Git 配置检查")
    print("-" * 60)
    check_file_not_exists(".env", ".env 不应提交")
    if not check_gitignore():
        all_checks_passed = False
    print()
    
    # 5. 环境变量检查
    print("🔐 环境变量检查")
    print("-" * 60)
    if not check_env_example():
        all_checks_passed = False
    print()
    
    # 6. 依赖检查
    print("📦 依赖检查")
    print("-" * 60)
    if not check_requirements():
        all_checks_passed = False
    print()
    
    # 7. 目录结构检查
    print("📁 目录结构检查")
    print("-" * 60)
    dirs = [
        ("static", "静态文件目录"),
        ("models", "数据模型目录"),
        ("utils", "工具模块目录"),
        ("uploads", "上传文件目录"),
    ]
    for dir_path, desc in dirs:
        if not check_file_exists(dir_path, desc):
            all_checks_passed = False
    print()
    
    # 总结
    print("=" * 60)
    if all_checks_passed:
        print("✅ 所有检查通过！项目已准备好部署到 Render")
        print()
        print("📝 下一步:")
        print("1. 推送代码到 GitHub:")
        print("   git add .")
        print("   git commit -m '🚀 准备部署'")
        print("   git push origin main")
        print()
        print("2. 在 Render Dashboard 创建 Blueprint")
        print("3. 设置 POE_API_KEY 环境变量")
        print("4. 开始部署")
        print()
        print("📖 详细指南: 查看 DEPLOY.md")
        return 0
    else:
        print("❌ 部分检查未通过，请修复上述问题后再部署")
        print()
        print("💡 提示:")
        print("- 查看 PRE_DEPLOY_CHECKLIST.md 了解详细要求")
        print("- 查看 DEPLOY.md 了解部署步骤")
        return 1

if __name__ == "__main__":
    sys.exit(main())

