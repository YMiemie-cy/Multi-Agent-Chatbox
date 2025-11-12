#!/usr/bin/env python3
"""
项目清理脚本
清理临时文件、缓存文件和不需要的文件
"""
import os
import shutil
import glob
from pathlib import Path

def cleanup_project():
    """清理项目"""
    project_root = Path(__file__).parent.parent
    
    print("🧹 开始清理项目...")
    
    # 清理Python缓存
    print("🔄 清理Python缓存文件...")
    cache_patterns = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo",
        "**/*.pyd",
        "**/.pytest_cache",
    ]
    
    for pattern in cache_patterns:
        for path in project_root.glob(pattern):
            if path.is_dir():
                shutil.rmtree(path)
                print(f"   删除目录: {path.relative_to(project_root)}")
            else:
                path.unlink()
                print(f"   删除文件: {path.relative_to(project_root)}")
    
    # 清理日志文件（保留最近7天）
    print("🔄 清理旧日志文件...")
    logs_dir = project_root / "logs"
    if logs_dir.exists():
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=7)
        
        for log_file in logs_dir.glob("*.log"):
            if log_file.stat().st_mtime < cutoff_date.timestamp():
                log_file.unlink()
                print(f"   删除旧日志: {log_file.name}")
    
    # 清理临时文件
    print("🔄 清理临时文件...")
    temp_patterns = [
        "**/.DS_Store",
        "**/*.tmp",
        "**/*.temp",
        "**/test_*.py",
        "**/*~",
    ]
    
    for pattern in temp_patterns:
        for path in project_root.glob(pattern):
            if path.name not in ["test_image_processing.py", "test_discussion_fix.py"]:  # 保护重要测试文件
                path.unlink()
                print(f"   删除临时文件: {path.relative_to(project_root)}")
    
    # 清理空目录
    print("🔄 清理空目录...")
    for root, dirs, files in os.walk(project_root, topdown=False):
        for dir_name in dirs:
            dir_path = Path(root) / dir_name
            if dir_path.is_dir() and not any(dir_path.iterdir()):
                try:
                    dir_path.rmdir()
                    print(f"   删除空目录: {dir_path.relative_to(project_root)}")
                except OSError:
                    pass
    
    print("✅ 项目清理完成！")

if __name__ == "__main__":
    cleanup_project()

