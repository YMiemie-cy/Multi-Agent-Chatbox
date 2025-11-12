#!/usr/bin/env python3
"""
项目设置脚本
初始化项目环境和配置
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

def setup_project():
    """设置项目环境"""
    project_root = Path(__file__).parent.parent
    
    print("🚀 开始设置项目环境...")
    
    # 创建必要的目录
    print("📁 创建必要目录...")
    directories = [
        "uploads",
        "logs", 
        "static",
        "models",
        "utils",
        "scripts"
    ]
    
    for dir_name in directories:
        dir_path = project_root / dir_name
        dir_path.mkdir(exist_ok=True)
        print(f"   ✅ {dir_name}/")
    
    # 检查Python版本
    print("🐍 检查Python版本...")
    python_version = sys.version_info
    if python_version.major < 3 or python_version.minor < 8:
        print("❌ 需要Python 3.8或更高版本")
        return False
    print(f"   ✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # 检查虚拟环境
    print("🔧 检查虚拟环境...")
    venv_path = project_root / "venv"
    if not venv_path.exists():
        print("   创建虚拟环境...")
        subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)
        print("   ✅ 虚拟环境已创建")
    else:
        print("   ✅ 虚拟环境已存在")
    
    # 安装依赖
    print("📦 安装项目依赖...")
    requirements_file = project_root / "requirements.txt"
    if requirements_file.exists():
        pip_path = venv_path / "bin" / "pip"
        if os.name == "nt":  # Windows
            pip_path = venv_path / "Scripts" / "pip.exe"
        
        subprocess.run([str(pip_path), "install", "-r", str(requirements_file)], check=True)
        print("   ✅ 依赖安装完成")
    else:
        print("   ⚠️ requirements.txt不存在")
    
    # 创建环境变量文件
    print("⚙️ 创建环境配置...")
    env_file = project_root / ".env"
    env_example = project_root / "env.example"
    
    if env_example.exists() and not env_file.exists():
        shutil.copy(env_example, env_file)
        print("   ✅ .env文件已创建（从env.example复制）")
        print("   ⚠️ 请编辑.env文件配置API密钥等参数")
    elif env_file.exists():
        print("   ✅ .env文件已存在")
    else:
        print("   ⚠️ 未找到env.example文件")
    
    # 检查配置文件
    print("📋 检查项目配置...")
    config_files = [
        "config.py",
        "requirements.txt",
        "app_optimized.py",
        "static/index.html",
        "static/script.js",
        "static/style.css"
    ]
    
    missing_files = []
    for file_name in config_files:
        file_path = project_root / file_name
        if file_path.exists():
            print(f"   ✅ {file_name}")
        else:
            print(f"   ❌ {file_name} (缺失)")
            missing_files.append(file_name)
    
    if missing_files:
        print(f"   ⚠️ 缺失 {len(missing_files)} 个重要文件")
        return False
    
    print("✅ 项目环境设置完成！")
    print("\n📝 下一步:")
    print("1. 编辑 .env 文件，配置API密钥")
    print("2. 运行: python app_optimized.py")
    print("3. 访问: http://localhost:8000")
    
    return True

if __name__ == "__main__":
    setup_project()

